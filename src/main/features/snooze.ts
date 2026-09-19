import type { WebContents } from 'electron'
import { app } from 'electron'
import { getDb } from '../db'
import { TabManager } from '../tabs'
import { DEFAULT_SNOOZE_SETTINGS, type SnoozeSettings, type TabSnoozeStatePatch } from '../../shared/aura-features'
import { ensureFeaturesTables, kvGet, kvSet } from './kv'

const SETTINGS_KEY = 'features:snooze-settings'
const SCAN_INTERVAL_MS = 60 * 1000
const RESTORE_DELAY_MS = 500
const MAX_FORM_FIELDS = 200
const MAX_FORM_JSON_BYTES = 64 * 1024

export interface PageCapture {
  scrollX: number
  scrollY: number
  forms: Array<{ sel: string; value: string; checked: boolean; selectedIndex: number }>
}

interface SnoozedRow {
  tab_id: string
  url: string
  title: string
  favicon: string | null
  scroll_x: number
  scroll_y: number
  form_state: string | null
  snoozed_at: number
  approx_freed_kb: number
}

export interface SnoozerDeps {
  managers: () => TabManager[]
  sendToChrome: (channel: string, ...args: unknown[]) => void
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function hostMatches(host: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase()
  if (!p) return false
  return host === p || host.endsWith('.' + p)
}

/** Runs in the tab (main world via executeJavaScript, CSP-bypassed). */
const CAPTURE_SOURCE = `(() => {
  const out = { scrollX: window.scrollX || 0, scrollY: window.scrollY || 0, forms: [] };
  try {
    const els = document.querySelectorAll('input, textarea, select');
    const skipTypes = new Set(['password', 'hidden', 'file']);
    const skipTokens = ['cc-number', 'cc-exp', 'cc-csc', 'cc-cvc', 'one-time-code', 'current-password', 'new-password'];
    let n = 0;
    for (const el of els) {
      if (n >= ${MAX_FORM_FIELDS}) break;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' && skipTypes.has((el.type || '').toLowerCase())) continue;
      const ac = ((el.getAttribute('autocomplete') || '') + ' ' + (el.getAttribute('name') || '')).toLowerCase();
      if (skipTokens.some((t) => ac.includes(t))) continue;
      let sel = '';
      if (el.id) sel = '#' + CSS.escape(el.id);
      else if (el.name) sel = tag + '[name="' + el.name.replace(/"/g, '') + '"]';
      else continue;
      try {
        out.forms.push({
          sel,
          value: tag === 'select' ? '' : (el.value ?? '').slice(0, 2000),
          checked: !!(el.checked),
          selectedIndex: typeof el.selectedIndex === 'number' ? el.selectedIndex : -1,
        });
        n++;
      } catch {}
    }
  } catch {}
  return out;
})()`

function restoreSource(cap: PageCapture): string {
  const payload = JSON.stringify(cap).slice(0, MAX_FORM_JSON_BYTES)
  return `(() => {
    const cap = ${payload};
    try { window.scrollTo(cap.scrollX || 0, cap.scrollY || 0); } catch {}
    try {
      for (const f of (cap.forms || [])) {
        let el = null;
        try { el = document.querySelector(f.sel); } catch { continue; }
        if (!el) continue;
        const tag = el.tagName.toLowerCase();
        try {
          if (tag === 'select' && f.selectedIndex >= 0 && f.selectedIndex < el.options.length) {
            el.selectedIndex = f.selectedIndex;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio')) {
            if (el.checked !== !!f.checked) {
              el.checked = !!f.checked;
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if ('value' in el && typeof f.value === 'string') {
            el.value = f.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch {}
      }
    } catch {}
  })()`
}

export function getSnoozeSettings(): SnoozeSettings {
  const stored = kvGet<Partial<SnoozeSettings>>(SETTINGS_KEY, {})
  return {
    enabled: stored.enabled ?? DEFAULT_SNOOZE_SETTINGS.enabled,
    idleMinutes:
      Number.isFinite(stored.idleMinutes)
        ? Math.min(1440, Math.max(1, Math.floor(stored.idleMinutes as number)))
        : DEFAULT_SNOOZE_SETTINGS.idleMinutes,
    snoozePinned: stored.snoozePinned ?? DEFAULT_SNOOZE_SETTINGS.snoozePinned,
    snoozeAudible: stored.snoozeAudible ?? DEFAULT_SNOOZE_SETTINGS.snoozeAudible,
    neverSnoozeHosts: Array.isArray(stored.neverSnoozeHosts)
      ? stored.neverSnoozeHosts
      : [...DEFAULT_SNOOZE_SETTINGS.neverSnoozeHosts],
  }
}

export function setSnoozeSettings(patch: Partial<SnoozeSettings>): SnoozeSettings {
  const next = { ...getSnoozeSettings(), ...patch }
  if (patch.neverSnoozeHosts !== undefined) next.neverSnoozeHosts = patch.neverSnoozeHosts
  kvSet(SETTINGS_KEY, next)
  return next
}

export class TabSnoozer {
  private timer: NodeJS.Timeout | null = null
  private pendingRestore = new Set<number>()
  private memCapture = new Map<number, PageCapture>()
  private attached = new Set<TabManager>()

  constructor(private deps: SnoozerDeps) {}

  start(): void {
    if (this.timer) return
    // Attach hooks to every known manager now; late managers (e.g. Ninja
    // windows) are attached lazily on first sight in scanIdle().
    for (const tm of this.deps.managers()) {
      if (!this.attached.has(tm)) {
        this.attachManager(tm)
        this.attached.add(tm)
      }
    }
    this.timer = setInterval(() => void this.scanIdle(), SCAN_INTERVAL_MS)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Wire TabManager hooks. Call once per manager (main + ninja). */
  attachManager(tm: TabManager): void {
    if (this.attached.has(tm)) return
    this.attached.add(tm)
    tm.snoozeInfoProvider = (id) => {
      const rec = tm.records.get(id)
      if (!rec) return null
      const row = this.readRow(id)
      return { snoozed: rec.snoozed, freedMB: row ? row.approx_freed_kb / 1024 : 0 }
    }
    const prevClosed = tm.onTabClosed
    tm.onTabClosed = (id) => {
      try { prevClosed?.(id) } catch { /* keep chain alive */ }
      this.forget(id)
    }
    const prevLoaded = tm.onViewLoaded
    tm.onViewLoaded = (id) => {
      try { prevLoaded?.(id) } catch { /* keep chain alive */ }
      this.maybeRestore(id, tm)
    }
    const prevActivate = tm.onSnoozedActivate
    tm.onSnoozedActivate = (id) => {
      try { prevActivate?.(id) } catch { /* keep chain alive */ }
      this.armWake(id, tm)
    }
  }

  stats(): { snoozedCount: number; approxFreedMB: number } {
    try {
      ensureFeaturesTables()
      const rows = getDb().prepare('SELECT approx_freed_kb FROM snoozed_tabs').all() as { approx_freed_kb: number }[]
      const kb = rows.reduce((s, r) => s + (r.approx_freed_kb || 0), 0)
      return { snoozedCount: rows.length, approxFreedMB: Math.round((kb / 1024) * 10) / 10 }
    } catch {
      return { snoozedCount: 0, approxFreedMB: 0 }
    }
  }

  async snooze(tabId: number, _reason: 'manual' | 'idle'): Promise<boolean> {
    const found = this.locate(tabId)
    if (!found) return false
    const { tm, rec } = found
    if (rec.snoozed || !rec.view || rec.view.webContents.isDestroyed()) return false
    if (/^(aura|about|chrome|devtools):/i.test(rec.url)) return false
    // Snoozing the active tab is pointless: activate() re-attaches instantly.
    if (tm.getActiveId() === rec.id) return false
    // Private tabs never touch SQLite: keep their capture in memory only.
    const isPrivate = tm.isPrivate
    if (isPrivate) {
      const cap = await this.capture(rec.view.webContents).catch(() => null)
      if (!cap) return false
      this.memCapture.set(rec.id, cap)
    } else {
      const cap = await this.capture(rec.view.webContents).catch(() => null)
      if (!cap) return false
      this.writeRow(rec.id, rec, cap, await this.freedKb(rec.view.webContents))
    }

    const freedMB = this.freedMB(rec.id)
    const ok = tm.suspendView(rec.id)
    if (!ok) {
      this.forget(rec.id)
      return false
    }
    rec.snoozed = true
    tm.emit()
    this.broadcast({ tabId: String(rec.id), snoozed: true, approxFreedMB: freedMB })
    return true
  }

  async snoozeOthers(exceptTabId: number | null): Promise<number> {
    let n = 0
    const settings = getSnoozeSettings()
    for (const tm of this.deps.managers()) {
      for (const id of [...tm.records.keys()]) {
        if (exceptTabId !== null && id === exceptTabId) continue
        if (await this.snoozeIfEligible(tm, id, settings, 'manual')) n++
      }
    }
    return n
  }

  wake(tabId: number): void {
    const tm = TabManager.findTab(tabId)
    if (!tm) return
    tm.activate(tabId)
  }

  // ---- internals ----

  private locate(tabId: number): { tm: TabManager; rec: { id: number; view: { webContents: WebContents } | null; url: string; title: string; favicon: string | null; snoozed: boolean } } | null {
    const tm = TabManager.findTab(tabId)
    if (!tm) return null
    const rec = tm.records.get(tabId)
    if (!rec) return null
    return { tm, rec: rec as unknown as { id: number; view: { webContents: WebContents } | null; url: string; title: string; favicon: string | null; snoozed: boolean } }
  }

  private async scanIdle(): Promise<void> {
    const settings = getSnoozeSettings()
    if (!settings.enabled) return
    const idleMs = settings.idleMinutes * 60 * 1000
    const now = Date.now()
    for (const tm of this.deps.managers()) {
      if (!this.attached.has(tm)) {
        this.attachManager(tm)
        this.attached.add(tm)
      }
      if (tm.isPrivate) continue
      for (const [id, rec] of tm.records) {
        if (id === tm.getActiveId()) continue
        if (now - rec.lastActiveAt < idleMs) continue
        await this.snoozeIfEligible(tm, id, settings, 'idle')
      }
    }
  }

  private async snoozeIfEligible(
    tm: TabManager,
    id: number,
    settings: SnoozeSettings,
    reason: 'manual' | 'idle'
  ): Promise<boolean> {
    const rec = tm.records.get(id)
    if (!rec || rec.snoozed || !rec.view || rec.view.webContents.isDestroyed()) return false
    if (id === tm.getActiveId()) return false
    if (/^(aura|about|chrome|devtools):/i.test(rec.url)) return false
    if (rec.pinned && !settings.snoozePinned) return false
    if (rec.hasAudio && rec.view.webContents.isCurrentlyAudible?.() !== false && !settings.snoozeAudible) return false
    if (rec.fullscreen) return false
    if (rec.loading) return false
    const host = hostOf(rec.url)
    if (settings.neverSnoozeHosts.some((p) => hostMatches(host, p))) return false
    return this.snooze(id, reason)
  }

  private async capture(wc: WebContents): Promise<PageCapture | null> {
    try {
      const raw = (await wc.executeJavaScript(CAPTURE_SOURCE, true)) as Partial<PageCapture> | null
      if (!raw || typeof raw !== 'object') return null
      return {
        scrollX: Number(raw.scrollX) || 0,
        scrollY: Number(raw.scrollY) || 0,
        forms: Array.isArray(raw.forms) ? raw.forms.slice(0, MAX_FORM_FIELDS) : [],
      }
    } catch {
      return null
    }
  }

  private async freedKb(wc: WebContents): Promise<number> {
    try {
      // app.getAppMetrics() reports workingSetSize in KiB; match the tab's
      // renderer process via its OS pid for an approximate freed-RAM figure.
      const pid = wc.getOSProcessId()
      const metric = app.getAppMetrics().find((m) => m.pid === pid)
      const kb = metric?.memory?.workingSetSize ?? 0
      return Math.max(0, Math.round(kb))
    } catch {
      return 0
    }
  }

  private writeRow(tabId: number, rec: { url: string; title: string; favicon: string | null }, cap: PageCapture, freedKb: number): void {
    ensureFeaturesTables()
    getDb()
      .prepare(
        `INSERT INTO snoozed_tabs (tab_id, url, title, favicon, scroll_x, scroll_y, form_state, snoozed_at, approx_freed_kb)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tab_id) DO UPDATE SET url = excluded.url, title = excluded.title, favicon = excluded.favicon,
           scroll_x = excluded.scroll_x, scroll_y = excluded.scroll_y, form_state = excluded.form_state,
           snoozed_at = excluded.snoozed_at, approx_freed_kb = excluded.approx_freed_kb`
      )
      .run(
        String(tabId), rec.url, rec.title ?? '', rec.favicon ?? null,
        cap.scrollX, cap.scrollY, JSON.stringify({ forms: cap.forms }),
        Date.now(), freedKb
      )
  }

  private readRow(tabId: number): SnoozedRow | undefined {
    try {
      ensureFeaturesTables()
      return getDb().prepare('SELECT * FROM snoozed_tabs WHERE tab_id = ?').get(String(tabId)) as SnoozedRow | undefined
    } catch {
      return undefined
    }
  }

  private rowCapture(row: SnoozedRow): PageCapture {
    let forms: PageCapture['forms'] = []
    try {
      const parsed = row.form_state ? (JSON.parse(row.form_state) as { forms?: PageCapture['forms'] }) : null
      if (parsed && Array.isArray(parsed.forms)) forms = parsed.forms
    } catch { /* corrupted row: restore scroll only */ }
    return { scrollX: row.scroll_x || 0, scrollY: row.scroll_y || 0, forms }
  }

  private freedMB(tabId: number): number {
    const row = this.readRow(tabId)
    return row ? Math.round((row.approx_freed_kb / 1024) * 10) / 10 : 0
  }

  private armWake(id: number, tm: TabManager): void {
    const rec = tm.records.get(id)
    if (!rec) return
    this.pendingRestore.add(id)
    rec.snoozed = false
    tm.emit()
    this.broadcast({ tabId: String(id), snoozed: false })
  }

  private maybeRestore(id: number, tm: TabManager): void {
    if (!this.pendingRestore.has(id)) return
    this.pendingRestore.delete(id)
    const rec = tm.records.get(id)
    const wc = rec?.view?.webContents
    if (!rec || !wc || wc.isDestroyed()) {
      this.forget(id)
      return
    }
    // Yield to the media-resume overlay (fires on did-finish-load) before
    // scrolling + restoring form state.
    setTimeout(() => {
      try {
        if (wc.isDestroyed()) return
        const mem = this.memCapture.get(id)
        const cap = mem ?? (this.readRow(id) ? this.rowCapture(this.readRow(id) as SnoozedRow) : null)
        if (!cap) {
          this.forget(id)
          return
        }
        void wc.executeJavaScript(restoreSource(cap), true).catch(() => {})
        this.forget(id)
        tm.emit()
      } catch { /* never break page load */ }
    }, RESTORE_DELAY_MS).unref?.()
  }

  private forget(id: number): void {
    this.pendingRestore.delete(id)
    this.memCapture.delete(id)
    try {
      getDb().prepare('DELETE FROM snoozed_tabs WHERE tab_id = ?').run(String(id))
    } catch { /* DB unavailable */ }
  }

  private broadcast(patch: TabSnoozeStatePatch): void {
    try {
      this.deps.sendToChrome('features:snooze-state', patch)
    } catch { /* chrome gone */ }
  }
}

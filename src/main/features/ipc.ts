import { BrowserWindow, ipcMain } from 'electron'
import type { WebContents } from 'electron'
import { TabManager } from '../tabs'
import { isChromeUi } from './guard'
import { TabSnoozer, getSnoozeSettings, setSnoozeSettings } from './snooze'
import { AutoRefreshManager } from './auto-refresh'
import { getGestureSettings, setGestureSettings, resetGestureSettings } from './gestures'
import { setGlobalPreset, setSiteRule, resolveDark } from './darkmode'
import { ensureFeaturesTables, kvGet, kvSet } from './kv'
import type { DarkPreset, DarkSiteRule, QuickLink } from '../../shared/aura-features'

let snoozer: TabSnoozer | null = null
let autoRefresh: AutoRefreshManager | null = null

export function getSnoozer(): TabSnoozer | null {
  return snoozer
}

export function getAutoRefresh(): AutoRefreshManager | null {
  return autoRefresh
}

export interface FeaturesDeps {
  getMainWindow: () => BrowserWindow | null
}

/** Call once from createWindow(), after the main TabManager exists. */
export function initFeatures(_deps: FeaturesDeps): void {
  if (snoozer) return
  snoozer = new TabSnoozer({
    managers: () => TabManager.getAll(),
    sendToChrome: (channel, ...args) => {
      const wins = new Set<BrowserWindow>()
      const main = _deps.getMainWindow()
      if (main && !main.isDestroyed()) wins.add(main)
      for (const m of TabManager.getAll()) {
        try {
          const w = m.getWindow()
          if (w && !w.isDestroyed()) wins.add(w)
        } catch { /* ignore */ }
      }
      for (const w of wins) {
        try {
          w.webContents.send(channel, ...args)
        } catch { /* window gone */ }
      }
    },
  })
  for (const m of TabManager.getAll()) snoozer.attachManager(m)
  snoozer.start()
  if (!autoRefresh) {
    autoRefresh = new AutoRefreshManager()
    autoRefresh.attachAll()
  }
  registerSnoozeIpc()
  registerAutoRefreshIpc()
}

function toTabId(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function registerSnoozeIpc(): void {
  ipcMain.handle('features:snooze-get-settings', (e) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    return getSnoozeSettings()
  })
  ipcMain.handle('features:snooze-set-settings', (e, patch: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const p = (patch ?? {}) as Partial<ReturnType<typeof getSnoozeSettings>>
    return setSnoozeSettings(p)
  })
  ipcMain.handle('features:snooze-tab', async (e, tabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const id = toTabId(tabId)
    if (id === null || !snoozer) return false
    return snoozer.snooze(id, 'manual')
  })
  ipcMain.handle('features:snooze-others', async (e, exceptTabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    if (!snoozer) return 0
    const except = exceptTabId == null ? null : toTabId(exceptTabId)
    return snoozer.snoozeOthers(except)
  })
  ipcMain.handle('features:snooze-wake', (e, tabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const id = toTabId(tabId)
    if (id === null || !snoozer) return
    snoozer.wake(id)
  })
  ipcMain.handle('features:snooze-stats', (e) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    return snoozer ? snoozer.stats() : { snoozedCount: 0, approxFreedMB: 0 }
  })
  registerGesturesIpc()
}

function registerAutoRefreshIpc(): void {
  ipcMain.handle('autorefresh:start', (e, tabId: unknown, seconds: unknown, maxRefreshes: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('autorefresh: untrusted sender')
    const id = toTabId(tabId)
    const secs = typeof seconds === 'number' ? seconds : Number(seconds)
    const max =
      maxRefreshes === null || maxRefreshes === undefined ? null : Number(maxRefreshes)
    if (id === null || !autoRefresh) return false
    autoRefresh.attachAll() // cover managers created after init (ninja)
    return autoRefresh.start(id, secs, max)
  })
  ipcMain.handle('autorefresh:stop', (e, tabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('autorefresh: untrusted sender')
    const id = toTabId(tabId)
    if (id === null || !autoRefresh) return false
    autoRefresh.stop(id)
    return true
  })
  ipcMain.handle('autorefresh:get', (e, tabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('autorefresh: untrusted sender')
    const id = toTabId(tabId)
    if (id === null || !autoRefresh) return null
    return autoRefresh.getState(id)
  })
  ipcMain.handle('autorefresh:burst', (e, tabId: unknown, times: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('autorefresh: untrusted sender')
    const id = toTabId(tabId)
    const n = typeof times === 'number' ? times : Number(times)
    if (id === null || !autoRefresh) return false
    autoRefresh.attachAll()
    return autoRefresh.burst(id, Number.isFinite(n) ? n : 6)
  })
}

function registerGesturesIpc(): void {
  // Sync config for tab preloads. Read-only: intentionally NOT chrome-gated.
  // MUST always set returnValue (else the renderer hangs).
  ipcMain.on('features:gestures-get-sync', (e) => {
    try {
      e.returnValue = getGestureSettings()
    } catch {
      e.returnValue = null
    }
  })
  ipcMain.handle('features:gestures-get-settings', (e) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    return getGestureSettings()
  })
  ipcMain.handle('features:gestures-set-settings', (e, patch: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const p = (patch ?? {}) as Partial<ReturnType<typeof getGestureSettings>>
    return setGestureSettings(p)
  })
  ipcMain.handle('features:gestures-reset-settings', (e) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    return resetGestureSettings()
  })
  registerDarkIpc()
}

function hostOfUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function broadcastDarkChanged(): void {
  for (const m of TabManager.getAll()) {
    for (const rec of m.records.values()) {
      const wc = rec.view?.webContents
      if (!wc || wc.isDestroyed()) continue
      try {
        wc.send('features:dark-changed')
      } catch { /* tab gone */ }
    }
  }
}

function senderHost(sender: WebContents): string {
  try {
    return hostOfUrl(sender.getURL())
  } catch {
    return ''
  }
}

function registerDarkIpc(): void {
  // Sync config for tab preloads (resolved from the tab's own URL).
  // Read-only: intentionally NOT chrome-gated. MUST always set returnValue.
  ipcMain.on('features:dark-get-sync', (e) => {
    try {
      e.returnValue = resolveDark(senderHost(e.sender)).state
    } catch {
      e.returnValue = null
    }
  })
  ipcMain.handle('features:dark-get', (e, host: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    return resolveDark(String(host ?? ''))
  })
  ipcMain.handle('features:dark-set-site', (e, host: unknown, rule: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const h = String(host ?? '')
    if (!h) throw new Error('invalid host')
    const r = rule as DarkSiteRule | null
    if (r !== null && r !== 'off' && r !== 'oled' && r !== 'charcoal' && r !== 'amber') {
      throw new Error('invalid dark rule')
    }
    setSiteRule(h, r)
    broadcastDarkChanged()
  })
  ipcMain.handle('features:dark-set-global', (e, preset: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const p = preset as DarkPreset | null
    if (p !== null && p !== 'oled' && p !== 'charcoal' && p !== 'amber') {
      throw new Error('invalid dark preset')
    }
    setGlobalPreset(p)
    broadcastDarkChanged()
  })
  registerNewTabIpc()
}

const NEWTAB_LINKS_KEY = 'newtab.links'
const NEWTAB_MAX_LINKS = 8

const DEFAULT_NEWTAB_LINKS: QuickLink[] = [
  { id: '1', title: 'YouTube', url: 'https://youtube.com' },
  { id: '2', title: 'GitHub', url: 'https://github.com' },
  { id: '3', title: 'Reddit', url: 'https://reddit.com' },
  { id: '4', title: 'X', url: 'https://x.com' },
]

/** Validate + normalize renderer-supplied links before they touch SQLite. */
function sanitizeNewTabLinks(raw: unknown): QuickLink[] | null {
  if (!Array.isArray(raw)) return null
  const out: QuickLink[] = []
  for (const item of raw.slice(0, NEWTAB_MAX_LINKS)) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const title = String(rec.title ?? '').trim().slice(0, 40)
    let url = String(rec.url ?? '').trim().slice(0, 2048)
    if (!title || !url) continue
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
      url = parsed.toString()
    } catch {
      continue
    }
    out.push({ id: String(rec.id ?? `${Date.now()}-${out.length}`).slice(0, 64), title, url })
  }
  return out
}

function registerNewTabIpc(): void {
  ipcMain.handle('newtab:get-links', (e) => {
    if (!isChromeUi(e.sender)) throw new Error('newtab: untrusted sender')
    ensureFeaturesTables()
    return kvGet<QuickLink[]>(NEWTAB_LINKS_KEY, DEFAULT_NEWTAB_LINKS)
  })
  ipcMain.handle('newtab:set-links', (e, links: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('newtab: untrusted sender')
    const clean = sanitizeNewTabLinks(links)
    if (!clean) throw new Error('newtab: invalid links')
    ensureFeaturesTables()
    kvSet(NEWTAB_LINKS_KEY, clean)
    return true
  })
}

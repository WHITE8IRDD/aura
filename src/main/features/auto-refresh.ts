import { TabManager } from '../tabs'

export interface AutoRefreshState {
  intervalSec: number // 0 = stopped (never stored; absence means stopped)
  maxRefreshes: number | null // null = infinite
  remaining: number | null // countdown when maxRefreshes is set
}

const MIN_INTERVAL_SEC = 5
const MAX_INTERVAL_SEC = 86400
const MIN_REPEATS = 1
const MAX_REPEATS = 999

/**
 * Native per-tab auto-refresh engine.
 *
 * Interval timers AND burst reloads live in the main process (Node
 * setInterval / webContents.reload) — the renderer is never involved, so
 * no web page or UI thread can stall them. Everything is keyed by numeric
 * tabId and torn down when the tab closes (see attachManager), so a
 * closed tab can never leak an interval or a dangling burst.
 *
 * All state is in-memory for the session; nothing touches SQLite.
 */
export class AutoRefreshManager {
  private timers = new Map<number, NodeJS.Timeout>()
  private states = new Map<number, AutoRefreshState>()
  private burstLocks = new Set<number>()
  private burstGen = new Map<number, number>()
  private attached = new Set<TabManager>()

  /** Wire TabManager close-hooks. Idempotent; call for every manager. */
  attachManager(tm: TabManager): void {
    if (this.attached.has(tm)) return
    this.attached.add(tm)
    const prevClosed = tm.onTabClosed
    tm.onTabClosed = (id) => {
      try {
        prevClosed?.(id)
      } catch {
        /* keep chain alive */
      }
      this.handleTabClosed(id)
    }
  }

  /** Attach to every live manager (covers late-created ninja windows). */
  attachAll(): void {
    for (const m of TabManager.getAll()) this.attachManager(m)
  }

  start(tabId: number, seconds: number, maxRefreshes: number | null = null): boolean {
    if (!Number.isInteger(tabId) || tabId <= 0) return false
    if (!Number.isFinite(seconds) || seconds <= 0) {
      this.stop(tabId)
      return true
    }
    const secs = Math.min(Math.max(Math.round(seconds), MIN_INTERVAL_SEC), MAX_INTERVAL_SEC)
    let max: number | null = null
    if (maxRefreshes !== null && maxRefreshes !== undefined) {
      const n = Math.round(Number(maxRefreshes))
      if (!Number.isFinite(n) || n < MIN_REPEATS) return false
      max = Math.min(n, MAX_REPEATS)
    }

    const mgr = TabManager.findTab(tabId)
    if (!mgr || !mgr.records.has(tabId)) return false

    this.stop(tabId)
    this.states.set(tabId, { intervalSec: secs, maxRefreshes: max, remaining: max })
    const timer = setInterval(() => {
      const owner = TabManager.findTab(tabId)
      const rec = owner?.records.get(tabId)
      if (!owner || !rec) {
        // Tab is gone — cleanup so nothing leaks.
        this.stop(tabId)
        return
      }
      const wc = rec.view?.webContents
      if (!wc || wc.isDestroyed()) return // snoozed/unloaded: skip this tick
      try {
        wc.reload()
      } catch {
        /* tab tearing down; next tick cleans up */
      }
      const s = this.states.get(tabId)
      if (s && s.remaining !== null) {
        s.remaining -= 1
        if (s.remaining <= 0) {
          this.stop(tabId) // finished N refreshes
          return
        }
        this.states.set(tabId, s)
      }
      this.broadcastState()
    }, secs * 1000)
    // A lingering refresh timer must never keep the process alive.
    ;(timer as unknown as { unref?: () => void }).unref?.()

    this.timers.set(tabId, timer)
    this.broadcastState()
    return true
  }

  stop(tabId: number): void {
    const timer = this.timers.get(tabId)
    if (timer) {
      try {
        clearInterval(timer)
      } catch {
        /* already gone */
      }
    }
    const had = this.timers.delete(tabId)
    this.states.delete(tabId)
    if (had) this.broadcastState()
  }

  getState(tabId: number): AutoRefreshState | null {
    const s = this.states.get(tabId)
    return s ? { ...s } : null
  }

  isBursting(tabId: number): boolean {
    return this.burstLocks.has(tabId)
  }

  /**
   * Instant burst refresh: fire N forced reloads back-to-back on a 30ms
   * micro-tick loop (~180ms for the default ×6). Deliberately does NOT
   * wait for did-finish-load — the point is speed, not settle. The tick
   * still checks liveness every iteration so closing the tab mid-burst
   * stops the loop gracefully. Independent of any scheduled interval.
   */
  async burst(tabId: number, times = 6): Promise<boolean> {
    if (!Number.isInteger(tabId) || tabId <= 0) return false
    const n = Math.min(Math.max(Math.round(Number(times) || 6), 1), 24)
    if (this.burstLocks.has(tabId)) return false // prevent stacked bursts
    const owner = TabManager.findTab(tabId)
    const rec = owner?.records.get(tabId)
    const wc = rec?.view?.webContents
    if (!wc || wc.isDestroyed()) return false // snoozed tab: no-op

    const gen = (this.burstGen.get(tabId) ?? 0) + 1
    this.burstGen.set(tabId, gen)
    this.burstLocks.add(tabId)
    this.broadcastBurst(tabId, true)
    try {
      for (let i = 0; i < n; i++) {
        if (this.burstGen.get(tabId) !== gen) break // tab closed mid-burst
        if (wc.isDestroyed()) break
        try {
          // Forced reload bypassing cache — instant by design.
          wc.reloadIgnoringCache()
        } catch {
          break
        }
        // 30ms micro-delay so Chromium registers each trigger without
        // collapsing them: all 6 reloads land in ~180ms total.
        await new Promise((r) => setTimeout(r, 30))
      }
    } finally {
      if (this.burstGen.get(tabId) === gen) this.burstLocks.delete(tabId)
      this.broadcastBurst(tabId, false)
    }
    return true
  }

  handleTabClosed(tabId: number): void {
    this.stop(tabId)
    // Abort any in-flight burst loop; the lock entry is dropped so no
    // orphan state survives the tab (ids are never reused).
    this.burstGen.set(tabId, (this.burstGen.get(tabId) ?? 0) + 1)
    this.burstLocks.delete(tabId)
    this.burstGen.delete(tabId)
  }

  private broadcastState(): void {
    for (const m of TabManager.getAll()) {
      try {
        const w = m.getWindow()
        if (w && !w.isDestroyed()) w.webContents.send('autorefresh:state-changed')
      } catch {
        /* window gone */
      }
    }
  }

  private broadcastBurst(tabId: number, active: boolean): void {
    for (const m of TabManager.getAll()) {
      try {
        const w = m.getWindow()
        if (w && !w.isDestroyed())
          w.webContents.send('autorefresh:burst-changed', { tabId, active })
      } catch {
        /* window gone */
      }
    }
  }
}

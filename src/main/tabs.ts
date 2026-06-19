import { BrowserWindow, WebContentsView } from 'electron'
import { join } from 'path'
import { isInternal, normalizeInput } from './url'
import { recordVisit, updateTitle } from './history'
import { getZoomForHost, setZoomForHost } from './zoom'
import { getGroupForTab, removeTabFromAnyGroup } from './tab-groups'
import { getAccessibilityWebPreferences, applyDefaultZoom } from './accessibility'
import { attachContextMenu } from './contextMenu'
import { saveTabs } from './sessions'

export interface TabState {
  id: number
  url: string
  title: string
  favicon: string | null
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  internal: boolean
  pinned: boolean
  muted: boolean
  zoomFactor: number
  findMatches: { current: number; total: number } | null
  sleeping: boolean
  lastActiveAt: number
  groupId: string | null
  hasAudio: boolean
  fullscreen: boolean
}

export interface TabRecord {
  id: number
  view: WebContentsView | null
  url: string
  title: string
  favicon: string | null
  loading: boolean
  pinned: boolean
  muted: boolean
  zoomFactor: number
  findMatches: { current: number; total: number } | null
  lastActiveAt: number
  loadingTimeout: NodeJS.Timeout | null
  hasAudio: boolean
  fullscreen: boolean
}

interface ClosedTab { url: string; title: string; closedAt: number }

let nextId = 1
const LOADING_HARD_TIMEOUT_MS = 5000
const CLOSED_STACK_LIMIT = 20
const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.25
const ZOOM_MAX = 5.0

const SLEEP_CHECK_INTERVAL_MS = 60 * 1000

function getSleepAfterMs(): number {
  try {
    const { getSetting } = require('./settings')
    const saver = getSetting('systemMemorySaver') as string
    if (saver === 'aggressive') return 5 * 60 * 1000
    if (saver === 'balanced') return 30 * 60 * 1000
    if (!getSetting('sleepingTabsEnabled')) return Infinity
    const minutes = getSetting('sleepingTabsMinutes') as number
    return Math.max(1, minutes) * 60 * 1000
  } catch {
    return 30 * 60 * 1000
  }
}

function hostnameOf(url: string): string | null {
  try { return new URL(url).hostname } catch { return null }
}

function clampZoom(factor: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(factor * 100) / 100))
}

export class TabManager {
  records = new Map<number, TabRecord>()
  private order: number[] = []
  private activeId: number | null = null
  private chromeHeight: number
  private sidebarWidth: number = 0
  private _isPrivate: boolean
  private emitTimer: NodeJS.Timeout | null = null
  private viewHidden = false
  private closedStack: ClosedTab[] = []
  private sleepTimer: NodeJS.Timeout | null = null
  private saveTimeout: NodeJS.Timeout | null = null
  // STAGE 8.8: track the tab currently in HTML5 fullscreen
  private fullscreenTabId: number | null = null

  constructor(
    private win: BrowserWindow,
    chromeHeight: number,
    isPrivate: boolean = false
  ) {
    this.chromeHeight = chromeHeight
    this._isPrivate = isPrivate
    win.on('resize', () => this.layout())
    win.on('enter-full-screen', () => this.layout())
    win.on('leave-full-screen', () => this.layout())
    win.on('closed', () => {
      if (this.sleepTimer) clearInterval(this.sleepTimer)
      if (this.saveTimeout) { clearTimeout(this.saveTimeout); this.saveTimeout = null }
      if (!this.isPrivate) this.flushSession()
      if (this.isPrivate) this.closedStack = []
    })

    this.sleepTimer = setInterval(() => this.checkSleepingTabs(), SLEEP_CHECK_INTERVAL_MS)

    if (this.isPrivate) {
      console.log('[Aura/tabs] TabManager initialized in PRIVATE mode — all writes blocked')
    }
  }

  get isPrivate(): boolean { return this._isPrivate }

  getActiveId(): number | null { return this.activeId }
  setSidebarWidth(w: number): void { this.sidebarWidth = Math.max(0, w); this.layout() }
  setChromeHeight(h: number): void { this.chromeHeight = h; this.layout() }
  isFullscreen(): boolean { return this.fullscreenTabId !== null }

  hideActiveView(): void {
    this.viewHidden = true
    for (const r of this.records.values()) r.view?.setVisible(false)
  }
  showActiveView(): void {
    this.viewHidden = false
    if (this.activeId !== null) {
      const rec = this.records.get(this.activeId)
      if (rec?.view) rec.view.setVisible(true)
    }
  }

  getWebContentsId(id: number): number | null {
    const rec = this.records.get(id)
    return rec?.view?.webContents.id ?? null
  }

  create(rawUrl = 'aura://newtab', afterId?: number): number {
    const url = normalizeInput(rawUrl)
    const id = nextId++
    const rec: TabRecord = {
      id, view: null, url,
      title: url === 'aura://newtab' ? 'New Tab' : url,
      favicon: null, loading: false, pinned: false, muted: false,
      zoomFactor: 1.0, findMatches: null,
      lastActiveAt: Date.now(),
      loadingTimeout: null,
      hasAudio: false,
      fullscreen: false
    }
    this.records.set(id, rec)
    if (afterId !== undefined) {
      const idx = this.order.indexOf(afterId)
      if (idx >= 0) this.order.splice(idx + 1, 0, id)
      else this.order.push(id)
    } else {
      this.order.push(id)
    }
    this.normalizeOrder()
    if (!isInternal(url)) this.attachView(rec, url)
    this.activate(id)
    return id
  }

  close(id: number): void {
    const rec = this.records.get(id); if (!rec) return
    if (!this.isPrivate && rec.view && rec.url.startsWith('http')) {
      this.closedStack.unshift({ url: rec.url, title: rec.title, closedAt: Date.now() })
      if (this.closedStack.length > CLOSED_STACK_LIMIT) this.closedStack.length = CLOSED_STACK_LIMIT
    }
    removeTabFromAnyGroup(id)
    // STAGE 8.8: exit fullscreen if closing the fullscreen tab
    if (this.fullscreenTabId === id) this.exitFullscreenLayout()
    if (rec.loadingTimeout) clearTimeout(rec.loadingTimeout)
    if (rec.view) this.destroyView(rec)
    this.records.delete(id)
    this.order = this.order.filter((x) => x !== id)
    if (this.activeId === id) {
      this.activeId = null
      const fallback = this.order[this.order.length - 1] ?? null
      if (fallback !== null) this.activate(fallback)
      else this.create('aura://newtab')
    } else this.emit()
  }

  reopenLastClosed(): number | null {
    const last = this.closedStack.shift()
    if (!last) return null
    return this.create(last.url)
  }

  activate(id: number): void {
    const rec = this.records.get(id); if (!rec) return
    // STAGE 8.8: if there's an active fullscreen tab on a different tab,
    // exit fullscreen when switching away
    if (this.fullscreenTabId !== null && this.fullscreenTabId !== id) {
      this.exitFullscreenLayout()
    }
    this.activeId = id
    rec.lastActiveAt = Date.now()
    if (!rec.view && !isInternal(rec.url)) this.attachView(rec, rec.url)
    for (const r of this.records.values()) {
      if (!r.view) continue
      if (r.id === id) {
        this.win.contentView.addChildView(r.view)
        if (!this.viewHidden) r.view.setVisible(true)
      } else r.view.setVisible(false)
    }
    this.layout(); this.emit()
  }

  navigate(id: number, rawUrl: string): void {
    const rec = this.records.get(id); if (!rec) return
    const url = normalizeInput(rawUrl)
    rec.lastActiveAt = Date.now()
    if (isInternal(url)) {
      if (rec.view) this.destroyView(rec)
      rec.url = url
      rec.title = 'New Tab'
      rec.favicon = null
      rec.loading = false
      this.activate(id)
      return
    }
    if (!rec.view) this.attachView(rec, url)
    else rec.view.webContents.loadURL(url)
    if (this.activeId === id) this.activate(id)
  }

  goBack(id: number): void {
    const wc = this.records.get(id)?.view?.webContents
    if (wc && wc.canGoBack()) wc.goBack()
  }
  goForward(id: number): void {
    const wc = this.records.get(id)?.view?.webContents
    if (wc && wc.canGoForward()) wc.goForward()
  }
  reload(id: number): void { this.records.get(id)?.view?.webContents.reload() }

  pin(id: number): void {
    const rec = this.records.get(id); if (!rec) return
    rec.pinned = true; this.normalizeOrder(); this.emit()
  }
  unpin(id: number): void {
    const rec = this.records.get(id); if (!rec) return
    rec.pinned = false; this.normalizeOrder(); this.emit()
  }
  toggleMute(id: number): void {
    const rec = this.records.get(id); if (!rec?.view) return
    const newMuted = !rec.muted
    rec.view.webContents.setAudioMuted(newMuted)
    rec.muted = newMuted; this.emit()
  }
  duplicate(id: number): number | null {
    const rec = this.records.get(id); if (!rec) return null
    return this.create(rec.url, id)
  }
  unload(id: number): void {
    const rec = this.records.get(id)
    if (!rec || !rec.view || this.activeId === id) return
    if (rec.loadingTimeout) clearTimeout(rec.loadingTimeout)
    this.destroyView(rec)
    rec.loading = false; this.emit()
  }
  closeOthers(keepId: number): void {
    [...this.records.keys()].filter((id) => id !== keepId).forEach((id) => this.close(id))
  }
  closeToRight(keepId: number): void {
    const idx = this.order.indexOf(keepId)
    if (idx === -1) return
    this.order.slice(idx + 1).forEach((id) => this.close(id))
  }
  closeDuplicates(): void {
    const seen = new Map<string, number>()
    const toClose: number[] = []
    for (const id of this.order) {
      const rec = this.records.get(id)
      if (!rec || rec.pinned) continue
      if (seen.has(rec.url)) toClose.push(id)
      else seen.set(rec.url, id)
    }
    toClose.forEach((id) => this.close(id))
  }

  reorder(fromId: number, toIndex: number): void {
    const fromIndex = this.order.indexOf(fromId)
    if (fromIndex === -1) return
    this.order.splice(fromIndex, 1)
    this.order.splice(Math.max(0, Math.min(toIndex, this.order.length)), 0, fromId)
    this.normalizeOrder(); this.emit()
  }

  findInPage(id: number, query: string, forward = true): void {
    const wc = this.records.get(id)?.view?.webContents; if (!wc) return
    if (!query) {
      wc.stopFindInPage('clearSelection')
      this.records.get(id)!.findMatches = null
      this.emit(); return
    }
    wc.findInPage(query, { forward, findNext: false })
  }
  findNext(id: number, forward = true): void {
    const wc = this.records.get(id)?.view?.webContents; if (!wc) return
    wc.findInPage('', { forward, findNext: true } as unknown as Electron.FindInPageOptions)
  }
  stopFindInPage(id: number): void {
    const wc = this.records.get(id)?.view?.webContents; if (!wc) return
    wc.stopFindInPage('clearSelection')
    this.records.get(id)!.findMatches = null; this.emit()
  }

  setZoom(id: number, factor: number): void {
    const rec = this.records.get(id); if (!rec?.view) return
    const clamped = clampZoom(factor)
    rec.view.webContents.setZoomFactor(clamped)
    rec.zoomFactor = clamped
    const host = hostnameOf(rec.url)
    if (host && !this.isPrivate) setZoomForHost(host, clamped)
    this.emit()
  }
  zoomIn(id: number): void {
    const rec = this.records.get(id); if (!rec) return
    this.setZoom(id, rec.zoomFactor + ZOOM_STEP)
  }
  zoomOut(id: number): void {
    const rec = this.records.get(id); if (!rec) return
    this.setZoom(id, rec.zoomFactor - ZOOM_STEP)
  }
  zoomReset(id: number): void { this.setZoom(id, 1.0) }

  print(id: number): void {
    const wc = this.records.get(id)?.view?.webContents; if (!wc) return
    wc.print({ silent: false, printBackground: true })
  }

  async pictureInPicture(id: number): Promise<boolean> {
    const wc = this.records.get(id)?.view?.webContents
    if (!wc) return false
    try {
      const ok = await wc.executeJavaScript(`(async () => {
        const v = document.querySelector('video');
        if (!v) return false;
        try {
          if (document.pictureInPictureElement) await document.exitPictureInPicture();
          else await v.requestPictureInPicture();
          return true;
        } catch (e) { return false; }
      })();`)
      return Boolean(ok)
    } catch { return false }
  }

  // ====================================================================
  // STAGE 8.8 — HTML5 Fullscreen Support
  // ====================================================================

  /**
   * Called when a website triggers HTML5 fullscreen (e.g. YouTube/Twitch
   * fullscreen button). We:
   *   1. Mark the tab as fullscreen
   *   2. Hide the chrome by expanding the WebContentsView to cover everything
   *   3. Optionally make the OS window fullscreen too
   *   4. Notify the renderer so it can hide its overlays
   */
  private enterFullscreenLayout(tabId: number): void {
    const rec = this.records.get(tabId)
    if (!rec?.view) return

    this.fullscreenTabId = tabId
    rec.fullscreen = true

    // Expand WebContentsView to fill the entire window (no chrome, no sidebar)
    const { width, height } = this.win.getContentBounds()
    rec.view.setBounds({ x: 0, y: 0, width, height })

    // Tell the renderer to hide its overlays during fullscreen
    if (!this.win.isDestroyed()) {
      this.win.webContents.send('fullscreen:enter')
    }

    // Make the OS window fullscreen for the immersive experience
    if (!this.win.isFullScreen()) {
      this.win.setFullScreen(true)
    }

    this.emit()
  }

  private exitFullscreenLayout(): void {
    if (this.fullscreenTabId === null) return
    const rec = this.records.get(this.fullscreenTabId)
    this.fullscreenTabId = null

    if (rec) {
      rec.fullscreen = false
      // Tell the page to exit fullscreen if it hasn't already
      if (rec.view && !rec.view.webContents.isDestroyed()) {
        void rec.view.webContents.executeJavaScript(
          `if (document.fullscreenElement) document.exitFullscreen();`
        ).catch(() => {})
      }
    }

    // Restore normal layout (chrome visible, view positioned below chrome)
    this.layout()

    // Restore OS window
    if (this.win.isFullScreen()) {
      this.win.setFullScreen(false)
    }

    if (!this.win.isDestroyed()) {
      this.win.webContents.send('fullscreen:exit')
    }

    this.emit()
  }

  // ====================================================================

  private idleMs(rec: TabRecord): number {
    return Date.now() - rec.lastActiveAt
  }

  private checkSleepingTabs(): void {
    const sleepAfterMs = getSleepAfterMs()
    if (!Number.isFinite(sleepAfterMs)) return

    for (const rec of this.records.values()) {
      if (!rec.view) continue
      if (rec.id === this.activeId) continue
      if (rec.pinned) continue
      if (rec.hasAudio) continue
      if (rec.fullscreen) continue
      if (this.idleMs(rec) > sleepAfterMs) {
        if (rec.loadingTimeout) clearTimeout(rec.loadingTimeout)
        this.destroyView(rec)
        rec.loading = false
      }
    }
    this.emit()
  }

  private normalizeOrder(): void {
    const pinned: number[] = []
    const unpinned: number[] = []
    for (const id of this.order) {
      const rec = this.records.get(id)
      if (!rec) continue
      if (rec.pinned) pinned.push(id)
      else unpinned.push(id)
    }
    this.order = [...pinned, ...unpinned]
  }

  private attachView(rec: TabRecord, url: string): void {
    const view = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/tab.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
        plugins: true,
        webgl: true,
        experimentalFeatures: true,
        ...getAccessibilityWebPreferences()
      }
    })
    rec.view = view
    if (rec.muted) view.webContents.setAudioMuted(true)

    applyDefaultZoom(view.webContents)

    const host = hostnameOf(url)
    if (host && !this.isPrivate) {
      const persistedZoom = getZoomForHost(host)
      if (persistedZoom !== 1.0) {
        view.webContents.once('did-finish-load', () => {
          view.webContents.setZoomFactor(persistedZoom)
          rec.zoomFactor = persistedZoom
          this.emit()
        })
      }
    }

    this.wireEvents(rec)
    attachContextMenu(view.webContents, this.win, this)
    this.win.contentView.addChildView(view)
    view.webContents.loadURL(url)
  }

  private destroyView(rec: TabRecord): void {
    if (!rec.view) return
    try {
      this.win.contentView.removeChildView(rec.view)
      rec.view.webContents.close()
    } catch { /* already destroyed */ }
    rec.view = null
  }

  private wireEvents(rec: TabRecord): void {
    const wc = rec.view!.webContents

    const syncUrl = (): void => {
      rec.url = wc.getURL()
      const host = hostnameOf(rec.url)
      if (host && !this.isPrivate) {
        const z = getZoomForHost(host)
        if (z !== rec.zoomFactor) {
          wc.setZoomFactor(z)
          rec.zoomFactor = z
        }
      }
      this.emit()
    }

    const clearLoadingTimeout = (): void => {
      if (rec.loadingTimeout) { clearTimeout(rec.loadingTimeout); rec.loadingTimeout = null }
    }
    const armLoadingTimeout = (): void => {
      clearLoadingTimeout()
      rec.loadingTimeout = setTimeout(() => {
        rec.loading = false; this.emit()
      }, LOADING_HARD_TIMEOUT_MS)
    }

    wc.on('did-start-loading', () => { rec.loading = true; clearLoadingTimeout(); this.emit() })
    wc.on('did-stop-loading', () => { rec.loading = false; clearLoadingTimeout(); syncUrl() })
    wc.on('did-finish-load', () => {
      armLoadingTimeout()
      recordVisit(rec.url, rec.title, this.isPrivate)
    })

    wc.on('page-title-updated', (_e, title) => {
      rec.title = title
      updateTitle(rec.url, title, this.isPrivate); this.emit()
    })
    wc.on('page-favicon-updated', (_e, favicons) => {
      rec.favicon = favicons[0] ?? null; this.emit()
    })
    wc.on('did-navigate', syncUrl)
    wc.on('did-navigate-in-page', syncUrl)
    wc.on('did-fail-load', (_e, errorCode, errorDescription, _validatedURL, isMainFrame) => {
      if (errorCode === -3 || !isMainFrame) return
      rec.loading = false; clearLoadingTimeout()
      rec.title = errorDescription || 'Page failed to load'
      this.emit()
    })
    wc.on('found-in-page', (_e, result) => {
      rec.findMatches = { current: result.activeMatchOrdinal, total: result.matches }
      this.emit()
    })

    wc.on('audio-state-changed', (event) => {
      rec.hasAudio = event.audible
      this.emit()
    })

    // ════════════════════════════════════════════════════════════════
    // STAGE 8.8 — HTML5 fullscreen events (THE FIX)
    // ════════════════════════════════════════════════════════════════
    wc.on('enter-html-full-screen', () => {
      this.enterFullscreenLayout(rec.id)
    })

    wc.on('leave-html-full-screen', () => {
      this.exitFullscreenLayout()
    })

    wc.setWindowOpenHandler(({ url }) => {
      this.create(url)
      return { action: 'deny' }
    })
  }

  private layout(): void {
    if (this.activeId === null) return
    const rec = this.records.get(this.activeId)
    if (!rec?.view) return

    // STAGE 8.8: if fullscreen, view fills the entire window
    if (this.fullscreenTabId === this.activeId) {
      const { width, height } = this.win.getContentBounds()
      if (width === 0 || height === 0) return
      rec.view.setBounds({ x: 0, y: 0, width, height })
      return
    }

    const { width, height } = this.win.getContentBounds()
    if (width === 0 || height === 0) return
    rec.view.setBounds({
      x: this.sidebarWidth, y: this.chromeHeight,
      width: Math.max(0, width - this.sidebarWidth),
      height: Math.max(0, height - this.chromeHeight)
    })
  }

  private snapshot(): { tabs: TabState[]; activeId: number | null } {
    const tabs = this.order.map((id) => {
      const r = this.records.get(id)!
      const wc = r.view?.webContents
      const group = getGroupForTab(r.id)
      return {
        id: r.id, url: r.url, title: r.title || 'New Tab',
        favicon: r.favicon, loading: r.loading,
        internal: r.view === null,
        canGoBack: wc ? wc.canGoBack() : false,
        canGoForward: wc ? wc.canGoForward() : false,
        pinned: r.pinned, muted: r.muted,
        zoomFactor: r.zoomFactor, findMatches: r.findMatches,
        sleeping: r.view === null && !isInternal(r.url),
        lastActiveAt: r.lastActiveAt,
        groupId: group?.id ?? null,
        hasAudio: r.hasAudio,
        fullscreen: r.fullscreen
      } satisfies TabState
    })
    return { tabs, activeId: this.activeId }
  }

  private scheduleSessionSave(): void {
    if (this.isPrivate) return
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null
      this.flushSession()
    }, 500)
  }

  private flushSession(): void {
    this.doFlushSession()
  }

  forceFlushSession(): void {
    this.doFlushSession()
  }

  private doFlushSession(): void {
    const persistable = this.order
      .map((id, idx) => {
        const r = this.records.get(id)
        if (!r) return null
        return { url: r.url, title: r.title, pinned: r.pinned, active: id === this.activeId, order: idx }
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
    saveTabs(persistable)
  }

  private emit(): void {
    if (this.win.isDestroyed()) return
    if (this.emitTimer) return
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null
      if (this.win.isDestroyed()) return
      const { tabs, activeId } = this.snapshot()
      this.win.webContents.send('tabs:update', tabs, activeId)
      this.scheduleSessionSave()
    }, 16)
  }
}

import { BrowserWindow, WebContentsView } from 'electron'
import { join } from 'path'
import { isInternal, normalizeInput } from './url'
import { recordVisit, updateTitle } from './history'

export interface TabState {
  id: number
  url: string
  title: string
  favicon: string | null
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  internal: boolean
}

interface TabRecord {
  id: number
  view: WebContentsView | null
  url: string
  title: string
  favicon: string | null
  loading: boolean
  loadingTimeout: NodeJS.Timeout | null
}

let nextId = 1
const LOADING_HARD_TIMEOUT_MS = 5000

export class TabManager {
  private records = new Map<number, TabRecord>()
  private order: number[] = []
  private activeId: number | null = null
  private chromeHeight: number
  private sidebarWidth: number = 0
  private isPrivate: boolean
  private emitTimer: NodeJS.Timeout | null = null
  private viewHidden = false

  constructor(
    private win: BrowserWindow,
    chromeHeight: number,
    private session?: Electron.Session,
    isPrivate: boolean = false
  ) {
    this.chromeHeight = chromeHeight
    this.isPrivate = isPrivate
    win.on('resize', () => this.layout())
    win.on('enter-full-screen', () => this.layout())
    win.on('leave-full-screen', () => this.layout())
  }

  getActiveId(): number | null { return this.activeId }
  setSidebarWidth(w: number): void { this.sidebarWidth = Math.max(0, w); this.layout() }
  setChromeHeight(h: number): void { this.chromeHeight = h; this.layout() }

  hideActiveView(): void {
    this.viewHidden = true
    for (const r of this.records.values()) {
      r.view?.setVisible(false)
    }
  }

  showActiveView(): void {
    this.viewHidden = false
    if (this.activeId !== null) {
      const rec = this.records.get(this.activeId)
      if (rec?.view) rec.view.setVisible(true)
    }
  }

  create(rawUrl = 'aura://newtab'): number {
    const url = normalizeInput(rawUrl)
    const id = nextId++
    const rec: TabRecord = {
      id,
      view: null,
      url,
      title: url === 'aura://newtab' ? 'New Tab' : url,
      favicon: null,
      loading: false,
      loadingTimeout: null
    }
    this.records.set(id, rec)
    this.order.push(id)
    if (!isInternal(url)) this.attachView(rec, url)
    this.activate(id)
    return id
  }

  close(id: number): void {
    const rec = this.records.get(id)
    if (!rec) return
    if (rec.loadingTimeout) clearTimeout(rec.loadingTimeout)
    if (rec.view) this.destroyView(rec)
    this.records.delete(id)
    this.order = this.order.filter((x) => x !== id)
    if (this.activeId === id) {
      this.activeId = null
      const fallback = this.order[this.order.length - 1] ?? null
      if (fallback !== null) this.activate(fallback)
      else this.create('aura://newtab')
    } else {
      this.emit()
    }
  }

  activate(id: number): void {
    const rec = this.records.get(id)
    if (!rec) return
    this.activeId = id
    for (const r of this.records.values()) {
      if (!r.view) continue
      if (r.id === id) {
        this.win.contentView.addChildView(r.view)
        if (!this.viewHidden) r.view.setVisible(true)
      } else {
        r.view.setVisible(false)
      }
    }
    this.layout()
    this.emit()
  }

  navigate(id: number, rawUrl: string): void {
    const rec = this.records.get(id)
    if (!rec) return
    const url = normalizeInput(rawUrl)
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
  reload(id: number): void {
    this.records.get(id)?.view?.webContents.reload()
  }

  reorder(fromId: number, toIndex: number): void {
    const fromIndex = this.order.indexOf(fromId)
    if (fromIndex === -1) return
    this.order.splice(fromIndex, 1)
    this.order.splice(Math.max(0, Math.min(toIndex, this.order.length)), 0, fromId)
    this.emit()
  }

  private attachView(rec: TabRecord, url: string): void {
    const view = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/tab.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: true,
        ...(this.session ? { session: this.session } : {})
      }
    })
    rec.view = view
    this.wireEvents(rec)
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
      this.emit()
    }

    const clearLoadingTimeout = (): void => {
      if (rec.loadingTimeout) {
        clearTimeout(rec.loadingTimeout)
        rec.loadingTimeout = null
      }
    }

    const armLoadingTimeout = (): void => {
      clearLoadingTimeout()
      rec.loadingTimeout = setTimeout(() => {
        rec.loading = false
        this.emit()
      }, LOADING_HARD_TIMEOUT_MS)
    }

    wc.on('did-start-loading', () => {
      rec.loading = true
      clearLoadingTimeout()
      this.emit()
    })

    wc.on('did-stop-loading', () => {
      rec.loading = false
      clearLoadingTimeout()
      syncUrl()
    })

    wc.on('did-finish-load', () => {
      armLoadingTimeout()
      if (!this.isPrivate) {
        recordVisit(rec.url, rec.title)
      }
    })

    wc.on('page-title-updated', (_e, title) => {
      rec.title = title
      if (!this.isPrivate) {
        updateTitle(rec.url, title)
      }
      this.emit()
    })

    wc.on('page-favicon-updated', (_e, favicons) => {
      rec.favicon = favicons[0] ?? null
      this.emit()
    })

    wc.on('did-navigate', syncUrl)
    wc.on('did-navigate-in-page', syncUrl)

    wc.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (errorCode === -3) return
      if (!isMainFrame) return
      rec.loading = false
      clearLoadingTimeout()

      const friendly = (() => {
        switch (errorCode) {
          case -2: return 'Site took too long to respond'
          case -6: return 'File not found'
          case -7: return 'Connection timed out'
          case -100: return "Couldn't connect to the site"
          case -101: return 'Connection was reset'
          case -102: return "Couldn't reach the server"
          case -105: return "Couldn't resolve site address"
          case -106: return 'No internet connection'
          case -200: return 'Certificate is not trusted'
          default: return errorDescription || 'Page failed to load'
        }
      })()
      rec.title = friendly
      console.warn(`[Aura] Load failed (${errorCode}): ${errorDescription} — ${validatedURL}`)
      this.emit()
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
    const { width, height } = this.win.getContentBounds()
    if (width === 0 || height === 0) return
    rec.view.setBounds({
      x: this.sidebarWidth,
      y: this.chromeHeight,
      width: Math.max(0, width - this.sidebarWidth),
      height: Math.max(0, height - this.chromeHeight)
    })
  }

  getState(): { tabs: TabState[]; activeId: number | null } {
    return this.snapshot()
  }

  private snapshot(): { tabs: TabState[]; activeId: number | null } {
    const tabs = this.order.map((id) => {
      const r = this.records.get(id)!
      const wc = r.view?.webContents
      return {
        id: r.id,
        url: r.url,
        title: r.title || 'New Tab',
        favicon: r.favicon,
        loading: r.loading,
        internal: r.view === null,
        canGoBack: wc ? wc.canGoBack() : false,
        canGoForward: wc ? wc.canGoForward() : false
      } satisfies TabState
    })
    return { tabs, activeId: this.activeId }
  }

  private emit(): void {
    if (this.win.isDestroyed()) return
    if (this.emitTimer) return
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null
      if (this.win.isDestroyed()) return
      const { tabs, activeId } = this.snapshot()
      this.win.webContents.send('tabs:update', tabs, activeId)
    }, 16)
  }
}

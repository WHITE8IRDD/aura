import { WebContentsView, BrowserWindow } from 'electron'
import { join } from 'path'
import { TabManager } from './tabs'
import { isInternal, normalizeInput } from './url'
import { getAccessibilityWebPreferences, applyDefaultZoom } from './accessibility'
import { attachContextMenu } from './contextMenu'
import { getSetting, setSetting } from './settings'

export interface SplitState {
  tabId: number
  splitView: WebContentsView
  splitUrl: string
  focusedPane: 'primary' | 'split'
  ratio: number
}

export class SplitManager {
  private splits = new Map<number, SplitState>()
  private win: BrowserWindow

  constructor(win: BrowserWindow) {
    this.win = win
  }

  private notify(): void {
    if (!this.win.isDestroyed()) {
      this.win.webContents.send('split:changed')
    }
  }

  openSplit(tm: TabManager, tabId: number, url: string): void {
    this.closeSplit(tabId)

    const normalizedUrl = normalizeInput(url)
    if (isInternal(normalizedUrl)) return

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

    applyDefaultZoom(view.webContents)
    attachContextMenu(view.webContents, this.win, tm)

    const state: SplitState = {
      tabId,
      splitView: view,
      splitUrl: normalizedUrl,
      focusedPane: 'primary',
      ratio: this.getSavedRatio()
    }

    this.splits.set(tabId, state)
    view.webContents.loadURL(normalizedUrl)

    this.win.contentView.addChildView(view)
    this.layoutForTab(tm, tabId)
    tm.emit()
    this.notify()
  }

  closeSplit(tabId: number): void {
    const state = this.splits.get(tabId)
    if (!state) return
    try {
      this.win.contentView.removeChildView(state.splitView)
      state.splitView.webContents.close()
    } catch {}
    this.splits.delete(tabId)
  }

  closeSplitForTabAndEmit(tm: TabManager, tabId: number): void {
    this.closeSplit(tabId)
    // Force full-window layout for the surviving tab
    // (customLayout returns false now since isSplit is false)
    tm.layout()
    tm.emit()
    this.notify()
  }

  isSplit(tabId: number): boolean {
    return this.splits.has(tabId)
  }

  getSplit(tabId: number): SplitState | undefined {
    return this.splits.get(tabId)
  }

  setFocusedPane(tabId: number, pane: 'primary' | 'split'): void {
    const state = this.splits.get(tabId)
    if (!state) return
    state.focusedPane = pane
    this.notify()
  }

  toggleFocusedPane(tabId: number): void {
    const state = this.splits.get(tabId)
    if (!state) return
    state.focusedPane = state.focusedPane === 'primary' ? 'split' : 'primary'
    this.notify()
  }

  getSavedRatio(): number {
    const val = getSetting('splitRatio' as any)
    const ratio = typeof val === 'number' ? val : parseFloat(val as string)
    return isFinite(ratio) ? Math.max(0.15, Math.min(0.85, ratio)) : 0.5
  }

  saveRatio(tabId: number, ratio: number): void {
    setSetting('splitRatio' as any, ratio)
  }

  setRatio(tabId: number, ratio: number): void {
    const state = this.splits.get(tabId)
    if (!state) return
    state.ratio = Math.max(0.15, Math.min(0.85, ratio))
    this.saveRatio(tabId, state.ratio)
    const tm = TabManager.findTab(tabId)
    if (tm) this.layoutForTab(tm, tabId)
  }

  navigateSplitPane(tabId: number, url: string): void {
    const state = this.splits.get(tabId)
    if (!state) return
    if (url === 'back') { state.splitView.webContents.goBack(); return }
    if (url === 'forward') { state.splitView.webContents.goForward(); return }
    if (url === 'reload') { state.splitView.webContents.reload(); return }
    const normalized = normalizeInput(url)
    state.splitUrl = normalized
    state.splitView.webContents.loadURL(normalized)
  }

  /**
   * Navigate whichever pane is currently focused.
   * If no split, falls through to normal TabManager navigation.
   */
  navigateFocusedPane(tm: TabManager, tabId: number, url: string): void {
    const state = this.splits.get(tabId)
    if (!state) {
      if (url === 'back') tm.goBack(tabId)
      else if (url === 'forward') tm.goForward(tabId)
      else tm.navigate(tabId, url)
      return
    }
    if (state.focusedPane === 'primary') {
      if (url === 'back') tm.goBack(tabId)
      else if (url === 'forward') tm.goForward(tabId)
      else tm.navigate(tabId, url)
    } else {
      this.navigateSplitPane(tabId, url)
    }
  }

  /**
   * Navigate the opposite (non-focused) pane.
   */
  navigateNonFocusedPane(tm: TabManager, tabId: number, url: string): void {
    const state = this.splits.get(tabId)
    if (!state) {
      tm.navigate(tabId, url)
      return
    }
    if (state.focusedPane === 'primary') {
      this.navigateSplitPane(tabId, url)
    } else {
      tm.navigate(tabId, url)
    }
  }

  hideAll(): void {
    for (const [, state] of this.splits) {
      state.splitView.setVisible(false)
    }
  }

  showForTab(tabId: number): void {
    const state = this.splits.get(tabId)
    if (!state) return
    state.splitView.setVisible(true)
  }

  hideForTab(tabId: number): void {
    const state = this.splits.get(tabId)
    if (!state) return
    state.splitView.setVisible(false)
  }

  layoutForTab(tm: TabManager, tabId: number): void {
    const state = this.splits.get(tabId)
    if (!state) return
    const rec = tm.getTab(tabId)
    if (!rec?.view) return

    const { width, height } = this.win.getContentBounds()
    if (width === 0 || height === 0) return

    const sidebarWidth = tm.getSidebarWidth()
    const chromeHeight = tm.getChromeHeight()

    // Visual gaps — MUST match CSS PANE_GAP + PANE_RADIUS constants
    const PANE_GAP = 6
    const PANE_INSET = 2
    const DIVIDER_W = 8

    const W = Math.max(0, width - sidebarWidth)
    const H = Math.max(0, height - chromeHeight)

    // Compute pane outer widths (matching .split-pane CSS widths)
    const leftOuterW = Math.floor((W - DIVIDER_W) * state.ratio)
    const rightOuterW = W - DIVIDER_W - leftOuterW

    // Compute BrowserView inner bounds (inside the gap + rounded border)
    const leftViewX = sidebarWidth + PANE_GAP + PANE_INSET
    const leftViewY = chromeHeight + PANE_GAP + PANE_INSET
    const leftViewW = leftOuterW - PANE_GAP - PANE_INSET * 2
    const leftViewH = H - PANE_GAP * 2 - PANE_INSET * 2

    const rightViewX = sidebarWidth + leftOuterW + DIVIDER_W + PANE_INSET
    const rightViewY = chromeHeight + PANE_GAP + PANE_INSET
    const rightViewW = rightOuterW - PANE_GAP - PANE_INSET * 2
    const rightViewH = H - PANE_GAP * 2 - PANE_INSET * 2

    rec.view.setBounds({
      x: Math.round(leftViewX), y: Math.round(leftViewY),
      width: Math.max(0, Math.round(leftViewW)),
      height: Math.max(0, Math.round(leftViewH))
    })

    state.splitView.setBounds({
      x: Math.round(rightViewX), y: Math.round(rightViewY),
      width: Math.max(0, Math.round(rightViewW)),
      height: Math.max(0, Math.round(rightViewH))
    })
  }

  cleanup(): void {
    for (const [tabId] of this.splits) {
      this.closeSplit(tabId)
    }
  }
}

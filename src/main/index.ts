import { app, BrowserWindow, ipcMain, session, shell, dialog, nativeImage, globalShortcut, clipboard, systemPreferences, Menu, MenuItem } from 'electron'
import { join } from 'path'

app.name = 'Aura'

// ─── Global error suppression ────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

const origShowErrorBox = dialog.showErrorBox.bind(dialog)
dialog.showErrorBox = (title: string, content: string) => {
  console.error(`[suppressed error dialog] ${title}: ${content}`
)}

import { TabManager } from './tabs'
import { registerInputContextMenuIPC } from './inputContextMenu'
import { registerMediaHubMenuIPC } from './mediaHubMenu'
import { registerMediaHubWindowIPC } from './mediaHubWindow'
import { registerShieldsIpc } from './blocker/ipc'
import { prewarmShieldsPopover } from './blocker/shields-popover'
import { initFeatures, getSnoozer } from './features/ipc'
import { registerDarkModeWindowIPC } from './darkModeWindow'
import { registerToolbarContextMenuIPC } from './toolbarContextMenu'
import { registerWindowControls, wireMaximizeEvents } from './window-controls'
import { registerShortcuts } from './shortcuts'
import {
  search as searchHistory,
  recent as recentHistory,
  all as allHistory,
  deleteEntry as deleteHistoryEntry,
  clear as clearHistory,
  count as historyCount
} from './history'
import { preconnect } from './preconnect'
import { getPrivacyStats } from './privacy-stats'
import { NinjaWindowManager } from './ninja'
import {
  initEngine,
  installBlockerOnSession,
} from './blocker'
import {
  initShieldsDatabase,
  flushBlockedCounts,
} from './blocker/shields-store'
import { allowInsecureHost } from './blocker'
import { setupAntiFingerprintFlags, setupSessionFingerprintDefenses } from './security/fingerprint'
import { setupPermissionPrompts, respondToPermission } from './security/permissions'
import { isPhishingDomain } from './blocker/phishing'
import { fetchFavicon } from './favicons'
import { setupMediaWatcher, registerMediaControllerIPC } from './mediaController'
import {
  registerMediaResumeHandlers,
  forceFlush as forceFlushMediaResume,
  gcStaleEntries as gcStaleMediaEntries,
  cleanCorruptedEntries,
  sendRestoreToTab
} from './mediaResume'
import { registerClearBrowsingDataIPC } from './clearBrowsingData'
import { registerAutofillIPC, maybePromptSave } from './autofill'
import { applyZoomToAllTabs } from './accessibility'
import { getDb, closeDb } from './db'
import {
  addBookmark, deleteBookmark, updateBookmark, listBookmarks, isBookmarked,
  addFolder, deleteFolder, listFolders, listBarBookmarks, reorderBookmarks, addSeparator
} from './bookmarks'
import {
  setupDownloads, listDownloads,
  cancelDownload, pauseDownload, resumeDownload,
  getDownloadRecord,
  openDownloadedFile, revealDownloadedFile,
  deleteDownloadRecord, clearCompletedDownloads
} from './downloads'
import {
  saveCredential,
  getCredentialsForOrigin,
  getAllCredentials,
  getCredentialById,
  deleteCredential,
  updateCredential,
  markCredentialUsed,
  searchCredentials,
  checkDuplicate,
  generateSecurePassword,
  addToBlocklist,
  isBlocklisted,
  removeFromBlocklist,
  analyzePasswordHealth,
  EncryptionUnavailableError
} from './passwords'
import { captureTab, saveScreenshot, copyScreenshotToClipboard } from './screenshot'
import { extractArticle, probeReaderable, getReaderPayload } from './reader'
import type { ReaderArticle } from './reader'
import {
  addReadingItem, deleteReadingItem, markRead, listReadingItems, clearRead
} from './reading-list'
import {
  addBoost, updateBoost, deleteBoost, listBoosts
} from './boosts'
import {
  createGroup, deleteGroup, renameGroup, setGroupColor, toggleCollapsed,
  addTabToGroup, removeTabFromAnyGroup, listGroups, snapshot as snapshotGroups
} from './tab-groups'
import { getAllSettings, getSetting, setSetting, resetSettings, getDefaults } from './settings'
import { initFocusTracker } from './focusTracker'
import {
  setupKeyboardIPC,
  registerKeyboardShortcut,
  cleanupKeyboard
} from './virtualKeyboard'
import { initThemeManager, getResolvedTheme, handleThemeSettingChange } from './themeManager'
import { setAsDefaultBrowser, isDefaultBrowser } from './default-browser'
import { registerSession, broadcastSettingChange, applyStartupFlags, applyHardwareAccelLater, applyForceDarkFlag } from './settings-bridge'
import { initLanguages } from './languages'
import {
  registerDownloadsSettingsIPC,
  startRetentionScheduler,
  maybeClearOnQuit
} from './downloadsSettings'
import { loadTabs, loadPinnedTabsOnly } from './sessions'
import { registerAboutIPC } from './about'
import { initSystemIntegration, applyStartOnLogin, applyProxyMode, applyBackgroundMode } from './systemIntegration'
import { initPerformance, applyEnergySaverToAll } from './performance'
import { registerDefaultBrowserIPC } from './defaultBrowser'
import { registerResetIPC } from './resetSettings'
import { registerProfileDataIPC } from './profileData'
import { registerTabContextMenuIPC } from './tabContextMenuNative'
import { registerTranslatorIPC } from './translator'
import { registerImageSaverIPC } from './imageSaver'
import { registerTranslatorWindowIPC } from './translatorWindow'
import { registerImageSaverWindowIPC } from './imageSaverWindow'
import { registerPerfHudWindowIPC, togglePerfHud } from './perfHudWindow'
import { SplitManager } from './splitManager'
import { writeFile } from 'fs/promises'


// STAGE 10A-FIX: apply startup flags that must run before app.whenReady()
applyStartupFlags()

// ============================================================
// SAFE GPU & PERFORMANCE FLAGS (Windows-compatible)
// Removed VaapiVideoDecoder/Encoder (Linux-only, crashes Windows GPU)
// Removed enable-hardware-overlays (black frames on transparent windows)
// Removed enable-zero-copy (unstable on integrated GPUs)
// Removed ignore-gpu-blocklist, disable-gpu-driver-bug-workarounds
// ============================================================

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-quic')

setupAntiFingerprintFlags()

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

app.setName('Aura')

// ─── Single-instance lock ─────────────────────────────────────
// Prevents zombie processes from holding ports/cache directories.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.log('[Aura] Another instance is already running. Exiting.')
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', () => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      const w = wins[0]
      if (w.isMinimized()) w.restore()
      w.focus()
    }
  })
}

const CHROME_HEIGHT = 84
const SIDEBAR_WIDTH_DEFAULT = 52

function resolveIcon(name: string): string {
  const devPath = join(__dirname, '../../resources/icons', name)
  if (require('fs').existsSync(devPath)) return devPath
  return join(app.isPackaged ? process.resourcesPath : __dirname, 'icons', name)
}

let mainWindow: BrowserWindow | null = null
let tabs: TabManager | null = null
let splitManager: SplitManager | null = null
let ninja: NinjaWindowManager | null = null
let iconPath = ''

const readerCache = new Map<string | number, ReaderArticle>()
const readerProbeCache = new Map<string | number, boolean>()

const startupReady = app.whenReady().then(async () => {
  console.log('[Aura] Opening database…')
  const db = getDb()
  initShieldsDatabase(db)
  applyHardwareAccelLater()
  applyForceDarkFlag()
  console.log('[Aura/settings] Loaded settings')
  console.log('[Aura] Pre-initializing blocker engine…')
  void initEngine()
  setupSessionFingerprintDefenses(session.defaultSession)
  setupPermissionPrompts(session.defaultSession)
  registerSession(session.defaultSession)

  // Video stream priority optimization
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.googlevideo.com/*', '*://*.youtube.com/*'] },
    (details, callback) => {
      details.requestHeaders['Priority'] = 'u=0, i'
      callback({ requestHeaders: details.requestHeaders })
    }
  )
  initLanguages()
  setupDownloads()
  registerDownloadsSettingsIPC()
  startRetentionScheduler()
  setupMediaWatcher()
  registerMediaControllerIPC()
  registerMediaHubMenuIPC()
  registerMediaHubWindowIPC()
  registerShieldsIpc({
    getMainWindow: () => mainWindow,
    getTabWebContents: (tabId) => {
      if (!tabs) return null
      if (tabId == null) {
        const activeId = tabs.getActiveId()
        if (!activeId) return null
        const tab = tabs.getTab(activeId)
        return tab?.view?.webContents ?? null
      }
      const tab = tabs.getTab(Number(tabId))
      return tab?.view?.webContents ?? null
    },
  })
  initFocusTracker()
  setupKeyboardIPC()
  registerKeyboardShortcut()
  console.log('[aura:media] registering media resume IPC handlers')
  registerMediaResumeHandlers()
  cleanCorruptedEntries()
  console.log('[aura:media] running gcStaleMediaEntries')
  gcStaleMediaEntries()
  console.log('[Aura] Ready')
})

async function createWindow(): Promise<void> {
  await startupReady
  initThemeManager()

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 880,
    minHeight: 560,
    backgroundColor: '#0f1015',
    show: false,
    title: 'Aura',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 14 } : undefined,
    frame: process.platform === 'darwin',
    ...(process.platform === 'win32' && { thickFrame: true }),
    transparent: false,
    icon: resolveIcon('icon-256.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  mainWindow.on('page-title-updated', (e) => e.preventDefault())
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  prewarmShieldsPopover(mainWindow, {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    sandbox: false,
    nodeIntegration: false,
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Aura Main] Failed to load renderer: ${errorCode} - ${errorDescription}`)
  })

  mainWindow.webContents.on('context-menu', (event, _params) => {
    event.preventDefault()
  })

  tabs = new TabManager(mainWindow, CHROME_HEIGHT, false)
  tabs.setSidebarWidth(SIDEBAR_WIDTH_DEFAULT)

  // STAGE 10C.4 — Split View
  splitManager = new SplitManager(mainWindow)
  tabs.customLayout = (activeId) => {
    if (!splitManager) return false
    if (!splitManager.isSplit(activeId)) return false
    splitManager.layoutForTab(tabs!, activeId)
    return true
  }
  tabs.onAfterActivate = (id) => {
    if (!splitManager) return
    splitManager.showForTab(id)
  }
  tabs.onBeforeClose = (id) => {
    if (!splitManager) return
    splitManager.closeSplitForTabAndEmit(tabs!, id)
  }

  // Aura Features (snooze / gestures / dark mode): register IPC + attach
  // TabManager hooks after the main manager exists. Late managers (Ninja)
  // are attached lazily by the snoozer on first sight.
  initFeatures({ getMainWindow: () => mainWindow })
  registerDarkModeWindowIPC(() => mainWindow)

  ninja = new NinjaWindowManager(CHROME_HEIGHT, SIDEBAR_WIDTH_DEFAULT)

  iconPath = resolveIcon('icon-32.png')
  initSystemIntegration(mainWindow, iconPath)

  mainWindow.setIcon(nativeImage.createFromPath(resolveIcon('icon-256.png')))
  initPerformance()

  registerWindowControls(() => BrowserWindow.getFocusedWindow() ?? mainWindow)
  wireMaximizeEvents(mainWindow)
  registerShortcuts(mainWindow, tabs)

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    const focused = BrowserWindow.getFocusedWindow()
    const parent = focused ?? mainWindow
    if (parent) togglePerfHud(parent)
  })

  // STAGE 13 — Split View shortcuts
  globalShortcut.register('CommandOrControl+/', () => {
    const focused = BrowserWindow.getFocusedWindow()
    if (!focused || !tabs || !splitManager) return
    const activeId = tabs.getActiveId()
    if (activeId === null) return
    if (splitManager.isSplit(activeId)) {
      splitManager.closeSplitForTabAndEmit(tabs, activeId)
    } else {
      const state = tabs.getState()
      const other = state.tabs.find((t) => t.id !== activeId)
      if (other) {
        splitManager.openSplit(tabs, activeId, other.url)
      }
    }
  })

  globalShortcut.register('CommandOrControl+[', () => {
    const focused = BrowserWindow.getFocusedWindow()
    if (!focused || !tabs || !splitManager) return
    const activeId = tabs.getActiveId()
    if (activeId !== null) {
      splitManager.setFocusedPane(activeId, 'primary')
    }
  })

  globalShortcut.register('CommandOrControl+]', () => {
    const focused = BrowserWindow.getFocusedWindow()
    if (!focused || !tabs || !splitManager) return
    const activeId = tabs.getActiveId()
    if (activeId !== null) {
      splitManager.setFocusedPane(activeId, 'split')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.once('did-finish-load', () => {
    if (!tabs) return
    const startupBehavior = getSetting('startupBehavior') as string
    let openedAny = false

    if (startupBehavior === 'restoreSession') {
      const saved = loadTabs(0)
      if (saved.length > 0) {
        for (const tab of saved) {
          const tabId = tabs.create(tab.url)
          if (tab.pinned) tabs.pin(tabId)
        }
        openedAny = true
      }
    } else {
      const pinned = loadPinnedTabsOnly(0)
      for (const tab of pinned) {
        const tabId = tabs.create(tab.url)
        tabs.pin(tabId)
        openedAny = true
      }
    }

    if (startupBehavior === 'newtab' || (startupBehavior !== 'specificUrl' && !openedAny)) {
      tabs.create('aura://newtab')
    } else if (startupBehavior === 'specificUrl') {
      const url = getSetting('startupUrl') as string
      if (url && /^https?:\/\//i.test(url)) {
        tabs.create(url)
      } else if (!openedAny) {
        tabs.create('aura://newtab')
      }
    }

  })

  mainWindow.on('closed', () => {
    if (splitManager) { splitManager.cleanup(); splitManager = null }
    mainWindow = null
    tabs = null
  })

}

function getTabsForEvent(e: Electron.IpcMainInvokeEvent): TabManager | null {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return null
  if (win === mainWindow) return tabs
  const ninjaAny = ninja as unknown as {
    getManager?: (id: number) => TabManager | null
    getTabsForWindow?: (w: BrowserWindow) => TabManager | null
  }
  return ninjaAny.getManager?.(win.id) ?? ninjaAny.getTabsForWindow?.(win) ?? null
}

registerInputContextMenuIPC()
registerToolbarContextMenuIPC()

function getSplitManager(e: Electron.IpcMainInvokeEvent): SplitManager | null {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || win !== mainWindow) return null
  return splitManager
}

// ---- Tab IPC ----
ipcMain.handle('tabs:create', (e, url?: string) => getTabsForEvent(e)?.create(url))
ipcMain.handle('tabs:close', (e, id: number) => {
  readerCache.delete(id)
  readerProbeCache.delete(id)
  getTabsForEvent(e)?.close(id)
})
ipcMain.handle('tabs:activate', (e, id: number) => {
  const tm = getTabsForEvent(e)
  if (!tm) return
  // STAGE 10C.4: hide split views for the previously active tab
  const sm = getSplitManager(e)
  const prevId = tm.getActiveId()
  if (prevId !== null && sm) sm.hideForTab(prevId)
  tm.activate(id)
})
ipcMain.handle('tabs:navigate', (e, id: number, url: string) =>
  getTabsForEvent(e)?.navigate(id, url))
ipcMain.handle('tabs:goBack', (e, id: number) => getTabsForEvent(e)?.goBack(id))
ipcMain.handle('tabs:goForward', (e, id: number) => getTabsForEvent(e)?.goForward(id))
ipcMain.handle('tabs:reload', (e, id: number) => getTabsForEvent(e)?.reload(id))
ipcMain.handle('tabs:getState', (e) => {
  try {
    const mgr = getTabsForEvent(e)
    if (!mgr) {
      console.warn('[tabs:getState] no TabManager for event sender')
      return { tabs: [], activeId: null }
    }
    return mgr.getState()
  } catch (err) {
    console.error('[tabs:getState] threw', err)
    return { tabs: [], activeId: null }
  }
})
ipcMain.handle('tabs:reorder', (e, fromId: number | number[], toIndex?: number) => {
  const tm = getTabsForEvent(e)
  if (!tm) return false
  // New contract: full ordered id array from TabBar drag-drop
  if (Array.isArray(fromId)) {
    tm.setOrder(fromId.map((id) => Number(id)))
    return true
  }
  // Legacy contract: single move (fromId, toIndex), used by VerticalTabBar
  if (typeof toIndex === 'number') {
    tm.reorder(Number(fromId), toIndex)
    return true
  }
  return false
})
ipcMain.handle('tabs:pin', (e, id: number) => {
  const tm = getTabsForEvent(e)
  if (!tm) return
  tm.pin(id)
  const win = BrowserWindow.fromWebContents(e.sender) || BrowserWindow.getFocusedWindow()
  if (win) {
    const state = tm.getState()
    win.webContents.send('tabs:update', state.tabs, state.activeId)
  }
})
ipcMain.handle('tabs:unpin', (e, id: number) => {
  const tm = getTabsForEvent(e)
  if (!tm) return
  tm.unpin(id)
  const win = BrowserWindow.fromWebContents(e.sender) || BrowserWindow.getFocusedWindow()
  if (win) {
    const state = tm.getState()
    win.webContents.send('tabs:update', state.tabs, state.activeId)
  }
})
ipcMain.handle('tabs:toggle-pin', (e, id: number) => {
  const tm = getTabsForEvent(e)
  if (!tm) return false
  const tab = tm.getTab(id)
  if (!tab) return false
  if (tab.pinned) tm.unpin(id)
  else tm.pin(id)
  // Explicitly broadcast updated tabs to renderer as separate arguments
  const win = BrowserWindow.fromWebContents(e.sender) || BrowserWindow.getFocusedWindow()
  if (win) {
    const state = tm.getState()
    win.webContents.send('tabs:update', state.tabs, state.activeId)
  }
  return !tab.pinned
})
ipcMain.handle('tabs:mute', (e, id: number) => getTabsForEvent(e)?.toggleMute(id))
ipcMain.handle('tabs:duplicate', (e, id: number) => getTabsForEvent(e)?.duplicate(id))
ipcMain.handle('tabs:unload', (e, id: number) => getTabsForEvent(e)?.unload(id))
ipcMain.handle('tabs:closeOthers', (e, id: number) => getTabsForEvent(e)?.closeOthers(id))
ipcMain.handle('tabs:closeToRight', (e, id: number) => getTabsForEvent(e)?.closeToRight(id))
ipcMain.handle('tabs:closeDuplicates', (e) => getTabsForEvent(e)?.closeDuplicates())
ipcMain.handle('tabs:reopenClosed', (e) => getTabsForEvent(e)?.reopenLastClosed())
ipcMain.handle('tabs:hasClosedTabs', (e) => getTabsForEvent(e)?.hasClosedTabs() ?? false)

ipcMain.handle('tabs:find', (e, id: number, query: string, forward: boolean) =>
  getTabsForEvent(e)?.findInPage(id, query, forward))
ipcMain.handle('tabs:findNext', (e, id: number, forward: boolean) =>
  getTabsForEvent(e)?.findNext(id, forward))
ipcMain.handle('tabs:stopFind', (e, id: number) => getTabsForEvent(e)?.stopFindInPage(id))

ipcMain.handle('tabs:show-context-menu', async (event, tabId: string) => {
  const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow()
  if (!win) return
  const tm = getTabsForEvent(event)
  if (!tm) return
  const tab = tm.getTab(Number(tabId))
  if (!tab) return

  const menu = new Menu()
  menu.append(
    new MenuItem({
      label: tab.pinned ? 'Unpin Tab' : 'Pin Tab',
      click: () => {
        if (tab.pinned) tm.unpin(tab.id)
        else tm.pin(tab.id)
        // Explicitly broadcast updated tabs to renderer as separate arguments
        const state = tm.getState()
        win.webContents.send('tabs:update', state.tabs, state.activeId)
      }
    })
  )
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(
    new MenuItem({
      label: 'Duplicate Tab',
      click: () => { tm.duplicate(tab.id) }
    })
  )
  menu.append(
    new MenuItem({
      label: tab.muted ? 'Unmute Tab' : 'Mute Tab',
      click: () => { tm.toggleMute(tab.id) }
    })
  )
  menu.append(
    new MenuItem({
      label: 'Snooze tab',
      enabled: !tab.snoozed && tab.id !== tm.getActiveId(),
      click: () => { void getSnoozer()?.snooze(tab.id, 'manual') }
    })
  )
  menu.append(
    new MenuItem({
      label: 'Snooze other tabs',
      click: () => { void getSnoozer()?.snoozeOthers(tab.id) }
    })
  )
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(
    new MenuItem({
      label: 'Close Tab',
      click: () => { tm.close(tab.id) }
    })
  )
  menu.popup({ window: win })
})

ipcMain.handle('tabs:setZoom', (e, id: number, factor: number) =>
  getTabsForEvent(e)?.setZoom(id, factor))
ipcMain.handle('tabs:zoomIn', (e, id: number) => getTabsForEvent(e)?.zoomIn(id))
ipcMain.handle('tabs:zoomOut', (e, id: number) => getTabsForEvent(e)?.zoomOut(id))
ipcMain.handle('tabs:zoomReset', (e, id: number) => getTabsForEvent(e)?.zoomReset(id))
ipcMain.handle('tabs:print', (e, id: number) => getTabsForEvent(e)?.print(id))
ipcMain.handle('tabs:pip', (e, id: number) => getTabsForEvent(e)?.pictureInPicture(id))
ipcMain.handle('tabs:sendMessage', (e, tabId: number, channel: string, ...args: unknown[]) => {
  const tm = getTabsForEvent(e)
  if (!tm) return
  const wcId = tm.getWebContentsId(tabId)
  if (wcId === null) return
  const { webContents } = require('electron')
  const wc = webContents.fromId(wcId)
  if (wc) wc.send(channel, ...args)
})

ipcMain.handle('tabs:reloadAll', (e) => {
  const tm = getTabsForEvent(e); if (!tm) return
  for (const [, rec] of (tm as unknown as { records: Map<number, { view: { webContents: { reload: () => void } } | null }> }).records) {
    if (rec.view) try { rec.view.webContents.reload() } catch {}
  }
})

ipcMain.handle('tabs:readerExtract', async (e, id: number) => {
  const tm = getTabsForEvent(e); if (!tm) return null
  const wcId = tm.getWebContentsId(id); if (wcId === null) return null
  const { webContents } = require('electron')
  const wc = webContents.fromId(wcId); if (!wc) return null
  return getReaderPayload(wc)
})

ipcMain.handle('tabs:screenshot', async (e, id: number, action: 'save' | 'copy') => {
  const tm = getTabsForEvent(e); if (!tm) return null
  const wcId = tm.getWebContentsId(id); if (wcId === null) return null
  const win = BrowserWindow.fromWebContents(e.sender); if (!win) return null
  const dataUrl = await captureTab({ win, webContentsId: wcId })
  if (!dataUrl) return null
  if (action === 'copy') { copyScreenshotToClipboard(dataUrl); return 'clipboard' }
  return await saveScreenshot(win, dataUrl, 'screenshot')
})

// STAGE 8.5: zoom-wheel via proper IPC (replaces console-message hack)
ipcMain.on('tab:wheelZoom', (e, direction: 'in' | 'out') => {
  const tm = getTabsForEvent(e as unknown as Electron.IpcMainInvokeEvent)
  if (!tm) return
  const wcId = e.sender.id
  const allTabs = (tm as unknown as { records: Map<number, { view: { webContents: { id: number } } | null }> }).records
  for (const [tabId, rec] of allTabs.entries()) {
    if (rec.view?.webContents.id === wcId) {
      if (direction === 'in') tm.zoomIn(tabId)
      else tm.zoomOut(tabId)
      return
    }
  }
})

// STAGE 10C.4 — Split View IPC
ipcMain.handle('split:open', (e, tabId: number, url: string) => {
  const tm = getTabsForEvent(e)
  const sm = getSplitManager(e)
  if (!tm || !sm) return
  sm.openSplit(tm, tabId, url)
})
ipcMain.handle('split:close', (e, tabId: number) => {
  const tm = getTabsForEvent(e)
  const sm = getSplitManager(e)
  if (!tm || !sm) return
  sm.closeSplitForTabAndEmit(tm, tabId)
})
ipcMain.handle('split:isSplit', (e, tabId: number) => {
  const sm = getSplitManager(e)
  return sm?.isSplit(tabId) ?? false
})
ipcMain.handle('split:getState', (e, tabId: number) => {
  const sm = getSplitManager(e)
  const state = sm?.getSplit(tabId)
  if (!state) return null
  return {
    tabId: state.tabId,
    splitUrl: state.splitUrl,
    focusedPane: state.focusedPane,
    ratio: state.ratio
  }
})
ipcMain.handle('split:setFocusedPane', (e, tabId: number, pane: 'primary' | 'split') => {
  const sm = getSplitManager(e)
  sm?.setFocusedPane(tabId, pane)
})
ipcMain.handle('split:toggleFocusedPane', (e, tabId: number) => {
  const sm = getSplitManager(e)
  sm?.toggleFocusedPane(tabId)
})
ipcMain.handle('split:navigateFocused', (e, tabId: number, url: string) => {
  const tm = getTabsForEvent(e)
  const sm = getSplitManager(e)
  if (!tm || !sm) return
  sm.navigateFocusedPane(tm, tabId, url)
})
ipcMain.handle('split:navigateNonFocused', (e, tabId: number, url: string) => {
  const tm = getTabsForEvent(e)
  const sm = getSplitManager(e)
  if (!tm || !sm) return
  sm.navigateNonFocusedPane(tm, tabId, url)
})
ipcMain.handle('split:navigateSplitPane', (e, tabId: number, url: string) => {
  const sm = getSplitManager(e)
  sm?.navigateSplitPane(tabId, url)
})
ipcMain.handle('split:setRatio', (e, tabId: number, ratio: number) => {
  const sm = getSplitManager(e)
  sm?.setRatio(tabId, ratio)
})
ipcMain.handle('split:getAll', (e) => {
  const sm = getSplitManager(e)
  if (!sm) return []
  const tm = getTabsForEvent(e)
  if (!tm) return []
  const result: Array<{ tabId: number; splitUrl: string; focusedPane: 'primary' | 'split'; ratio: number }> = []
  for (const id of (tm as unknown as { order: number[] }).order) {
    const state = sm.getSplit(id)
    if (state) {
      result.push({
        tabId: state.tabId,
        splitUrl: state.splitUrl,
        focusedPane: state.focusedPane,
        ratio: state.ratio
      })
    }
  }
  return result
})

// ── Reader Mode IPC ──────────────────────────────────────────

ipcMain.handle('reader:probe', async (_e, tabId: string | number) => {
  try {
    const tab = tabs?.getTab?.(tabId)
    if (!tab?.view) return { readerable: false }
    const url = tab.view.webContents.getURL()
    if (!url || url.startsWith('aura://') || url.startsWith('about:')) {
      return { readerable: false }
    }
    const html = await tab.view.webContents.executeJavaScript(
      'document.documentElement.outerHTML',
      true
    )
    const result = probeReaderable(html, url)
    readerProbeCache.set(tabId, result.readerable)
    return result
  } catch {
    return { readerable: false }
  }
})

ipcMain.handle('reader:enter', async (_e, tabId: string | number) => {
  try {
    const tab = tabs?.getTab?.(tabId)
    if (!tab?.view) return { ok: false, error: 'no tab' }
    const sourceUrl = tab.view.webContents.getURL()
    if (!sourceUrl || sourceUrl.startsWith('aura://')) {
      return { ok: false, error: 'not an article page' }
    }
    const html = await tab.view.webContents.executeJavaScript(
      'document.documentElement.outerHTML',
      true
    )
    const article = extractArticle(html, sourceUrl)
    if (!article) return { ok: false, error: 'extraction failed' }
    readerCache.set(tabId, article)
    return { ok: true, article }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
})

ipcMain.handle('reader:exit', async (_e, tabId: string | number) => {
  const article = readerCache.get(tabId)
  if (article) {
    tabs?.navigate?.(tabId, article.sourceUrl)
    readerCache.delete(tabId)
    readerProbeCache.delete(tabId)
  } else {
    const tab = tabs?.getTab?.(tabId)
    if (tab?.view?.webContents.canGoBack()) {
      tab.view.webContents.goBack()
    }
  }
  return { ok: true }
})

ipcMain.handle('reader:getCurrent', async (_e, tabId: string | number) => {
  return readerCache.get(tabId) ?? null
})

ipcMain.handle('reader:isActive', (_e, tabId: string | number) => {
  const article = readerCache.get(tabId)
  return !!article
})

// ---- Translation IPC ----
ipcMain.handle('translation:translate-page', async (e, config?: { targetLang?: string; provider?: string }) => {
  const win = BrowserWindow.fromWebContents(e.sender) || BrowserWindow.getFocusedWindow()
  if (!win) return { success: false, nodeCount: 0, error: 'No window' }
  const tm = getTabsForEvent(e)
  if (!tm) return { success: false, nodeCount: 0, error: 'No tab manager' }
  const activeId = tm.getActiveId()
  if (activeId === null) return { success: false, nodeCount: 0, error: 'No active tab' }
  const tab = tm.getTab?.(activeId)
  if (!tab?.view?.webContents || tab.view.webContents.isDestroyed()) {
    return { success: false, nodeCount: 0, error: 'No active tab webContents' }
  }
  const targetLang = config?.targetLang || 'en'
  const provider = config?.provider || 'google'
  try {
    const result = await tab.view.webContents.executeJavaScript(`
      (async () => {
        try {
          const target = ${JSON.stringify(targetLang)};
          const SENTINEL = '|||AURA|||';
          const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA','INPUT','SVG','CANVAS','VIDEO','AUDIO','KBD','SAMP','IFRAME']);
          const nodes = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
              if (!n.textContent || !n.textContent.trim()) return NodeFilter.FILTER_REJECT;
              const p = n.parentElement;
              if (!p || SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT;
              if (p.closest('[translate="no"], .notranslate, .aura-translated')) return NodeFilter.FILTER_REJECT;
              if (!/\\S/u.test(n.textContent)) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            }
          });
          let node;
          while (node = walker.nextNode()) {
            const t = node.textContent.trim();
            if (t.length >= 1 && t.length < 5000) nodes.push(node);
          }
          if (nodes.length === 0) return { success: true, nodeCount: 0 };
          if (!window.__auraOrigMap) { try { Object.defineProperty(window, '__auraOrigMap', { value: new Map(), writable: true, configurable: true }); } catch (e) { window.__auraOrigMap = new Map(); } }
          nodes.forEach(n => window.__auraOrigMap.set(n, n.textContent));
          const batchSize = 40;
          let translated = 0;
          for (let i = 0; i < nodes.length; i += batchSize) {
            const batch = nodes.slice(i, i + batchSize);
            const joined = batch.map(n => n.textContent.trim()).join(SENTINEL);
            const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + target + '&dt=t&q=' + encodeURIComponent(joined);
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            const text = (data && data[0]) ? data[0].map(s => s[0]).join('') : null;
            if (!text) continue;
            const parts = text.split(SENTINEL);
            batch.forEach((n, idx) => {
              if (parts[idx] && parts[idx].trim()) {
                n.textContent = parts[idx].trim();
                if (n.parentElement) n.parentElement.classList.add('aura-translated');
                translated++;
              }
            });
          }
          return { success: true, nodeCount: translated };
        } catch (err) {
          return { success: false, nodeCount: 0, error: String(err) };
        }
      })()
    `)
    return result || { success: false, nodeCount: 0, error: 'No result' }
  } catch (err) {
    return { success: false, nodeCount: 0, error: String(err) }
  }
})

ipcMain.handle('translation:revert', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender) || BrowserWindow.getFocusedWindow()
  if (!win) return
  const tm = getTabsForEvent(e)
  if (!tm) return
  const activeId = tm.getActiveId()
  if (activeId === null) return
  const tab = tm.getTab?.(activeId)
  if (!tab?.view?.webContents || tab.view.webContents.isDestroyed()) return
  try {
    await tab.view.webContents.executeJavaScript(`
      (function() {
        if (window.__auraOrigMap) {
          for (const [node, orig] of window.__auraOrigMap) {
            if (node.parentNode) {
              node.textContent = orig;
              if (node.parentElement) node.parentElement.classList.remove('aura-translated');
            }
          }
          window.__auraOrigMap.clear();
        }
      })()
    `)
  } catch {}
})

// One-shot reset for Google's flagged-session memory: clears accounts.google.com
// cookies + localStorage so login is re-evaluated with the spoofed headers.
ipcMain.handle('auth:clear-google-data', async () => {
  try {
    await session.defaultSession.clearStorageData({
      origin: 'https://accounts.google.com',
      storages: ['cookies', 'localstorage'],
    })
    return true
  } catch (err) {
    console.error('[auth] clear-google-data failed:', err)
    return false
  }
})

ipcMain.handle('layout:setSidebarWidth', (e, width: number) =>
  getTabsForEvent(e)?.setSidebarWidth(width))
ipcMain.handle('layout:setChromeHeight', (e, height: number) =>
  getTabsForEvent(e)?.setChromeHeight(height))
ipcMain.handle('layout:hideView', (e) => getTabsForEvent(e)?.hideActiveView())
ipcMain.handle('layout:showView', (e) => getTabsForEvent(e)?.showActiveView())

ipcMain.handle('app:platform', () => process.platform)

ipcMain.handle('suggest:query', (_e, query: string) => {
  const q = query.trim()
  if (!q) return recentHistory(6)
  return searchHistory(q, 6)
})
ipcMain.handle('suggest:preconnect', (_e, url: string) => preconnect(url))

ipcMain.handle('privacy:stats', () => getPrivacyStats())
ipcMain.handle('privacy:isPhishing', (_e, hostname: string) => isPhishingDomain(hostname))
ipcMain.handle('security:allowInsecure', (_e, host: string) => allowInsecureHost(host))

ipcMain.handle('permission:respond', (_e, id: number, granted: boolean, remember: boolean) => {
  respondToPermission(id, granted, remember)
})

ipcMain.handle('favicons:fetch', (_e, url: string) => fetchFavicon(url))

ipcMain.handle('ninja:launch', () => ninja?.launch())
ipcMain.handle('ninja:launchWithUrl', (_e, url: string) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return
  return ninja?.launch(url)
})
ipcMain.handle('ninja:isPrivate', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || !ninja) return false
  const ninjaAny = ninja as unknown as { isNinjaWindow?: (arg: BrowserWindow | number) => boolean }
  if (typeof ninjaAny.isNinjaWindow === 'function') {
    try { return ninjaAny.isNinjaWindow(win.id) } catch {}
    try { return ninjaAny.isNinjaWindow(win) } catch {}
  }
  return false
})

ipcMain.handle('tabs:reload-active', (event) => {
  let tm = getTabsForEvent(event)
  if (!tm && mainWindow && !mainWindow.isDestroyed() && tabs) {
    // Sender may be the floating Shields popover — use the main window's tabs.
    tm = tabs
  }
  if (!tm) return
  const activeId = tm.getActiveId()
  if (!activeId) return
  const tab = tm.getTab(activeId)
  if (tab?.view?.webContents) tab.view.webContents.reload()
})

ipcMain.handle('history:all', (_e, limit?: number) => allHistory(limit ?? 500))
ipcMain.handle('history:search', (_e, q: string) => searchHistory(q, 50))
ipcMain.handle('history:delete', (_e, url: string) => deleteHistoryEntry(url))
ipcMain.handle('history:clear', () => clearHistory())
ipcMain.handle('history:count', () => historyCount())

ipcMain.handle('bookmarks:list', (_e, folderId?: number | null) =>
  listBookmarks(folderId ?? null))
ipcMain.handle('bookmarks:add', (_e, url: string, title: string, folderId?: number | null) =>
  addBookmark(url, title, folderId ?? null))
ipcMain.handle('bookmarks:delete', (_e, id: number) => deleteBookmark(id))
ipcMain.handle('bookmarks:update',
  (_e, id: number, changes: { url?: string; title?: string; folderId?: number | null }) =>
    updateBookmark(id, changes))
ipcMain.handle('bookmarks:isBookmarked', (_e, url: string) => isBookmarked(url))
ipcMain.handle('bookmarks:listFolders', () => listFolders())
ipcMain.handle('bookmarks:addFolder', (_e, name: string) => addFolder(name))
ipcMain.handle('bookmarks:deleteFolder', (_e, id: number) => deleteFolder(id))
ipcMain.handle('bookmarks:listBar', () => listBarBookmarks())
ipcMain.handle('bookmarks:reorder', (_e, orderedIds: number[]) => reorderBookmarks(orderedIds))
ipcMain.handle('bookmarks:addSeparator', (_e, folderId?: number | null) =>
  addSeparator(folderId ?? null))

ipcMain.handle('downloads:list', () => listDownloads())
ipcMain.handle('downloads:cancel', (_e, id: number) => cancelDownload(id))
ipcMain.handle('downloads:open', (_e, savePath: string) => openDownloadedFile(savePath))
ipcMain.handle('downloads:reveal', (_e, savePath: string) => revealDownloadedFile(savePath))
ipcMain.handle('downloads:deleteRecord', (_e, id: number) => deleteDownloadRecord(id))
ipcMain.handle('downloads:clearCompleted', () => clearCompletedDownloads())
ipcMain.handle('downloads:pause', (_e, id: number) => pauseDownload(id))
ipcMain.handle('downloads:resume', (_e, id: number) => resumeDownload(id))
ipcMain.handle('downloads:copyUrl', (_e, id: number) => {
  const rec = getDownloadRecord(id)
  if (rec) clipboard.writeText(rec.url)
})
ipcMain.handle('downloads:retry', (e, id: number) => {
  const rec = getDownloadRecord(id)
  if (rec) e.sender.downloadURL(rec.url)
})

ipcMain.handle('readingList:add', (_e, url: string, title: string, excerpt?: string) =>
  addReadingItem(url, title, excerpt))
ipcMain.handle('readingList:delete', (_e, id: number) => deleteReadingItem(id))
ipcMain.handle('readingList:markRead', (_e, id: number, read: boolean) => markRead(id, read))
ipcMain.handle('readingList:list', (_e, filter?: 'all' | 'unread' | 'read') =>
  listReadingItems(filter ?? 'all'))
ipcMain.handle('readingList:clearRead', () => clearRead())

ipcMain.handle('boosts:add', (_e, host: string, name: string, css: string) =>
  addBoost(host, name, css))
ipcMain.handle('boosts:update',
  (_e, id: number, changes: { host?: string; name?: string; css?: string; enabled?: boolean }) =>
    updateBoost(id, changes))
ipcMain.handle('boosts:delete', (_e, id: number) => deleteBoost(id))
ipcMain.handle('boosts:list', () => listBoosts())

function broadcastGroupChange(): void {
  BrowserWindow.getAllWindows().forEach(w => {
    if (!w.isDestroyed()) w.webContents.send('groups:changed')
  })
}

ipcMain.handle('groups:create', (_e, name: string, color: string) => {
  const id = createGroup(name, color)
  broadcastGroupChange()
  return id
})
ipcMain.handle('groups:delete', (_e, id: string) => {
  deleteGroup(id)
  broadcastGroupChange()
})
ipcMain.handle('groups:rename', (_e, id: string, name: string) => {
  renameGroup(id, name)
  broadcastGroupChange()
})
ipcMain.handle('groups:setColor', (_e, id: string, color: string) => {
  setGroupColor(id, color)
  broadcastGroupChange()
})
ipcMain.handle('groups:toggleCollapsed', (_e, id: string) => {
  toggleCollapsed(id)
  broadcastGroupChange()
})
ipcMain.handle('groups:addTab', (_e, groupId: string, tabId: number) => {
  addTabToGroup(groupId, tabId)
  broadcastGroupChange()
})
ipcMain.handle('groups:removeTab', (_e, tabId: number) => {
  removeTabFromAnyGroup(tabId)
  broadcastGroupChange()
})
ipcMain.handle('groups:list', () => listGroups())
ipcMain.handle('groups:snapshot', () => snapshotGroups())

// ====================================================================
// STAGE 10A — Settings
// ====================================================================

ipcMain.handle('settings:getAll', () => getAllSettings())
ipcMain.handle('settings:get', (_e, key: string) => getSetting(key as keyof ReturnType<typeof getAllSettings>))
ipcMain.handle('settings:set', (_e, key: string, value: unknown) => {
  setSetting(key as keyof ReturnType<typeof getAllSettings>, value)
  try {
    broadcastSettingChange(key)
  } catch (err) {
    console.warn('[Aura/settings] broadcastSettingChange failed for', key, err)
  }
  if (key === 'a11yDefaultZoom') {
    applyZoomToAllTabs()
  }
  if (key === 'a11yMinFontSize') {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('a11y:reloadHint', 'minFontSize')
    }
  }
  if (key === 'themeMode' || key === 'theme') handleThemeSettingChange()
  if (key === 'systemStartOnLogin') applyStartOnLogin()
  if (key === 'systemProxyMode') applyProxyMode()
  if (key === 'systemRunInBackground') applyBackgroundMode(mainWindow!, iconPath)
  if (key === 'perfEnergySaver') applyEnergySaverToAll()
})
ipcMain.handle('settings:reset', () => resetSettings())

ipcMain.handle('browser:setDefault', () => setAsDefaultBrowser())
ipcMain.handle('browser:isDefault', () => isDefaultBrowser())

ipcMain.handle('theme:getResolved', () => getResolvedTheme())

ipcMain.handle('app:openUserDataFolder', () => {
  shell.openPath(app.getPath('userData'))
})
ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:relaunch', () => {
  app.relaunch()
  app.exit(0)
})

registerAboutIPC()
registerDefaultBrowserIPC()
registerResetIPC()
registerProfileDataIPC()
registerTabContextMenuIPC()
registerClearBrowsingDataIPC()
registerAutofillIPC()
registerTranslatorIPC()
registerImageSaverIPC()
registerTranslatorWindowIPC()
registerImageSaverWindowIPC()
registerPerfHudWindowIPC()

ipcMain.on('videoDl:request', async (_e, { url, filename }: { url: string; filename: string }) => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return
  const win = BrowserWindow.getFocusedWindow()
  try {
    const buf = await fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.arrayBuffer()
    }).then((ab) => Buffer.from(ab))
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: `${filename}.mp4`,
      filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv'] }]
    })
    if (result.canceled || !result.filePath) return
    await writeFile(result.filePath, buf)
    if (win) win.webContents.send('videoDl:complete', { success: true, path: result.filePath })
  } catch (err) {
    console.error('[videoDl]', err)
    if (win) win.webContents.send('videoDl:complete', { success: false, error: (err as Error).message })
  }
})

ipcMain.on('autofill:formSubmitted', (e, captured) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) maybePromptSave(win, captured)
})

// ── PASSWORD MANAGER IPC HANDLERS ─────────────────────────────────────────────

ipcMain.handle('passwords:save', (_e, origin: string, username: string, password: string, title: string) => {
  if (isBlocklisted(origin)) {
    return { ok: false, reason: 'blocklisted' }
  }
  try {
    return { ok: true, id: saveCredential(origin, username, password, title) }
  } catch (err) {
    if (err instanceof EncryptionUnavailableError) {
      return { ok: false, reason: 'encryption-unavailable' }
    }
    return { ok: false, reason: 'invalid-origin' }
  }
})

ipcMain.handle('passwords:getForOrigin', (_e, origin: string) => {
  return getCredentialsForOrigin(origin)
})

ipcMain.handle('passwords:getAll', () => {
  return getAllCredentials()
})

ipcMain.handle('passwords:delete', (_e, id: number) => {
  deleteCredential(id)
})

ipcMain.handle('passwords:update', (_e, id: number, username: string, password: string) => {
  updateCredential(id, username, password)
})

ipcMain.handle('passwords:markUsed', (_e, id: number) => {
  markCredentialUsed(id)
})

ipcMain.handle('passwords:search', (_e, query: string) => {
  return searchCredentials(query)
})

ipcMain.handle('passwords:checkDuplicate', (_e, origin: string, username: string) => {
  return checkDuplicate(origin, username)
})

ipcMain.handle('passwords:generate', (_e, length?: number) => {
  return generateSecurePassword(length)
})

ipcMain.handle('passwords:addToBlocklist', (_e, origin: string) => {
  addToBlocklist(origin)
})

ipcMain.handle('passwords:removeFromBlocklist', (_e, origin: string) => {
  removeFromBlocklist(origin)
})

ipcMain.handle('passwords:health', () => {
  return analyzePasswordHealth()
})

ipcMain.handle('passwords:unlockVault', async () => {
  if (
    process.platform === 'darwin' &&
    typeof systemPreferences.canPromptTouchID === 'function' &&
    systemPreferences.canPromptTouchID()
  ) {
    try {
      await systemPreferences.promptTouchID('reveal saved passwords')
      return true
    } catch {
      return false
    }
  }
  return true
})

ipcMain.handle('passwords:fillIntoPage', async (_e, tabId: number, credentialId: number) => {
  const tabsManager = getTabsForEvent(_e)
  const record = tabsManager?.getTab(tabId)
  if (!record) return { ok: false, reason: 'no-such-tab' }

  if (tabsManager.getActiveId() !== tabId) {
    return { ok: false, reason: 'tab-not-active' }
  }

  const cred = getCredentialById(credentialId)
  if (!cred) return { ok: false, reason: 'no-such-credential' }

  let liveOrigin: string
  try {
    const view = record.view
    if (!view) return { ok: false, reason: 'no-webview' }
    liveOrigin = new URL(view.webContents.getURL()).origin
  } catch {
    return { ok: false, reason: 'invalid-live-url' }
  }

  if (liveOrigin !== cred.origin) {
    return { ok: false, reason: 'origin-mismatch' }
  }

  await record.view.webContents.executeJavaScript(`
    (function() {
      const pw = document.querySelector('input[type="password"]:not([disabled])');
      const un =
        document.querySelector('input[type="email"]:not([disabled])') ||
        document.querySelector('input[type="text"]:not([disabled])');
      function setNativeValue(el, value) {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (un) setNativeValue(un, ${JSON.stringify(cred.username)});
      if (pw) setNativeValue(pw, ${JSON.stringify(cred.password)});
    })()
  `)

  markCredentialUsed(credentialId)
  return { ok: true }
})

ipcMain.on('passwords:formSubmitted', (e, data: {
  origin: string
  username: string
  password: string
  title: string
  frameIsMain: boolean
}) => {
  if (!data.frameIsMain) return
  if (!data.password) return
  if (isBlocklisted(data.origin)) return

  const isDuplicate = checkDuplicate(data.origin, data.username)
  const win = BrowserWindow.fromWebContents(e.sender) ||
    BrowserWindow.getAllWindows().find(w =>
      w.webContents.id === (e.sender as any).hostWebContents?.id
    )
  if (!win || win.isDestroyed()) return
  win.webContents.send('passwords:savePrompt', { ...data, isDuplicate })
})

ipcMain.on('passwords:pageHasLoginForm', (e, data: { origin: string }) => {
  if (isBlocklisted(data.origin)) return
  const creds = getCredentialsForOrigin(data.origin)
  if (creds.length === 0) return
  const win = BrowserWindow.fromWebContents(e.sender) ||
    BrowserWindow.getAllWindows().find(w =>
      w.webContents.id === (e.sender as any).hostWebContents?.id
    )
  if (!win || win.isDestroyed()) return
  win.webContents.send('passwords:fillAvailable', {
    origin: data.origin,
    count: creds.length
  })
})

app.whenReady().then(() => { void createWindow() })

function forceShutdownMediaFlush() {
  for (const win of BrowserWindow.getAllWindows()) {
    const ninjaAny = ninja as unknown as {
      isNinjaWindow?: (id: number) => boolean
      getManager?: (id: number) => TabManager | null
    }
    if (ninjaAny.isNinjaWindow?.(win.id)) continue
    const tm = win === mainWindow ? tabs : ninjaAny.getManager?.(win.id)
    if (tm && !tm.isPrivate) {
      try { tm.forceFlushSession?.() } catch {}
    }
  }
  forceFlushMediaResume()
}

app.on('before-quit', (event) => {
  try { forceShutdownMediaFlush() } catch {}
  try { flushBlockedCounts() } catch {}
  maybeClearOnQuit()
})

app.on('will-quit', () => {
  try { forceFlushMediaResume() } catch {}
  try { cleanupKeyboard() } catch {}
  globalShortcut.unregisterAll()
})

function handleShutdownSignal() {
  try { forceFlushMediaResume() } catch {}
  closeDb()
  app.quit()
  process.exit(0)
}

process.on('SIGTERM', () => { handleShutdownSignal() })
process.on('SIGINT', () => { handleShutdownSignal() })
process.on('SIGHUP', () => { handleShutdownSignal() })

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow()
})
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (url.startsWith('javascript:') || url.startsWith('data:text/html')) {
      event.preventDefault()
    }
  })

  // AUTOMATICALLY HOOK EVERY SESSION: install the single onBeforeRequest
  // handler. This covers tabs, split panes, ninja windows, etc.
  // Popup/cosmetic guards are handled per-tab via registerTabWebContents.
  try {
    installBlockerOnSession(contents.session)
  } catch {}
})

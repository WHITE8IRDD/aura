import { app, BrowserWindow, ipcMain, session, shell, dialog, nativeImage, globalShortcut } from 'electron'
import { join } from 'path'
import { TabManager } from './tabs'
import { registerInputContextMenuIPC } from './inputContextMenu'
import { registerMediaHubMenuIPC } from './mediaHubMenu'
import { registerMediaHubWindowIPC } from './mediaHubWindow'
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
  setupDefaultSessionBlocking,
  installBlocker,
  initBlocker,
  setSiteShields,
  areShieldsEnabledFor
} from './blocker'
import { setupHttpsOnly, allowInsecureHost } from './security/https-only'
import { setupAntiFingerprintFlags, setupSessionFingerprintDefenses } from './security/fingerprint'
import { setupPermissionPrompts, respondToPermission } from './security/permissions'
import { isPhishingDomain } from './blocker/phishing'
import { fetchFavicon } from './favicons'
import { setupMediaWatcher, registerMediaControllerIPC } from './mediaController'
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
  cancelDownload, openDownloadedFile, revealDownloadedFile,
  deleteDownloadRecord, clearCompletedDownloads
} from './downloads'
import { captureTab, saveScreenshot, copyScreenshotToClipboard } from './screenshot'
import { getReaderPayload } from './reader'
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
import { writeFile } from 'fs/promises'

// STAGE 10A-FIX: apply startup flags that must run before app.whenReady()
applyStartupFlags()

// ============================================================
// STAGE 8.5 — PERFORMANCE HARDENING
// Enable hardware video decode + GPU acceleration BEFORE app.ready
// ============================================================

app.commandLine.appendSwitch('enable-features', [
  'VaapiVideoDecoder',
  'VaapiVideoEncoder',
  'PlatformHEVCDecoderSupport',
  'CanvasOopRasterization',
  'AcceleratedVideoDecodeLinuxGL',
  'UseSkiaRenderer',
  'UseChromeOSDirectVideoDecoder',
  'WebContentsForceDark'
].join(','))

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode')
app.commandLine.appendSwitch('enable-accelerated-2d-canvas')

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

app.commandLine.appendSwitch('shared-array-buffer-allowed-for-electron')

app.commandLine.appendSwitch('ignore-gpu-blocklist')

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('use-angle', 'd3d11')
  app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder')
}

if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('enable-features', 'VideoToolboxVp9Decoding')
}

setupAntiFingerprintFlags()

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

app.setName('Aura')

const CHROME_HEIGHT = 84
const SIDEBAR_WIDTH_DEFAULT = 52

function resolveIcon(name: string): string {
  const devPath = join(__dirname, '../../resources/icons', name)
  if (require('fs').existsSync(devPath)) return devPath
  return join(app.isPackaged ? process.resourcesPath : __dirname, 'icons', name)
}

let mainWindow: BrowserWindow | null = null
let tabs: TabManager | null = null
let ninja: NinjaWindowManager | null = null
let iconPath = ''

const startupReady = app.whenReady().then(async () => {
  console.log('[Aura] Opening database…')
  getDb()
  applyHardwareAccelLater()
  applyForceDarkFlag()
  console.log('[Aura/settings] Loaded settings')
  console.log('[Aura] Pre-initializing blocker engine…')
  await setupDefaultSessionBlocking()
  setupHttpsOnly(session.defaultSession)
  setupSessionFingerprintDefenses(session.defaultSession)
  setupPermissionPrompts(session.defaultSession)
  registerSession(session.defaultSession)
  initLanguages()
  setupDownloads()
  registerDownloadsSettingsIPC()
  startRetentionScheduler()
  setupMediaWatcher()
  registerMediaControllerIPC()
  registerMediaHubMenuIPC()
  registerMediaHubWindowIPC()
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
    backgroundColor: '#0a0a0f',
    show: false,
    title: 'Aura',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 14 } : undefined,
    frame: process.platform === 'darwin',
    ...(process.platform === 'win32' && { thickFrame: true }),
    icon: resolveIcon('icon-256.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('page-title-updated', (e) => e.preventDefault())
  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.on('context-menu', (event, _params) => {
    event.preventDefault()
  })

  tabs = new TabManager(mainWindow, CHROME_HEIGHT, false)
  tabs.setSidebarWidth(SIDEBAR_WIDTH_DEFAULT)

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

// ---- Tab IPC ----
ipcMain.handle('tabs:create', (e, url?: string) => getTabsForEvent(e)?.create(url))
ipcMain.handle('tabs:close', (e, id: number) => getTabsForEvent(e)?.close(id))
ipcMain.handle('tabs:activate', (e, id: number) => getTabsForEvent(e)?.activate(id))
ipcMain.handle('tabs:navigate', (e, id: number, url: string) =>
  getTabsForEvent(e)?.navigate(id, url))
ipcMain.handle('tabs:goBack', (e, id: number) => getTabsForEvent(e)?.goBack(id))
ipcMain.handle('tabs:goForward', (e, id: number) => getTabsForEvent(e)?.goForward(id))
ipcMain.handle('tabs:reload', (e, id: number) => getTabsForEvent(e)?.reload(id))
ipcMain.handle('tabs:getState', (e) => getTabsForEvent(e)?.getState())
ipcMain.handle('tabs:reorder', (e, fromId: number, toIndex: number) =>
  getTabsForEvent(e)?.reorder(fromId, toIndex))
ipcMain.handle('tabs:pin', (e, id: number) => getTabsForEvent(e)?.pin(id))
ipcMain.handle('tabs:unpin', (e, id: number) => getTabsForEvent(e)?.unpin(id))
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

ipcMain.handle('shields:toggle', (_e, hostname: string) => {
  const wasEnabled = areShieldsEnabledFor(hostname)
  return setSiteShields(hostname, !wasEnabled)
})
ipcMain.handle('shields:isEnabled', (_e, hostname: string) => areShieldsEnabledFor(hostname))

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

ipcMain.handle('groups:create', (_e, name: string, color: string) => createGroup(name, color))
ipcMain.handle('groups:delete', (_e, id: string) => deleteGroup(id))
ipcMain.handle('groups:rename', (_e, id: string, name: string) => renameGroup(id, name))
ipcMain.handle('groups:setColor', (_e, id: string, color: string) => setGroupColor(id, color))
ipcMain.handle('groups:toggleCollapsed', (_e, id: string) => toggleCollapsed(id))
ipcMain.handle('groups:addTab', (_e, groupId: string, tabId: number) => addTabToGroup(groupId, tabId))
ipcMain.handle('groups:removeTab', (_e, tabId: number) => removeTabFromAnyGroup(tabId))
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

app.whenReady().then(() => { void createWindow() })

app.on('before-quit', () => {
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
  maybeClearOnQuit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

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
})

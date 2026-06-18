import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'path'
import { TabManager } from './tabs'
import { registerWindowControls, wireMaximizeEvents } from './window-controls'
import { registerShortcuts } from './shortcuts'
import { search as searchHistory, recent as recentHistory } from './history'
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

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('enable-accelerated-video-decode')

// IMPORTANT: For Widevine DRM video playback (YouTube, Netflix, Hulu)
// to work, you need to either:
//   1. Use @castlabs/electron-releases instead of stock electron
//      (replace "electron" with "@castlabs/electron-releases" in package.json)
//   2. Or accept that DRM-protected video won't play in Aura
// Without Widevine, YouTube's player shows a blank white screen.
// Documented in SECURITY.md as a known v1 limitation.

setupAntiFingerprintFlags()

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

app.setName('Aura')

const CHROME_HEIGHT = 84
const SIDEBAR_WIDTH_DEFAULT = 52

let mainWindow: BrowserWindow | null = null
let tabs: TabManager | null = null
let ninja: NinjaWindowManager | null = null

const blockerReady = app.whenReady().then(async () => {
  console.log('[Aura] Pre-initializing blocker engine…')
  await setupDefaultSessionBlocking()
  setupHttpsOnly(session.defaultSession)
  setupSessionFingerprintDefenses(session.defaultSession)
  setupPermissionPrompts(session.defaultSession)
  console.log('[Aura] Blocker engine ready')
})

async function createWindow(): Promise<void> {
  await blockerReady

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('page-title-updated', (e) => e.preventDefault())
  mainWindow.once('ready-to-show', () => mainWindow?.show())

  tabs = new TabManager(mainWindow, CHROME_HEIGHT, false)
  tabs.setSidebarWidth(SIDEBAR_WIDTH_DEFAULT)

  ninja = new NinjaWindowManager(CHROME_HEIGHT, SIDEBAR_WIDTH_DEFAULT)

  registerWindowControls(() => BrowserWindow.getFocusedWindow() ?? mainWindow)
  wireMaximizeEvents(mainWindow)
  registerShortcuts(mainWindow, tabs)

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.once('did-finish-load', () => {
    tabs?.create('aura://newtab')
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

ipcMain.handle('tabs:create', (e, url?: string) => getTabsForEvent(e)?.create(url))
ipcMain.handle('tabs:close', (e, id: number) => getTabsForEvent(e)?.close(id))
ipcMain.handle('tabs:activate', (e, id: number) => getTabsForEvent(e)?.activate(id))
ipcMain.handle('tabs:navigate', (e, id: number, url: string) =>
  getTabsForEvent(e)?.navigate(id, url)
)
ipcMain.handle('tabs:goBack', (e, id: number) => getTabsForEvent(e)?.goBack(id))
ipcMain.handle('tabs:goForward', (e, id: number) => getTabsForEvent(e)?.goForward(id))
ipcMain.handle('tabs:reload', (e, id: number) => getTabsForEvent(e)?.reload(id))
ipcMain.handle('tabs:getState', (e) => getTabsForEvent(e)?.getState())
ipcMain.handle('tabs:reorder', (e, fromId: number, toIndex: number) =>
  getTabsForEvent(e)?.reorder(fromId, toIndex)
)
ipcMain.handle('layout:setSidebarWidth', (e, width: number) =>
  getTabsForEvent(e)?.setSidebarWidth(width)
)

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
ipcMain.handle('ninja:isPrivate', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || !ninja) return false
  const ninjaAny = ninja as unknown as {
    isNinjaWindow?: (arg: BrowserWindow | number) => boolean
  }
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

app.whenReady().then(() => {
  void createWindow()
})

app.on('window-all-closed', () => {
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

export async function setupNinjaSession(s: Electron.Session): Promise<void> {
  await initBlocker()
  installBlocker(s)
  setupHttpsOnly(s)
  setupSessionFingerprintDefenses(s)
  setupPermissionPrompts(s)
}

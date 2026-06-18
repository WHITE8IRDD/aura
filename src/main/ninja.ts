import { BrowserWindow, session } from 'electron'
import { join } from 'path'
import { TabManager } from './tabs'
import { wireMaximizeEvents } from './window-controls'
import { registerShortcuts } from './shortcuts'
import { setupNinjaSession } from './session-setup'

export class NinjaWindowManager {
  private ninjaWindowIds = new Set<number>()
  private managers = new Map<number, TabManager>()
  private nextId = 1
  private chromeHeight: number
  private sidebarWidth: number

  constructor(chromeHeight: number, sidebarWidth: number) {
    this.chromeHeight = chromeHeight
    this.sidebarWidth = sidebarWidth
  }

  isNinjaWindow(winId: number): boolean {
    return this.ninjaWindowIds.has(winId)
  }

  getManager(winId: number): TabManager | undefined {
    return this.managers.get(winId)
  }

  async launch(): Promise<void> {
    const id = this.nextId++
    const partition = `ninja-${Date.now()}-${id}`
    const privateSession = session.fromPartition(partition, { cache: false })
    await setupNinjaSession(privateSession)

    const win = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 880,
      minHeight: 560,
      backgroundColor: '#0a0a0f',
      show: false,
      title: 'Aura \u2014 Ninja Mode',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 14 } : undefined,
      frame: process.platform === 'darwin',
      ...(process.platform === 'win32' && { thickFrame: true }),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        session: privateSession
      }
    })

    win.on('page-title-updated', (e) => e.preventDefault())

    this.ninjaWindowIds.add(win.id)

    const tabs = new TabManager(win, this.chromeHeight, privateSession, true)
    this.managers.set(win.id, tabs)
    tabs.setSidebarWidth(this.sidebarWidth)

    wireMaximizeEvents(win)
    registerShortcuts(win, tabs)

    win.once('ready-to-show', () => win.show())

    if (process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'))
    }

    win.webContents.once('did-finish-load', () => {
      tabs.create('aura://newtab')
    })

    win.on('closed', () => {
      this.ninjaWindowIds.delete(win.id)
      this.managers.delete(win.id)
    })
  }
}

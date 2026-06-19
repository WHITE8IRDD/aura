import { app, session, Tray, Menu, nativeImage, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { getSetting } from './settings'

export function applyStartOnLogin(): void {
  const enabled = getSetting('systemStartOnLogin') as boolean
  if (process.platform !== 'win32' && process.platform !== 'darwin') return
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: enabled ? ['--auto-launched'] : []
    })
    console.log('[Aura/system] Start on login:', enabled)
  } catch (err) {
    console.error('[Aura/system] setLoginItemSettings failed:', err)
  }
}

export async function applyProxyMode(): Promise<void> {
  const mode = getSetting('systemProxyMode') as string
  try {
    if (mode === 'system') {
      await session.defaultSession.setProxy({ mode: 'system' })
      console.log('[Aura/system] Proxy: using system settings')
    } else {
      await session.defaultSession.setProxy({ mode: 'direct' })
      console.log('[Aura/system] Proxy: direct (no proxy)')
    }
  } catch (err) {
    console.error('[Aura/system] setProxy failed:', err)
  }
}

let tray: Tray | null = null

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

function createFallbackIcon(): Electron.NativeImage {
  const buf = Buffer.alloc(16 * 16 * 4, 0)
  return nativeImage.createFromBuffer(buf, { width: 16, height: 16 })
}

export function setupTray(mainWindow: BrowserWindow, iconPath: string): void {
  if (tray) return
  try {
    const icon = nativeImage.createFromPath(iconPath)
    tray = new Tray(icon.isEmpty() ? createFallbackIcon() : icon)
    tray.setToolTip('Aura Browser')
    const menu = Menu.buildFromTemplate([
      {
        label: 'Open Aura',
        click: () => {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Aura',
        click: () => {
          app.quit()
        }
      }
    ])
    tray.setContextMenu(menu)
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  } catch (err) {
    console.error('[Aura/system] setupTray failed:', err)
  }
}

export function applyBackgroundMode(mainWindow: BrowserWindow, iconPath: string): void {
  const enabled = getSetting('systemRunInBackground') as boolean
  if (enabled) {
    setupTray(mainWindow, iconPath)
  } else {
    destroyTray()
  }
}

export function getSleepingTabsThreshold(): number {
  const saver = getSetting('systemMemorySaver') as string
  switch (saver) {
    case 'aggressive': return 5 * 60 * 1000
    case 'balanced':   return 30 * 60 * 1000
    case 'off':
    default:           return 0
  }
}

export function initSystemIntegration(mainWindow: BrowserWindow, iconPath: string): void {
  applyStartOnLogin()
  applyProxyMode()
  applyBackgroundMode(mainWindow, iconPath)
  mainWindow.on('close', (event) => {
    const runInBackground = getSetting('systemRunInBackground') as boolean
    if (runInBackground) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
  ipcMain.on('app:realQuit', () => {
    app.quit()
  })
}

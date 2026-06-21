import { BrowserWindow, screen, ipcMain, webContents } from 'electron'
import { join } from 'path'
import { subscribePerfHud, startPerfMonitor } from './perfMonitor'

const HUD_WIDTH = 340
const HUD_HEIGHT = 520

let hudWin: BrowserWindow | null = null

export interface AnchorRect {
  x: number
  y: number
  width: number
  height: number
}

export function togglePerfHud(parent: BrowserWindow, anchor?: AnchorRect): void {
  if (hudWin && !hudWin.isDestroyed()) {
    closePerfHud()
    return
  }
  openPerfHud(parent, anchor)
}

export function openPerfHud(parent: BrowserWindow, anchor?: AnchorRect): void {
  if (hudWin && !hudWin.isDestroyed()) {
    hudWin.focus()
    return
  }

  const parentBounds = parent.getBounds()
  const display = screen.getDisplayMatching(parentBounds)
  const wa = display.workArea

  let x: number
  let y: number

  if (anchor) {
    x = parentBounds.x + Math.round(anchor.x)
    y = parentBounds.y + Math.round(anchor.y + anchor.height + 6)
  } else {
    x = parentBounds.x + 80
    y = parentBounds.y + 100
  }

  x = Math.max(wa.x + 8, Math.min(x, wa.x + wa.width - HUD_WIDTH - 8))
  y = Math.max(wa.y + 8, Math.min(y, wa.y + wa.height - HUD_HEIGHT - 8))

  hudWin = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/perfHud.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    hudWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/perf-hud/index.html`)
  } else {
    hudWin.loadFile(join(__dirname, '../renderer/perf-hud/index.html'))
  }

  hudWin.once('ready-to-show', () => {
    hudWin?.show()
  })

  hudWin.on('closed', () => {
    hudWin = null
  })

  startPerfMonitor()
  subscribePerfHud(hudWin)
}

export function closePerfHud(): void {
  if (hudWin && !hudWin.isDestroyed()) {
    hudWin.close()
  }
  hudWin = null
}

export function isPerfHudOpen(): boolean {
  return !!(hudWin && !hudWin.isDestroyed())
}

export function registerPerfHudWindowIPC(): void {
  ipcMain.on('perf-hud:toggle', (_e, anchor?: AnchorRect) => {
    const focused = BrowserWindow.getFocusedWindow()
    const parent = focused ?? BrowserWindow.getAllWindows()[0]
    if (parent) togglePerfHud(parent, anchor)
  })

  ipcMain.on('perf-hud:close', () => {
    closePerfHud()
  })

  ipcMain.on('perf-hud:focus-tab', (_e, pid: number) => {
    const all = webContents.getAllWebContents()
    for (const wc of all) {
      try {
        if (wc.getOSProcessId() === pid) {
          const win = BrowserWindow.fromWebContents(wc)
          if (win) win.focus()
          break
        }
      } catch {
      }
    }
  })

  ipcMain.on('perf-hud:kill-tab', (_e, pid: number) => {
    const all = webContents.getAllWebContents()
    for (const wc of all) {
      try {
        if (wc.getOSProcessId() === pid) {
          wc.forcefullyCrashRenderer()
          break
        }
      } catch {
      }
    }
  })
}

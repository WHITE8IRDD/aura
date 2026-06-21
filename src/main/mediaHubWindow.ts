import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let popoverWin: BrowserWindow | null = null
let lastParent: BrowserWindow | null = null

const POPOVER_WIDTH = 380
const POPOVER_HEIGHT = 280

export function openMediaHubPopover(
  parent: BrowserWindow,
  buttonRect: { x: number; y: number; width: number; height: number }
): void {
  if (popoverWin && !popoverWin.isDestroyed()) {
    closeMediaHubPopover()
    return
  }

  lastParent = parent

  const parentBounds = parent.getBounds()
  const screenX = parentBounds.x + buttonRect.x + buttonRect.width - POPOVER_WIDTH
  const screenY = parentBounds.y + buttonRect.y + buttonRect.height + 4

  const display = screen.getDisplayMatching(parentBounds)
  const workArea = display.workArea
  const clampedX = Math.max(
    workArea.x + 8,
    Math.min(screenX, workArea.x + workArea.width - POPOVER_WIDTH - 8)
  )
  const clampedY = Math.max(
    workArea.y + 8,
    Math.min(screenY, workArea.y + workArea.height - POPOVER_HEIGHT - 8)
  )

  popoverWin = new BrowserWindow({
    width: POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
    x: Math.round(clampedX),
    y: Math.round(clampedY),
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    parent,
    hasShadow: true,
    backgroundColor: '#00000000',
    icon: join(__dirname, '../../resources/icons/icon-256.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/mediaHubPopover.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    popoverWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/mediaHubPopover.html`)
  } else {
    popoverWin.loadFile(join(__dirname, '../renderer/mediaHubPopover.html'))
  }

  popoverWin.once('ready-to-show', () => {
    popoverWin?.show()
  })

  popoverWin.on('blur', () => {
    closeMediaHubPopover()
  })

  popoverWin.on('closed', () => {
    popoverWin = null
  })

  const onParentMoveOrResize = () => closeMediaHubPopover()
  parent.on('move', onParentMoveOrResize)
  parent.on('resize', onParentMoveOrResize)
  popoverWin.on('closed', () => {
    parent.off('move', onParentMoveOrResize)
    parent.off('resize', onParentMoveOrResize)
  })
}

export function closeMediaHubPopover(): void {
  if (popoverWin && !popoverWin.isDestroyed()) {
    popoverWin.close()
  }
  popoverWin = null
}

export function isMediaHubPopoverOpen(): boolean {
  return !!popoverWin && !popoverWin.isDestroyed()
}

export function registerMediaHubWindowIPC(): void {
  ipcMain.handle('mediaHubWindow:open', (event, buttonRect) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    openMediaHubPopover(win, buttonRect)
  })

  ipcMain.handle('mediaHubWindow:close', () => {
    closeMediaHubPopover()
  })
}

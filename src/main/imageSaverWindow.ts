import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let popoverWin: BrowserWindow | null = null
let lastParent: BrowserWindow | null = null

const POPOVER_WIDTH = 300
const POPOVER_HEIGHT = 360

export interface ImageSaverAnchor {
  srcURL: string
  batchMode: boolean
  sourceWcId?: number
  pageRectX: number
  pageRectY: number
  chromeOffsetTop: number
  chromeOffsetLeft: number
}

export function openImageSaverPopover(parent: BrowserWindow, anchor: ImageSaverAnchor): void {
  if (popoverWin && !popoverWin.isDestroyed()) {
    closeImageSaverPopover()
  }

  lastParent = parent

  const parentBounds = parent.getBounds()
  const screenX = parentBounds.x + anchor.chromeOffsetLeft + anchor.pageRectX
  const screenY = parentBounds.y + anchor.chromeOffsetTop + anchor.pageRectY + 12

  const display = screen.getDisplayMatching(parentBounds)
  const wa = display.workArea
  const clampedX = Math.max(wa.x + 8, Math.min(screenX, wa.x + wa.width - POPOVER_WIDTH - 8))
  const clampedY = Math.max(wa.y + 8, Math.min(screenY, wa.y + wa.height - POPOVER_HEIGHT - 8))

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
    webPreferences: {
      preload: join(__dirname, '../preload/imageSaverPopover.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    popoverWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/imageSaverPopover.html`)
  } else {
    popoverWin.loadFile(join(__dirname, '../renderer/imageSaverPopover.html'))
  }

  popoverWin.once('ready-to-show', () => {
    popoverWin?.webContents.send('imageSaver:setData', {
      srcURL: anchor.srcURL,
      batchMode: anchor.batchMode,
      sourceWcId: anchor.sourceWcId
    })
    popoverWin?.show()
  })

  popoverWin.on('blur', () => closeImageSaverPopover())
  popoverWin.on('closed', () => { popoverWin = null })

  const onParentMoveOrResize = () => closeImageSaverPopover()
  parent.on('move', onParentMoveOrResize)
  parent.on('resize', onParentMoveOrResize)
  popoverWin.on('closed', () => {
    parent.off('move', onParentMoveOrResize)
    parent.off('resize', onParentMoveOrResize)
  })
}

export function closeImageSaverPopover(): void {
  if (popoverWin && !popoverWin.isDestroyed()) {
    popoverWin.close()
  }
  popoverWin = null
}

export function registerImageSaverWindowIPC(): void {
  ipcMain.on('imageSaverWindow:open', (event, anchor: ImageSaverAnchor) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    openImageSaverPopover(win, anchor)
  })

  ipcMain.on('imageSaverWindow:close', () => closeImageSaverPopover())
}

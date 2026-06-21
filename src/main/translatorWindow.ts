import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let popoverWin: BrowserWindow | null = null
let lastParent: BrowserWindow | null = null

const POPOVER_WIDTH = 400
const POPOVER_HEIGHT = 300

export interface TranslatorAnchor {
  pageRectX: number
  pageRectY: number
  chromeOffsetTop: number
  chromeOffsetLeft: number
  text: string
}

export function openTranslatorPopover(parent: BrowserWindow, anchor: TranslatorAnchor): void {
  if (popoverWin && !popoverWin.isDestroyed()) {
    closeTranslatorPopover()
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
    icon: join(__dirname, '../../resources/icons/icon-256.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/translatorPopover.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    popoverWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/translatorPopover.html`)
  } else {
    popoverWin.loadFile(join(__dirname, '../renderer/translatorPopover.html'))
  }

  popoverWin.once('ready-to-show', () => {
    popoverWin?.webContents.send('translator:setText', anchor.text)
    popoverWin?.show()
  })

  popoverWin.on('blur', () => closeTranslatorPopover())
  popoverWin.on('closed', () => { popoverWin = null })

  const onParentMoveOrResize = () => closeTranslatorPopover()
  parent.on('move', onParentMoveOrResize)
  parent.on('resize', onParentMoveOrResize)
  popoverWin.on('closed', () => {
    parent.off('move', onParentMoveOrResize)
    parent.off('resize', onParentMoveOrResize)
  })
}

export function closeTranslatorPopover(): void {
  if (popoverWin && !popoverWin.isDestroyed()) {
    popoverWin.close()
  }
  popoverWin = null
}

export function registerTranslatorWindowIPC(): void {
  ipcMain.on('translatorWindow:open', (event, anchor: TranslatorAnchor) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    openTranslatorPopover(win, anchor)
  })

  ipcMain.on('translatorWindow:close', () => closeTranslatorPopover())
}

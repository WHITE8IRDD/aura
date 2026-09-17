import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let shieldsPopoverWin: BrowserWindow | null = null

const SHIELDS_POPOVER_WIDTH = 320
const SHIELDS_POPOVER_HEIGHT = 380

export function openShieldsPopover(
  parent: BrowserWindow,
  buttonRect: { x: number; y: number; width: number; height: number },
  domain: string
): void {
  console.log('[Aura/Shields] openShieldsPopover called:', { parentId: parent.id, buttonRect, domain })
  if (shieldsPopoverWin && !shieldsPopoverWin.isDestroyed()) {
    console.log('[Aura/Shields] Popover already open, closing first')
    closeShieldsPopover()
    return
  }

  const parentBounds = parent.getBounds()
  console.log('[Aura/Shields] Parent bounds:', parentBounds)
  const screenX = parentBounds.x + buttonRect.x + buttonRect.width - SHIELDS_POPOVER_WIDTH
  const screenY = parentBounds.y + buttonRect.y + buttonRect.height + 6

  const display = screen.getDisplayMatching(parentBounds)
  const workArea = display.workArea
  const clampedX = Math.max(
    workArea.x + 8,
    Math.min(screenX, workArea.x + workArea.width - SHIELDS_POPOVER_WIDTH - 8)
  )
  const clampedY = Math.max(
    workArea.y + 8,
    Math.min(screenY, workArea.y + workArea.height - SHIELDS_POPOVER_HEIGHT - 8)
  )

  console.log('[Aura/Shields] Creating popover at:', { clampedX, clampedY })

  shieldsPopoverWin = new BrowserWindow({
    width: SHIELDS_POPOVER_WIDTH,
    height: SHIELDS_POPOVER_HEIGHT,
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
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  const popoverUrl = process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/shieldsPopover.html?domain=${encodeURIComponent(domain)}`
    : `file://${join(__dirname, '../renderer/shieldsPopover.html')}?domain=${encodeURIComponent(domain)}`

  console.log('[Aura/Shields] Loading URL:', popoverUrl)
  shieldsPopoverWin.loadURL(popoverUrl)

  shieldsPopoverWin.once('ready-to-show', () => {
    console.log('[Aura/Shields] Popover ready to show')
    shieldsPopoverWin?.show()
  })

  shieldsPopoverWin.on('blur', () => {
    console.log('[Aura/Shields] Popover blur, closing')
    closeShieldsPopover()
  })

  shieldsPopoverWin.on('closed', () => {
    console.log('[Aura/Shields] Popover closed')
    shieldsPopoverWin = null
  })

  const onParentMoveOrResize = () => {
    console.log('[Aura/Shields] Parent moved/resized, closing popover')
    closeShieldsPopover()
  }
  parent.on('move', onParentMoveOrResize)
  parent.on('resize', onParentMoveOrResize)
  shieldsPopoverWin.on('closed', () => {
    parent.off('move', onParentMoveOrResize)
    parent.off('resize', onParentMoveOrResize)
  })
}

export function closeShieldsPopover(): void {
  if (shieldsPopoverWin && !shieldsPopoverWin.isDestroyed()) {
    shieldsPopoverWin.close()
  }
  shieldsPopoverWin = null
}

export function isShieldsPopoverOpen(): boolean {
  return !!shieldsPopoverWin && !shieldsPopoverWin.isDestroyed()
}

export function registerShieldsWindowIPC(): void {
  ipcMain.handle('shields:open-popover', (event, buttonRect: { x: number; y: number; width: number; height: number }, domain: string) => {
    console.log('[Aura/Shields] open-popover IPC called:', { buttonRect, domain })
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      console.log('[Aura/Shields] No parent window found')
      return
    }
    console.log('[Aura/Shields] Parent window found, opening popover')
    openShieldsPopover(win, buttonRect, domain)
  })

  ipcMain.handle('shields:close-popover', () => {
    console.log('[Aura/Shields] close-popover IPC called')
    closeShieldsPopover()
  })
}
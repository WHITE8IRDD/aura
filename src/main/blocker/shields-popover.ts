import { app, BrowserWindow, screen } from 'electron'
import type { Rectangle, WebContents, WebPreferences } from 'electron'
import { join } from 'path'

const W = 330
const H = 390
const ROUTE = '/shields-popover'

let popover: BrowserWindow | null = null
let lastHiddenAt = 0

export const getShieldsPopoverWebContents = (): WebContents | null =>
  popover && !popover.isDestroyed() ? popover.webContents : null

export function hideShieldsPopover(): void {
  if (!popover || popover.isDestroyed() || !popover.isVisible()) return
  lastHiddenAt = Date.now()
  popover.hide()
  popover.webContents.send('shields:popover-hide')
}

export function prewarmShieldsPopover(parent: BrowserWindow, webPreferences: WebPreferences): void {
  if (popover && !popover.isDestroyed()) return

  popover = new BrowserWindow({
    width: W,
    height: H,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    parent,
    webPreferences,
  })
  popover.setAlwaysOnTop(true, 'pop-up-menu')
  popover.setMenuBarVisibility(false)

  popover.on('blur', hideShieldsPopover)
  popover.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      hideShieldsPopover()
    }
  })

  parent.on('move', hideShieldsPopover)
  parent.on('resize', hideShieldsPopover)
  parent.on('minimize', hideShieldsPopover)
  parent.on('hide', hideShieldsPopover)

  parent.once('closed', () => {
    if (popover && !popover.isDestroyed()) popover.destroy()
    popover = null
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void popover.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/shieldsPopover.html`)
  } else {
    void popover.loadFile(join(__dirname, '../renderer/shieldsPopover.html'))
  }
}

export interface PopoverTarget {
  tabId: string | number | null
  domain: string
}

export function toggleShieldsPopover(parent: BrowserWindow, target: PopoverTarget, anchor: Rectangle): void {
  if (!popover || popover.isDestroyed()) return
  if (popover.isVisible()) {
    hideShieldsPopover()
    return
  }
  if (Date.now() - lastHiddenAt < 250) return

  const zoom = parent.webContents.getZoomFactor()
  const content = parent.getContentBounds()
  const cx = content.x + (anchor.x + anchor.width / 2) * zoom
  const cy = content.y + (anchor.y + anchor.height) * zoom + 6

  const work = screen.getDisplayNearestPoint({ x: Math.round(cx), y: Math.round(cy) }).workArea
  const x = Math.max(work.x + 8, Math.min(Math.round(cx - W / 2), work.x + work.width - W - 8))
  const y = Math.max(work.y + 8, Math.min(Math.round(cy), work.y + work.height - H - 8))
  popover.setBounds({ x, y, width: W, height: H })

  const show = (): void => {
    if (!popover || popover.isDestroyed()) return
    popover.webContents.send('shields:popover-target', target)
    popover.show()
    popover.focus()
  }
  if (popover.webContents.isLoading()) popover.webContents.once('did-finish-load', show)
  else show()
}

import { app, BrowserWindow, ipcMain, screen } from 'electron'
import type { Rectangle } from 'electron'
import { join } from 'path'
import { isChromeUi } from './features/guard'

// Floating per-site dark-mode picker. Mirrors the shields-popover and
// virtualKeyboard floating-window pattern: frameless, transparent,
// alwaysOnTop — never an inline React div (WebContentsView sits above the
// React DOM, so a div would render invisibly underneath tab content).

const W = 280
const H = 320
const ROUTE = '#/darkmode-popover'

let picker: BrowserWindow | null = null

export function closeDarkModePopover(): void {
  try {
    if (picker && !picker.isDestroyed()) picker.close()
  } catch { /* already gone */ }
  picker = null
}

export function openDarkModePopover(
  parent: BrowserWindow,
  anchor: Rectangle,
  hostname: string
): void {
  const host = String(hostname ?? '').trim().toLowerCase()
  if (!host) return
  // Toggle: clicking the button while open closes it.
  if (picker && !picker.isDestroyed()) {
    closeDarkModePopover()
    return
  }

  const zoom = parent.webContents.getZoomFactor()
  const content = parent.getContentBounds()
  const cx = content.x + (anchor.x + anchor.width / 2) * zoom
  const cy = content.y + (anchor.y + anchor.height) * zoom + 6

  picker = new BrowserWindow({
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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  })
  picker.setAlwaysOnTop(true, 'pop-up-menu')
  picker.setMenuBarVisibility(false)

  const work = screen.getDisplayNearestPoint({ x: Math.round(cx), y: Math.round(cy) }).workArea
  const x = Math.max(work.x + 8, Math.min(Math.round(cx - W / 2), work.x + work.width - W - 8))
  const y = Math.max(work.y + 8, Math.min(Math.round(cy), work.y + work.height - H - 8))
  picker.setBounds({ x, y, width: W, height: H })

  picker.on('blur', closeDarkModePopover)
  picker.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      closeDarkModePopover()
    }
  })
  // NOTE: no parent 'blur' handler here — focusing the picker blurs the
  // parent, which would instantly close what just opened (see shields fix).
  const hideOnParentMove = (): void => closeDarkModePopover()
  parent.on('move', hideOnParentMove)
  parent.on('resize', hideOnParentMove)
  const win = picker
  win.on('closed', () => {
    parent.off('move', hideOnParentMove)
    parent.off('resize', hideOnParentMove)
    if (picker === win) picker = null
  })
  parent.once('closed', () => closeDarkModePopover())

  const route = `${ROUTE}?hostname=${encodeURIComponent(host)}`
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${route}`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route.slice(1) })
  }
  win.once('ready-to-show', () => {
    try {
      win.show()
    } catch { /* window closed meanwhile */ }
  })
}

export function registerDarkModeWindowIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(
    'darkmode:open-popover',
    (e, anchor: Rectangle, hostname: string) => {
      if (!isChromeUi(e.sender)) throw new Error('darkmode: untrusted sender')
      const win = getMainWindow() ?? BrowserWindow.fromWebContents(e.sender) ?? undefined
      if (!win || win.isDestroyed()) return false
      if (!anchor || typeof anchor.x !== 'number') return false
      openDarkModePopover(win, anchor, hostname)
      return true
    }
  )
}

import { app, BrowserWindow, ipcMain, screen } from 'electron'
import type { Rectangle } from 'electron'
import { join } from 'path'
import { isChromeUi } from './features/guard'

// Floating per-tab auto-refresh picker. Mirrors the darkModeWindow pattern
// exactly: frameless, transparent, alwaysOnTop — never an inline React div
// (WebContentsView sits above the React DOM, so a div would render
// invisibly underneath tab content).

const W = 260
const H = 384
const ROUTE = '#/autorefresh-popover'

let picker: BrowserWindow | null = null

export function closeAutoRefreshPopover(): void {
  try {
    if (picker && !picker.isDestroyed()) picker.close()
  } catch {
    /* already gone */
  }
  picker = null
}

export function openAutoRefreshPopover(
  parent: BrowserWindow,
  anchor: Rectangle,
  tabId: number
): void {
  if (!Number.isInteger(tabId) || tabId <= 0) return
  // Toggle: clicking the button while open closes it.
  if (picker && !picker.isDestroyed()) {
    closeAutoRefreshPopover()
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

  picker.on('blur', closeAutoRefreshPopover)
  picker.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      closeAutoRefreshPopover()
    }
  })
  // NOTE: no parent 'blur' handler here — focusing the picker blurs the
  // parent, which would instantly close what just opened (see shields fix).
  const hideOnParentMove = (): void => closeAutoRefreshPopover()
  parent.on('move', hideOnParentMove)
  parent.on('resize', hideOnParentMove)
  const win = picker
  win.on('closed', () => {
    parent.off('move', hideOnParentMove)
    parent.off('resize', hideOnParentMove)
    if (picker === win) picker = null
  })
  parent.once('closed', () => closeAutoRefreshPopover())

  const route = `${ROUTE}?tabId=${encodeURIComponent(String(tabId))}`
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${route}`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route.slice(1) })
  }
  win.once('ready-to-show', () => {
    try {
      win.show()
    } catch {
      /* window closed meanwhile */
    }
  })
}

export function registerAutoRefreshWindowIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('autorefresh:open-popover', (e, anchor: Rectangle, tabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('autorefresh: untrusted sender')
    const id = typeof tabId === 'number' ? tabId : Number(tabId)
    if (!Number.isInteger(id) || id <= 0) return false
    const win = getMainWindow() ?? BrowserWindow.fromWebContents(e.sender) ?? undefined
    if (!win || win.isDestroyed()) return false
    if (!anchor || typeof anchor.x !== 'number') return false
    openAutoRefreshPopover(win, anchor, id)
    return true
  })
}

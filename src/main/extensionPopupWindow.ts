import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

// Extension action popup. Same floating-window pattern as the shields and
// dark-mode popovers: frameless, transparent, alwaysOnTop, positioned under
// the toolbar icon — never an inline React div (WebContentsView sits above
// the React DOM).

const W = 360
const H = 480

let popup: BrowserWindow | null = null

export function closeExtensionPopup(): void {
  try {
    if (popup && !popup.isDestroyed()) popup.close()
  } catch { /* already gone */ }
  popup = null
}

/** anchorX = icon center-x (screen px), anchorY = icon bottom (screen px). */
export function openExtensionPopup(
  parent: BrowserWindow,
  extId: string,
  popupPath: string,
  anchorX: number,
  anchorY: number
): boolean {
  if (!/^[a-p]{32}$/.test(extId) || !popupPath) return false
  // Toggle: clicking the icon while open closes it.
  if (popup && !popup.isDestroyed()) {
    closeExtensionPopup()
    return false
  }

  const safePath = popupPath.replace(/^\/+/, '')
  if (safePath.includes('..')) return false

  popup = new BrowserWindow({
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
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  })
  popup.setAlwaysOnTop(true, 'pop-up-menu')
  popup.setMenuBarVisibility(false)

  const work = screen.getDisplayNearestPoint({ x: Math.round(anchorX), y: Math.round(anchorY) }).workArea
  const x = Math.max(work.x + 8, Math.min(Math.round(anchorX - W / 2), work.x + work.width - W - 8))
  const y = Math.max(work.y + 8, Math.min(Math.round(anchorY + 8), work.y + work.height - H - 8))
  popup.setBounds({ x, y, width: W, height: H })

  popup.on('blur', closeExtensionPopup)
  popup.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      closeExtensionPopup()
    }
  })
  const hideOnParentMove = (): void => closeExtensionPopup()
  parent.on('move', hideOnParentMove)
  parent.on('resize', hideOnParentMove)
  const win = popup
  win.on('closed', () => {
    parent.off('move', hideOnParentMove)
    parent.off('resize', hideOnParentMove)
    if (popup === win) popup = null
  })
  parent.once('closed', () => closeExtensionPopup())

  void win.loadURL(`chrome-extension://${extId}/${safePath}`)
  win.once('ready-to-show', () => {
    try {
      win.show()
    } catch { /* closed meanwhile */ }
  })
  return true
}

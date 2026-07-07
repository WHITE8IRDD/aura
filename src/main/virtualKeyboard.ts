import { BrowserWindow, ipcMain, globalShortcut, clipboard, screen } from 'electron'
import { join } from 'path'
import { getSetting, setSetting } from './settings'
import { getCharsByCategory, searchChars, CATEGORIES, ALL_CHARS } from './unicodeDatabase'
import { excludeFromFocusTracking, getLastFocusedWebContents } from './focusTracker'
import { FUNCTION_ROW, NUMBER_ROW, QWERTY_ROWS, BOTTOM_ROW, ARROW_CLUSTER } from './keyboardLayout'
import type { UnicodeChar } from './unicodeDatabase'

let keyboardWindow: BrowserWindow | null = null
let mainWindowRef: BrowserWindow | null = null

const DEFAULT_FAVORITE_CHARS = ['©', '™', '®', '→', '←', '≠', '≈', '∞', '°', '±',
  '€', '£', '¥', '÷', '×', '√', '∑', 'π', 'α', 'β']

function getFavorites(): string[] {
  try {
    const raw = getSetting('vkFavorites' as any)
    if (Array.isArray(raw)) return raw
    return seedDefaults()
  } catch {
    return seedDefaults()
  }
}

function seedDefaults(): string[] {
  const codes: string[] = []
  for (const ch of DEFAULT_FAVORITE_CHARS) {
    const found = ALL_CHARS.find(c => c.char === ch)
    if (found) codes.push(found.code)
  }
  setSetting('vkFavorites' as any, codes)
  return codes
}

function setFavorites(favs: string[]): void {
  setSetting('vkFavorites' as any, favs)
}

export function setupKeyboardIPC(mainWin: BrowserWindow): void {
  mainWindowRef = mainWin

  ipcMain.handle('vk:getLayout', () => ({
    functionRow: FUNCTION_ROW,
    numberRow: NUMBER_ROW,
    qwertyRows: QWERTY_ROWS,
    bottomRow: BOTTOM_ROW,
    arrowCluster: ARROW_CLUSTER,
  }))

  ipcMain.handle('vk:getCategories', () => CATEGORIES)

  ipcMain.handle('vk:getCategory', (_e, categoryId: string) => {
    return getCharsByCategory(categoryId)
  })

  ipcMain.handle('vk:search', (_e, query: string) => {
    return searchChars(query)
  })

  ipcMain.handle('vk:copy', (_e, char: string) => {
    clipboard.writeText(char)
    return true
  })

  ipcMain.handle('vk:getFavorites', () => {
    const codes = getFavorites()
    return codes
      .map((code) => ALL_CHARS.find((c) => c.code === code))
      .filter(Boolean) as UnicodeChar[]
  })

  ipcMain.handle('vk:addFavorite', (_e, code: string) => {
    const favs = getFavorites()
    if (!favs.includes(code)) {
      favs.push(code)
      setFavorites(favs)
    }
    return true
  })

  ipcMain.handle('vk:removeFavorite', (_e, code: string) => {
    const favs = getFavorites()
    const idx = favs.indexOf(code)
    if (idx !== -1) {
      favs.splice(idx, 1)
      setFavorites(favs)
    }
    return true
  })

  ipcMain.handle('vk:reorderFavorites', (_e, codes: string[]) => {
    setFavorites(codes)
    return true
  })

  ipcMain.handle('vk:insert', async (_e, char: string) => {
    const target = getLastFocusedWebContents()
    if (!target || target.isDestroyed()) return false
    clipboard.writeText(char)
    target.paste()
    return true
  })

  ipcMain.handle('vk:type', async (_e, char: string) => {
    const target = getLastFocusedWebContents()
    if (!target || target.isDestroyed()) return false
    target.sendInputEvent({ type: 'char', keyCode: char } as any)
    return true
  })

  ipcMain.handle('vk:sendKey', async (_e, code: string) => {
    const target = getLastFocusedWebContents()
    if (!target || target.isDestroyed()) return false
    target.sendInputEvent({ type: 'keyDown', keyCode: code } as any)
    target.sendInputEvent({ type: 'keyUp', keyCode: code } as any)
    return true
  })

  ipcMain.handle('vk:toggle', () => {
    toggleKeyboard()
  })

  ipcMain.handle('vk:close', () => {
    closeKeyboard()
  })

  ipcMain.handle('vk:setAlwaysOnTop', (_e, flag: boolean) => {
    if (keyboardWindow && !keyboardWindow.isDestroyed()) {
      keyboardWindow.setAlwaysOnTop(flag)
    }
  })
}

export function toggleKeyboard(): void {
  if (keyboardWindow && !keyboardWindow.isDestroyed()) {
    if (keyboardWindow.isVisible()) {
      keyboardWindow.close()
    } else {
      keyboardWindow.show()
      keyboardWindow.focus()
    }
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = display.workAreaSize

  let wx: number, wy: number, ww: number, wh: number
  let center = true

  try {
    const sizeRaw = getSetting('vk-size' as any) as string | undefined
    const posRaw = getSetting('vk-position' as any) as string | undefined
    if (sizeRaw && posRaw) {
      const size = JSON.parse(sizeRaw)
      const pos = JSON.parse(posRaw)
      if (typeof size.w === 'number' && typeof size.h === 'number' &&
          typeof pos.x === 'number' && typeof pos.y === 'number') {
        ww = Math.max(560, Math.min(1400, size.w))
        wh = Math.max(260, Math.min(900, size.h))
        wx = pos.x
        wy = pos.y
        center = false
      }
    }
  } catch {}

  if (center) {
    ww = 860
    wh = 380
    wx = Math.round((screenW - ww) / 2)
    wy = screenH - wh - 60
  }

  keyboardWindow = new BrowserWindow({
    width: ww,
    height: wh,
    x: wx,
    y: wy,
    minWidth: 560,
    minHeight: 260,
    maxWidth: 1400,
    maxHeight: 900,
    frame: false,
    transparent: true,
    backgroundMaterial: 'acrylic',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    movable: true,
    hasShadow: true,
    show: false,
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  excludeFromFocusTracking(keyboardWindow.webContents.id)

  keyboardWindow.webContents.on('devtools-opened', () => {
    const dt = keyboardWindow?.webContents.devToolsWebContents
    if (dt) excludeFromFocusTracking(dt.id)
  })

  keyboardWindow.setMenuBarVisibility(false)

  keyboardWindow.on('closed', () => {
    keyboardWindow = null
  })

  keyboardWindow.on('moved', () => {
    if (!keyboardWindow || keyboardWindow.isDestroyed()) return
    const [x, y] = keyboardWindow.getPosition()
    setSetting('vk-position' as any, JSON.stringify({ x, y }))
  })

  keyboardWindow.on('resized', () => {
    if (!keyboardWindow || keyboardWindow.isDestroyed()) return
    const [w, h] = keyboardWindow.getSize()
    setSetting('vk-size' as any, JSON.stringify({ w, h }))
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    keyboardWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/virtual-keyboard')
  } else {
    keyboardWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/virtual-keyboard'
    })
  }

  keyboardWindow.once('ready-to-show', () => {
    keyboardWindow?.show()
    keyboardWindow?.focus()
  })
}

function closeKeyboard(): void {
  if (keyboardWindow && !keyboardWindow.isDestroyed()) {
    keyboardWindow.close()
  }
  keyboardWindow = null
}

export function registerKeyboardShortcut(): void {
  globalShortcut.register('CommandOrControl+Alt+K', () => {
    toggleKeyboard()
  })
}

export function cleanupKeyboard(): void {
  closeKeyboard()
}

import {
  BrowserWindow,
  ipcMain,
  globalShortcut,
  clipboard,
  screen,
  app
} from 'electron';
import { join } from 'path';
import {
  FUNCTION_ROW,
  NUMBER_ROW,
  QWERTY_ROWS,
  BOTTOM_ROW,
  ARROW_CLUSTER
} from './keyboardLayout';
import { CATEGORIES, getCharsByCategory, searchChars } from './unicodeDatabase';
import { excludeFromFocusTracking, getLastFocusedWebContents } from './focusTracker';
import { getSetting, setSetting } from './settings';

let vkWindow: BrowserWindow | null = null;

const DEFAULT_FAVORITES = [
  'U+00A9', // ©
  'U+2122', // ™
  'U+00AE', // ®
  'U+2192', // →
  'U+2190', // ←
  'U+2260', // ≠
  'U+2248', // ≈
  'U+221E', // ∞
  'U+00B0', // °
  'U+00B1', // ±
  'U+20AC', // €
  'U+00A3', // £
  'U+00A5', // ¥
  'U+00F7', // ÷
  'U+00D7', // ×
  'U+221A', // √
  'U+2211', // ∑
  'U+03C0', // π
  'U+03B1', // α
  'U+03B2', // β
];

export function toggleVirtualKeyboard(_parentWindow?: BrowserWindow): void {
  if (vkWindow && !vkWindow.isDestroyed()) {
    if (vkWindow.isVisible()) {
      vkWindow.hide();
    } else {
      vkWindow.show();
    }
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  // Retrieve saved size/position or compute default
  const savedSize = getSetting('vk-size') || { width: 860, height: 380 };
  const savedPos = getSetting('vk-position') || {
    x: Math.round(workArea.x + (workArea.width - savedSize.width) / 2),
    y: Math.round(workArea.y + workArea.height - savedSize.height - 40),
  };

  vkWindow = new BrowserWindow({
    width: savedSize.width,
    height: savedSize.height,
    minWidth: 560,
    minHeight: 260,
    maxWidth: 1400,
    maxHeight: 900,
    x: savedPos.x,
    y: savedPos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    movable: true,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Exclude virtual keyboard from steal-focus tracking
  excludeFromFocusTracking(vkWindow.webContents.id);

  const isDev = !app.isPackaged && process.env['ELECTRON_RENDERER_URL'];
  const url = isDev
    ? `${process.env['ELECTRON_RENDERER_URL']}#/virtual-keyboard`
    : `file://${join(__dirname, '../renderer/index.html')}#/virtual-keyboard`;

  vkWindow.loadURL(url);

  vkWindow.once('ready-to-show', () => {
    vkWindow?.show();
  });

  vkWindow.on('moved', () => {
    if (!vkWindow) return;
    const [x, y] = vkWindow.getPosition();
    setSetting('vk-position', { x, y });
  });

  vkWindow.on('resized', () => {
    if (!vkWindow) return;
    const [width, height] = vkWindow.getSize();
    setSetting('vk-size', { width, height });
  });

  vkWindow.on('closed', () => {
    vkWindow = null;
  });
}

export function registerKeyboardShortcut(): void {
  try {
    globalShortcut.register('CommandOrControl+Alt+K', () => {
      toggleVirtualKeyboard();
    });
  } catch (err) {
    console.warn('[Aura/Keyboard] Failed to register Ctrl+Alt+K shortcut:', err);
  }
}

export function setupKeyboardIPC(): void {
  // Layout & Unicode queries
  ipcMain.handle('vk:getLayout', () => ({
    FUNCTION_ROW,
    NUMBER_ROW,
    QWERTY_ROWS,
    BOTTOM_ROW,
    ARROW_CLUSTER,
  }));

  ipcMain.handle('vk:getCategories', () => CATEGORIES);
  ipcMain.handle('vk:getCategory', (_e, catId: string) => getCharsByCategory(catId));
  ipcMain.handle('vk:search', (_e, query: string) => searchChars(query));

  // Clipboard & Input Injection
  ipcMain.handle('vk:copy', (_e, char: string) => {
    clipboard.writeText(char);
    return true;
  });

  ipcMain.handle('vk:insert', (_e, char: string) => {
    clipboard.writeText(char);
    const targetWc = getLastFocusedWebContents();
    if (targetWc) {
      targetWc.paste();
    }
    return true;
  });

  ipcMain.handle('vk:type', (_e, char: string) => {
    const targetWc = getLastFocusedWebContents();
    if (targetWc) {
      targetWc.sendInputEvent({ type: 'char', keyCode: char });
    }
    return true;
  });

  ipcMain.handle('vk:sendKey', (_e, keyCode: string) => {
    const targetWc = getLastFocusedWebContents();
    if (targetWc) {
      targetWc.sendInputEvent({ type: 'keyDown', keyCode });
      targetWc.sendInputEvent({ type: 'keyUp', keyCode });
    }
    return true;
  });

  // Favorites Management
  ipcMain.handle('vk:getFavorites', () => {
    return getSetting('vkFavorites') || DEFAULT_FAVORITES;
  });

  ipcMain.handle('vk:addFavorite', (_e, code: string) => {
    const favs: string[] = getSetting('vkFavorites') || DEFAULT_FAVORITES;
    if (!favs.includes(code)) {
      const updated = [...favs, code];
      setSetting('vkFavorites', updated);
      return updated;
    }
    return favs;
  });

  ipcMain.handle('vk:removeFavorite', (_e, code: string) => {
    const favs: string[] = getSetting('vkFavorites') || DEFAULT_FAVORITES;
    const updated = favs.filter((c) => c !== code);
    setSetting('vkFavorites', updated);
    return updated;
  });

  ipcMain.handle('vk:reorderFavorites', (_e, codes: string[]) => {
    setSetting('vkFavorites', codes);
    return codes;
  });

  // Window Controls
  ipcMain.handle('vk:toggle', () => {
    toggleVirtualKeyboard();
  });

  ipcMain.handle('vk:close', () => {
    if (vkWindow && !vkWindow.isDestroyed()) {
      vkWindow.close();
    }
  });

  ipcMain.handle('vk:setAlwaysOnTop', (_e, flag: boolean) => {
    if (vkWindow && !vkWindow.isDestroyed()) {
      vkWindow.setAlwaysOnTop(flag);
    }
  });
}

export function cleanupKeyboard(): void {
  try {
    globalShortcut.unregister('CommandOrControl+Alt+K');
  } catch {}
}

import { nativeTheme, BrowserWindow } from 'electron'
import { getSetting } from './settings'

type ThemeModeValue = 'light' | 'dark' | 'auto'
type ResolvedTheme = 'light' | 'dark'

const listeners = new Set<(theme: ResolvedTheme) => void>()

function resolveTheme(mode: ThemeModeValue): ResolvedTheme {
  if (mode === 'auto') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }
  return mode
}

function broadcastResolved(theme: ResolvedTheme): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('theme:resolved', theme)
    }
  }
}

function notifyListeners(theme: ResolvedTheme): void {
  for (const cb of listeners) {
    try { cb(theme) } catch { /* ignore */ }
  }
}

function applyAndBroadcast(): void {
  const mode = getSetting('themeMode') as ThemeModeValue
  nativeTheme.themeSource = mode === 'auto' ? 'system' : mode
  const resolved = resolveTheme(mode)
  broadcastResolved(resolved)
  notifyListeners(resolved)
}

export function initThemeManager(): void {
  applyAndBroadcast()

  nativeTheme.on('updated', () => {
    const mode = getSetting('themeMode') as ThemeModeValue
    if (mode === 'auto') {
      const resolved = resolveTheme('auto')
      broadcastResolved(resolved)
      notifyListeners(resolved)
    }
  })
}

export function getResolvedTheme(): ResolvedTheme {
  const mode = getSetting('themeMode') as ThemeModeValue
  return resolveTheme(mode)
}

export function onThemeChanged(cb: (theme: ResolvedTheme) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function handleThemeSettingChange(): void {
  applyAndBroadcast()
}

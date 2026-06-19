import { ipcMain, BrowserWindow } from 'electron'
import { getDb } from './db'
import { getDefaults, reloadSettings } from './settings'

function broadcast(key: string, value: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('settings:changed', { key, value })
    }
  }
}

function broadcastFullReset(): void {
  const defaults = getDefaults()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('settings:fullReset')
      for (const [key, value] of Object.entries(defaults)) {
        win.webContents.send('settings:changed', { key, value })
      }
    }
  }
}

export function resetAllSettings(): {
  success: boolean
  resetCount: number
  error?: string
} {
  try {
    const db = getDb()
    db.prepare('DELETE FROM settings').run()
    const defaults = getDefaults()
    const insert = db.prepare(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    )
    const now = Date.now()
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(defaults)) {
        insert.run(key, JSON.stringify(value), now)
      }
    })
    tx()
    const resetCount = Object.keys(defaults).length
    reloadSettings()
    broadcastFullReset()
    return { success: true, resetCount }
  } catch (err: any) {
    console.error('[Aura/reset] resetAll failed:', err)
    return {
      success: false,
      resetCount: 0,
      error: err?.message || 'Unknown error'
    }
  }
}

export function resetSettingsByKeys(keys: string[]): {
  success: boolean
  resetCount: number
  error?: string
} {
  try {
    const db = getDb()
    const defaults = getDefaults()
    const insertOrReplace = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    )
    const now = Date.now()
    let count = 0
    const tx = db.transaction(() => {
      for (const key of keys) {
        if (key in defaults) {
          insertOrReplace.run(key, JSON.stringify((defaults as unknown as Record<string, unknown>)[key]), now)
          count++
        }
      }
    })
    tx()
    for (const key of keys) {
      if (key in defaults) {
        broadcast(key, (defaults as unknown as Record<string, unknown>)[key])
      }
    }
    return { success: true, resetCount: count }
  } catch (err: any) {
    console.error('[Aura/reset] resetByKeys failed:', err)
    return {
      success: false,
      resetCount: 0,
      error: err?.message || 'Unknown error'
    }
  }
}

export function registerResetIPC(): void {
  ipcMain.handle('settings:resetAll', () => resetAllSettings())
  ipcMain.handle('settings:resetByKeys', (_e, keys: string[]) =>
    resetSettingsByKeys(keys))
}

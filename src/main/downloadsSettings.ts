import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import { getSetting, setSetting } from './settings'
import { getDb } from './db'

function existsSyncSafe(p: string): boolean {
  try { return fs.existsSync(p) } catch { return false }
}

export function registerDownloadsSettingsIPC(): void {
  ipcMain.handle('downloads:pickFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    const currentPath = (getSetting('downloadPath') as string) || app.getPath('downloads')
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose download folder',
      defaultPath: currentPath,
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('downloads:openFolder', () => {
    const customPath = getSetting('downloadPath') as string
    const folder = customPath && existsSyncSafe(customPath)
      ? customPath
      : app.getPath('downloads')
    shell.openPath(folder)
  })

  ipcMain.handle('downloads:getCurrentFolder', () => {
    const customPath = getSetting('downloadPath') as string
    return customPath && existsSyncSafe(customPath)
      ? customPath
      : app.getPath('downloads')
  })

  ipcMain.handle('downloads:clearHistory', () => {
    try {
      const db = getDb()
      db.prepare('DELETE FROM downloads').run()
      return true
    } catch (err) {
      console.error('[Aura/downloads] clearHistory failed:', err)
      return false
    }
  })

  ipcMain.handle('downloads:applyRetention', () => {
    applyRetentionPolicy()
  })
}

export function applyRetentionPolicy(): void {
  const policy = getSetting('downloadHistoryRetention') as string
  if (policy === 'forever') return

  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  let cutoff: number

  switch (policy) {
    case '24hours': cutoff = now - 24 * 60 * 60; break
    case '7days':   cutoff = now - 7 * 24 * 60 * 60; break
    case '30days':  cutoff = now - 30 * 24 * 60 * 60; break
    case 'never':   cutoff = now + 1; break
    default: return
  }

  try {
    const result = db.prepare(
      `DELETE FROM downloads WHERE started_at < ? AND state != 'progressing'`
    ).run(cutoff * 1000)  // started_at is in milliseconds
    if (result.changes > 0) {
      console.log(`[Aura/downloads] Retention: removed ${result.changes} old entries`)
    }
  } catch (err) {
    console.error('[Aura/downloads] retention failed:', err)
  }
}

let retentionInterval: NodeJS.Timeout | null = null

export function startRetentionScheduler(): void {
  if (retentionInterval) clearInterval(retentionInterval)
  applyRetentionPolicy()
  retentionInterval = setInterval(applyRetentionPolicy, 60 * 60 * 1000)
}

export function stopRetentionScheduler(): void {
  if (retentionInterval) {
    clearInterval(retentionInterval)
    retentionInterval = null
  }
}

export function maybeClearOnQuit(): void {
  const clearOnQuit = getSetting('downloadClearOnQuit') as boolean
  if (!clearOnQuit) return
  try {
    const db = getDb()
    db.prepare("DELETE FROM downloads WHERE state != 'progressing'").run()
    console.log('[Aura/downloads] Cleared download history on quit')
  } catch (err) {
    console.error('[Aura/downloads] clearOnQuit failed:', err)
  }
}

import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile, readFile } from 'fs/promises'
import { getDb } from './db'

export interface AuraDataExport {
  version: 1
  exportedAt: number
  app: 'aura'
  bookmarks: any[]
  history: any[]
  settings: Record<string, any>
}

function buildExport(): AuraDataExport {
  const db = getDb()

  const bookmarks = db.prepare(
    'SELECT id, url, title, folder_id, created_at FROM bookmarks ORDER BY id ASC'
  ).all()

  const history = db.prepare(
    'SELECT url, title, visit_count, visited_at as last_visited FROM history ORDER BY visited_at DESC LIMIT 5000'
  ).all()

  const settingsRows = db.prepare(
    'SELECT key, value FROM settings'
  ).all() as Array<{ key: string; value: string }>

  const settings: Record<string, any> = {}
  for (const row of settingsRows) {
    try {
      settings[row.key] = JSON.parse(row.value)
    } catch {
      settings[row.key] = row.value
    }
  }

  return {
    version: 1,
    exportedAt: Math.floor(Date.now() / 1000),
    app: 'aura',
    bookmarks,
    history,
    settings
  }
}

export async function exportData(): Promise<{
  success: boolean
  path?: string
  error?: string
}> {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { success: false, error: 'No window' }

  const result = await dialog.showSaveDialog(win, {
    title: 'Export Aura data',
    defaultPath: `aura-export-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'Aura Data (JSON)', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Cancelled' }
  }

  try {
    const data = buildExport()
    await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, path: result.filePath }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Export failed' }
  }
}

function isValidExport(data: any): data is AuraDataExport {
  if (!data || typeof data !== 'object') return false
  if (data.app !== 'aura') return false
  if (typeof data.version !== 'number') return false
  if (!Array.isArray(data.bookmarks)) return false
  if (!Array.isArray(data.history)) return false
  if (typeof data.settings !== 'object') return false
  return true
}

export async function importData(): Promise<{
  success: boolean
  bookmarksImported?: number
  historyImported?: number
  settingsImported?: number
  error?: string
}> {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { success: false, error: 'No window' }

  const result = await dialog.showOpenDialog(win, {
    title: 'Import Aura data',
    filters: [{ name: 'Aura Data (JSON)', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'Cancelled' }
  }

  try {
    const raw = await readFile(result.filePaths[0], 'utf-8')
    const data = JSON.parse(raw)

    if (!isValidExport(data)) {
      return { success: false, error: 'Not a valid Aura export file' }
    }

    const db = getDb()
    let bookmarksImported = 0
    let historyImported = 0
    let settingsImported = 0

    const insertBookmark = db.prepare(`
      INSERT OR IGNORE INTO bookmarks (url, title, folder_id, created_at)
      VALUES (?, ?, ?, ?)
    `)
    const bookmarkTx = db.transaction(() => {
      for (const bm of data.bookmarks) {
        if (!bm.url) continue
        const res = insertBookmark.run(
          bm.url,
          bm.title || bm.url,
          bm.folder_id ?? null,
          bm.created_at || Math.floor(Date.now() / 1000)
        )
        if (res.changes > 0) bookmarksImported++
      }
    })
    bookmarkTx()

    const insertOrUpdateHistory = db.prepare(`
      INSERT INTO history (url, title, visit_count, visited_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        visit_count = visit_count + excluded.visit_count,
        visited_at = MAX(visited_at, excluded.visited_at),
        title = excluded.title
    `)
    const historyTx = db.transaction(() => {
      for (const h of data.history) {
        if (!h.url) continue
        const visitedAt = h.last_visited || h.visited_at || Math.floor(Date.now() / 1000)
        insertOrUpdateHistory.run(
          h.url,
          h.title || h.url,
          h.visit_count || 1,
          visitedAt
        )
        historyImported++
      }
    })
    historyTx()

    const upsertSetting = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    )
    const settingsTx = db.transaction(() => {
      for (const [key, value] of Object.entries(data.settings)) {
        upsertSetting.run(key, JSON.stringify(value), Date.now())
        settingsImported++
      }
    })
    settingsTx()

    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) {
        w.webContents.send('settings:fullReset')
        for (const [key, value] of Object.entries(data.settings)) {
          w.webContents.send('settings:changed', { key, value })
        }
        w.webContents.send('bookmarks:update')
      }
    }

    return {
      success: true,
      bookmarksImported,
      historyImported,
      settingsImported
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Import failed' }
  }
}

export function registerProfileDataIPC(): void {
  ipcMain.handle('profile:exportData', () => exportData())
  ipcMain.handle('profile:importData', () => importData())
}

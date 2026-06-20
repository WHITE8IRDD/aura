import { ipcMain, session, BrowserWindow } from 'electron'
import { getDb } from './db'

export type TimeRange = 'hour' | 'day' | 'week' | 'fourWeeks' | 'all'

export interface ClearOptions {
  timeRange: TimeRange
  browsingHistory: boolean
  downloadHistory: boolean
  cookies: boolean
  cache: boolean
  passwords: boolean
  autofillData: boolean
  siteSettings: boolean
  hostedAppData: boolean
}

export interface ClearResult {
  success: boolean
  cleared: Partial<Record<keyof ClearOptions, number>>
  errors: string[]
}

function getCutoffTimestamp(range: TimeRange): number {
  const now = Date.now()
  switch (range) {
    case 'hour':      return now - 3600_000
    case 'day':       return now - 86_400_000
    case 'week':      return now - 604_800_000
    case 'fourWeeks': return now - 2_419_200_000
    case 'all':       return 0
  }
}

export interface ClearPreview {
  historyCount: number
  downloadsCount: number
  cookiesSiteCount: number
  cacheSizeBytes: number
  siteSettingsCount: number
}

export async function previewClearData(timeRange: TimeRange): Promise<ClearPreview> {
  const cutoff = getCutoffTimestamp(timeRange)
  const db = getDb()

  let historyCount = 0
  try {
    if (timeRange === 'all') {
      const row = db.prepare('SELECT COUNT(*) as c FROM history').get()
      historyCount = (row as any)?.c || 0
    } else {
      const row = db.prepare('SELECT COUNT(*) as c FROM history WHERE visited_at >= ?').get(cutoff)
      historyCount = (row as any)?.c || 0
    }
  } catch {}

  let downloadsCount = 0
  try {
    if (timeRange === 'all') {
      const row = db.prepare('SELECT COUNT(*) as c FROM downloads').get()
      downloadsCount = (row as any)?.c || 0
    } else {
      const row = db.prepare('SELECT COUNT(*) as c FROM downloads WHERE started_at >= ?').get(cutoff)
      downloadsCount = (row as any)?.c || 0
    }
  } catch {}

  let cacheSizeBytes = 0
  try { cacheSizeBytes = await session.defaultSession.getCacheSize() } catch {}

  let cookiesSiteCount = 0
  try {
    const cookies = await session.defaultSession.cookies.get({})
    const domains = new Set(cookies.map(c => c.domain).filter(Boolean))
    cookiesSiteCount = domains.size
  } catch {}

  let siteSettingsCount = 0

  return { historyCount, downloadsCount, cookiesSiteCount, cacheSizeBytes, siteSettingsCount }
}

export async function clearBrowsingData(options: ClearOptions): Promise<ClearResult> {
  const result: ClearResult = { success: true, cleared: {}, errors: [] }
  const cutoff = getCutoffTimestamp(options.timeRange)
  const db = getDb()
  const isAll = options.timeRange === 'all'

  if (options.browsingHistory) {
    try {
      const cond = isAll ? '' : 'WHERE visited_at >= ?'
      const stmt = db.prepare(`DELETE FROM history ${cond}`)
      const res = isAll ? stmt.run() : stmt.run(cutoff)
      result.cleared.browsingHistory = res.changes
      if (isAll) {
        try { db.prepare('DELETE FROM tab_sessions').run() } catch {}
      }
      try {
        if (isAll) {

        }
      } catch {}
    } catch (err: any) {
      result.errors.push(`history: ${err.message}`)
    }
  }

  if (options.downloadHistory) {
    try {
      const cond = isAll ? '' : 'WHERE started_at >= ?'
      const stmt = db.prepare(`DELETE FROM downloads ${cond}`)
      const res = isAll ? stmt.run() : stmt.run(cutoff)
      result.cleared.downloadHistory = res.changes
    } catch (err: any) {
      result.errors.push(`downloads: ${err.message}`)
    }
  }

  if (options.cookies) {
    try {
      await session.defaultSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'serviceworkers']
      })
      result.cleared.cookies = 1
    } catch (err: any) {
      result.errors.push(`cookies: ${err.message}`)
    }
  }

  if (options.cache) {
    try {
      await session.defaultSession.clearCache()
      result.cleared.cache = 1
    } catch (err: any) {
      result.errors.push(`cache: ${err.message}`)
    }
  }

  if (options.siteSettings) {
    try {
      try { db.prepare('DELETE FROM zoom_levels').run() } catch {}
      await session.defaultSession.clearStorageData({
        storages: ['localstorage']
      })
      result.cleared.siteSettings = 1
    } catch (err: any) {
      result.errors.push(`siteSettings: ${err.message}`)
    }
  }

  if (options.hostedAppData) {
    try {
      await session.defaultSession.clearStorageData({
        storages: ['filesystem', 'shadercache', 'websql']
      })
      result.cleared.hostedAppData = 1
    } catch (err: any) {
      result.errors.push(`hostedAppData: ${err.message}`)
    }
  }

  if (options.passwords) result.cleared.passwords = 0
  if (options.autofillData) result.cleared.autofillData = 0

  if (result.errors.length > 0) result.success = false

  broadcastDataChange(options)

  return result
}

function broadcastDataChange(options: ClearOptions): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    if (options.browsingHistory) win.webContents.send('history:changed')
    if (options.downloadHistory) win.webContents.send('downloads:changed')
  }
}

export function registerClearBrowsingDataIPC(): void {
  ipcMain.handle('clearData:preview', (_e, timeRange: TimeRange) =>
    previewClearData(timeRange))
  ipcMain.handle('clearData:execute', (_e, options: ClearOptions) =>
    clearBrowsingData(options))
}

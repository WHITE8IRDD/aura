import { ipcMain, webContents } from 'electron'
import { getDb } from './db'

function esc(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'"
}
function nn(v: number | null | undefined): string {
  return v != null && isFinite(v) ? String(v) : 'NULL'
}

let tableEnsured = false

function ensureTable() {
  if (tableEnsured) return
  try {
    const db = getDb()
    db.exec(`
      CREATE TABLE IF NOT EXISTS media_playback (
        url_key TEXT PRIMARY KEY,
        duration REAL,
        last_updated INTEGER NOT NULL,
        resume_pos TEXT NOT NULL,
        title TEXT,
        favicon TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_media_playback_updated
        ON media_playback(last_updated DESC);
    `)
    tableEnsured = true
  } catch (e) {
    console.error('[aura:media] ensureTable failed:', e)
  }
}

function writeEntryToDb(key: string, currentTime: number, duration: number | null, lastUpdated: number, title: string, favicon: string) {
  const db = getDb()
  db.exec(`INSERT INTO media_playback (url_key, duration, last_updated, resume_pos, title, favicon)
    VALUES (${esc(key)}, ${nn(duration)}, ${lastUpdated}, ${esc(String(currentTime))}, ${esc(title || '')}, ${esc(favicon || '')})
    ON CONFLICT(url_key) DO UPDATE SET
      duration = ${nn(duration)},
      last_updated = ${lastUpdated},
      resume_pos = ${esc(String(currentTime))},
      title = ${esc(title || '')},
      favicon = ${esc(favicon || '')}`)
}

function deleteEntryFromDb(key: string) {
  getDb().exec('DELETE FROM media_playback WHERE url_key = ' + esc(key))
}

export function cleanCorruptedEntries() {
  try {
    ensureTable()
    const db = getDb()
    const all = db.prepare('SELECT url_key, resume_pos FROM media_playback').all() as Array<{ url_key: string; resume_pos: unknown }>
    const badKeys: string[] = []
    for (const row of all) {
      const ct = row.resume_pos
      let ok = false
      if (typeof ct === 'number') {
        ok = isFinite(ct) && !isNaN(ct) && ct >= 0
      } else if (typeof ct === 'string') {
        ok = /^\d+(\.\d+)?$/.test(ct.trim()) && isFinite(parseFloat(ct)) && parseFloat(ct) >= 0
      }
      if (!ok) {
        badKeys.push(row.url_key)
      }
    }
    for (const key of badKeys) {
      deleteEntryFromDb(key)
    }
    cache.clear()
    const after = db.prepare('SELECT COUNT(*) as c FROM media_playback').get() as { c: number }
    console.log('[aura:media:diag] cleanCorrupted: rows before=', all.length, 'rows after=', after.c)
  } catch (e) {
    console.error('[aura:media] cleanCorruptedEntries failed:', e)
  }
}

interface MediaEntry {
  currentTime: number
  duration: number | null
  lastUpdated: number
  title: string
  favicon: string
}

const cache = new Map<string, MediaEntry>()
const MIN_VIDEO_DURATION_SEC = 60
const MAX_RESUME_FRACTION = 0.95
const STALE_DAYS = 30

export function urlToKey(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return `yt:${v}`
      const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/)
      if (shorts) return `yt:${shorts[1]}`
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '')
      if (id) return `yt:${id}`
    }

    if (host === 'vimeo.com') {
      const id = u.pathname.match(/^\/(\d+)/)?.[1]
      if (id) return `vimeo:${id}`
    }

    const drop = new Set([
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'mc_cid', 'mc_eid', 't', 'start', 'time_continue'
    ])
    const cleanParams = new URLSearchParams()
    u.searchParams.forEach((val, key) => {
      if (!drop.has(key)) cleanParams.append(key, val)
    })
    const qs = cleanParams.toString()
    return `gen:${u.origin}${u.pathname}${qs ? '?' + qs : ''}`
  } catch {
    return null
  }
}

function validateSavedTime(value: unknown, durationValue: unknown):
  { currentTime: number; duration: number | null } | null
{
  const ct = typeof value === 'string' ? parseFloat(value) : value
  const dur = typeof durationValue === 'string' ? parseFloat(durationValue) : durationValue

  if (typeof ct !== 'number' || !isFinite(ct) || isNaN(ct) || ct < 0) {
    return null
  }
  let safeDuration: number | null = null
  if (dur !== null && dur !== undefined) {
    if (typeof dur === 'number' && isFinite(dur) && !isNaN(dur) && dur > 0) {
      safeDuration = dur
    }
  }
  return { currentTime: ct, duration: safeDuration }
}

function persistTime(key: string, currentTime: number, duration: number | null, title: string, favicon: string) {
  if (typeof currentTime !== 'number' || !isFinite(currentTime) || isNaN(currentTime)) return false
  if (duration !== null && (typeof duration !== 'number' || !isFinite(duration) || isNaN(duration))) return false
  if (currentTime < 1) return false
  if (!duration || !isFinite(duration)) return false
  if (duration < MIN_VIDEO_DURATION_SEC) return false

  if (currentTime / duration >= MAX_RESUME_FRACTION) {
    cache.delete(key)
    try {
      ensureTable()
      deleteEntryFromDb(key)
    } catch (e) {
      console.error('[aura:media] delete-on-finish failed:', e)
    }
    return false
  }

  const now = Date.now()
  cache.set(key, {
    currentTime,
    duration,
    lastUpdated: now,
    title: title || '',
    favicon: favicon || '',
  })

  try {
    ensureTable()
    writeEntryToDb(key, currentTime, duration, now, title, favicon)
    return true
  } catch (e) {
    console.error('[aura:media] write-through failed:', e)
    return false
  }
}

export function lookupTime(url: string): { currentTime: number; duration: number | null } | null {
  const key = urlToKey(url)
  if (!key) return null

  const mem = cache.get(key)
  if (mem) {
    const validated = validateSavedTime(mem.currentTime, mem.duration)
    if (validated) return validated
    cache.delete(key)
  }

  try {
    ensureTable()
    const row = getDb()
      .prepare('SELECT resume_pos, duration FROM media_playback WHERE url_key = ' + esc(key))
      .get() as { resume_pos: unknown; duration: unknown } | undefined
    if (row) {
      const validated = validateSavedTime(row.resume_pos, row.duration)
      if (validated) return validated
      try { deleteEntryFromDb(key) } catch {}
    }
  } catch (e) {
    console.error('[aura:media] lookup failed:', e)
  }
  return null
}

export function forceFlush() {
  const db = getDb()
  db.pragma('wal_checkpoint(TRUNCATE)')
}

export function gcStaleEntries() {
  try {
    ensureTable()
    const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
    getDb().exec('DELETE FROM media_playback WHERE last_updated < ' + cutoff)
  } catch (e) {
    console.error('[mediaResume] gc failed:', e)
  }
}

export function sendRestoreToTab(wc: Electron.WebContents, url: string) {
  const saved = lookupTime(url)
  if (!saved) return
  wc.send('media:restoreTime', saved)
}

export function registerMediaResumeHandlers() {
  ensureTable()

  ipcMain.on('media:timeUpdate', (_event, payload: {
    url: string
    currentTime: number
    duration: number | null
    title?: string
    favicon?: string
  }) => {
    const key = urlToKey(payload.url)
    if (!key) return
    persistTime(key, payload.currentTime, payload.duration, payload.title || '', payload.favicon || '')
  })

  ipcMain.on('media:timeUpdateSync', (event, payload: {
    url: string
    currentTime: number
    duration: number | null
    title?: string
    favicon?: string
  }) => {
    const key = urlToKey(payload.url)
    if (!key) { event.returnValue = false; return }
    const ok = persistTime(key, payload.currentTime, payload.duration, payload.title || '', payload.favicon || '')
    try { getDb().pragma('wal_checkpoint(TRUNCATE)') } catch {}
    event.returnValue = ok
  })

  ipcMain.handle('media:lookupTime', (_event, url: string) => {
    return lookupTime(url)
  })

  ipcMain.on('media:clearTime', (_event, url: string) => {
    const key = urlToKey(url)
    if (!key) return
    cache.delete(key)
    try { ensureTable(); deleteEntryFromDb(key) } catch {}
  })
}

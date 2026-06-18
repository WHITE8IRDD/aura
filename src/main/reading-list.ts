import { BrowserWindow } from 'electron'
import { getDb } from './db'

export interface ReadingItem {
  id: number
  url: string
  title: string
  excerpt: string | null
  addedAt: number
  readAt: number | null
}

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('readingList:update')
  }
}

export function addReadingItem(url: string, title: string, excerpt?: string): ReadingItem {
  const db = getDb()
  const now = Date.now()
  const info = db.prepare(
    'INSERT INTO reading_list (url, title, excerpt, added_at) VALUES (?, ?, ?, ?)'
  ).run(url, title || url, excerpt ?? null, now)
  broadcast()
  return {
    id: info.lastInsertRowid as number,
    url, title: title || url,
    excerpt: excerpt ?? null,
    addedAt: now,
    readAt: null
  }
}

export function deleteReadingItem(id: number): void {
  getDb().prepare('DELETE FROM reading_list WHERE id = ?').run(id)
  broadcast()
}

export function markRead(id: number, read: boolean): void {
  getDb().prepare('UPDATE reading_list SET read_at = ? WHERE id = ?')
    .run(read ? Date.now() : null, id)
  broadcast()
}

export function listReadingItems(filter: 'all' | 'unread' | 'read' = 'all'): ReadingItem[] {
  const db = getDb()
  let sql = `SELECT id, url, title, excerpt, added_at AS addedAt, read_at AS readAt FROM reading_list`
  if (filter === 'unread') sql += ' WHERE read_at IS NULL'
  if (filter === 'read') sql += ' WHERE read_at IS NOT NULL'
  sql += ' ORDER BY added_at DESC'
  return db.prepare(sql).all() as ReadingItem[]
}

export function clearRead(): void {
  getDb().prepare('DELETE FROM reading_list WHERE read_at IS NOT NULL').run()
  broadcast()
}

import { BrowserWindow } from 'electron'
import { getDb } from './db'

export interface Bookmark {
  id: number
  url: string
  title: string
  folderId: number | null
  createdAt: number
  sortOrder: number
}

export interface BookmarkFolder {
  id: number
  name: string
  createdAt: number
}

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('bookmarks:update')
  }
}

function nextSortOrder(folderId: number | null): number {
  const db = getDb()
  const row = (folderId === null
    ? db.prepare('SELECT MAX(sort_order) AS m FROM bookmarks WHERE folder_id IS NULL').get()
    : db.prepare('SELECT MAX(sort_order) AS m FROM bookmarks WHERE folder_id = ?').get(folderId)
  ) as { m: number | null }
  return (row.m ?? -1) + 1
}

export function addBookmark(url: string, title: string, folderId: number | null = null): Bookmark {
  const db = getDb()
  const now = Date.now()
  const sortOrder = nextSortOrder(folderId)
  const info = db
    .prepare(
      'INSERT INTO bookmarks (url, title, folder_id, created_at, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(url, title || url, folderId, now, sortOrder)
  broadcast()
  return {
    id: info.lastInsertRowid as number,
    url,
    title: title || url,
    folderId,
    createdAt: now,
    sortOrder
  }
}

export function addSeparator(folderId: number | null = null): Bookmark {
  return addBookmark('aura://separator', '|', folderId)
}

export function deleteBookmark(id: number): void {
  getDb().prepare('DELETE FROM bookmarks WHERE id = ?').run(id)
  broadcast()
}

export function updateBookmark(
  id: number,
  changes: { url?: string; title?: string; folderId?: number | null }
): void {
  const db = getDb()
  const cur = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as
    | { url: string; title: string; folder_id: number | null }
    | undefined
  if (!cur) return
  const url = changes.url ?? cur.url
  const title = changes.title ?? cur.title
  const folderId = changes.folderId !== undefined ? changes.folderId : cur.folder_id
  db.prepare('UPDATE bookmarks SET url = ?, title = ?, folder_id = ? WHERE id = ?').run(
    url,
    title,
    folderId,
    id
  )
  broadcast()
}

export function reorderBookmarks(orderedIds: number[]): void {
  const db = getDb()
  const update = db.prepare('UPDATE bookmarks SET sort_order = ? WHERE id = ?')
  db.transaction(() => {
    let i = 0
    for (const id of orderedIds) {
      update.run(i++, id)
    }
  })()
  broadcast()
}

export function listBookmarks(folderId: number | null = null): Bookmark[] {
  const db = getDb()
  const rows =
    folderId === null
      ? db
          .prepare(
            `SELECT id, url, title, folder_id AS folderId, created_at AS createdAt, sort_order AS sortOrder
             FROM bookmarks ORDER BY sort_order ASC, created_at ASC`
          )
          .all()
      : db
          .prepare(
            `SELECT id, url, title, folder_id AS folderId, created_at AS createdAt, sort_order AS sortOrder
             FROM bookmarks WHERE folder_id = ? ORDER BY sort_order ASC, created_at ASC`
          )
          .all(folderId)
  return rows as Bookmark[]
}

export function listBarBookmarks(): Bookmark[] {
  return getDb()
    .prepare(
      `SELECT id, url, title, folder_id AS folderId, created_at AS createdAt, sort_order AS sortOrder
       FROM bookmarks WHERE folder_id IS NULL ORDER BY sort_order ASC, created_at ASC`
    )
    .all() as Bookmark[]
}

export function isBookmarked(url: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM bookmarks WHERE url = ? LIMIT 1')
    .get(url) as unknown
  return row !== undefined
}

export function addFolder(name: string): BookmarkFolder {
  const db = getDb()
  const now = Date.now()
  const info = db
    .prepare('INSERT INTO bookmark_folders (name, created_at) VALUES (?, ?)')
    .run(name, now)
  broadcast()
  return { id: info.lastInsertRowid as number, name, createdAt: now }
}

export function deleteFolder(id: number): void {
  getDb().prepare('DELETE FROM bookmark_folders WHERE id = ?').run(id)
  broadcast()
}

export function listFolders(): BookmarkFolder[] {
  return getDb()
    .prepare(
      `SELECT id, name, created_at AS createdAt
       FROM bookmark_folders ORDER BY name ASC`
    )
    .all() as BookmarkFolder[]
}

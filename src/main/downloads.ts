import { app, BrowserWindow, shell, session, type DownloadItem } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { getDb } from './db'
import { getSetting } from './settings'

export interface DownloadRecord {
  id: number
  url: string
  filename: string
  savePath: string
  mimeType: string | null
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  startedAt: number
  completedAt: number | null
}

const activeDownloads = new Map<number, DownloadItem>()

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('downloads:update')
  }
}

function ensureUniqueFilename(filePath: string): string {
  if (!fs.existsSync(filePath)) return filePath
  const dir = path.dirname(filePath)
  const ext = path.extname(filePath)
  const base = path.basename(filePath, ext)
  let counter = 1
  let candidate = filePath
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${counter})${ext}`)
    counter++
  }
  return candidate
}

export function attachDownloadHandler(
  targetSession: Electron.Session,
  isPrivate: boolean = false
): void {
  targetSession.on('will-download', (_e, item) => {
    const url = item.getURL()
    const filename = item.getFilename()

    const askWhereToSave = getSetting('downloadAskWhereToSave') as boolean
    if (!askWhereToSave) {
      const customPath = getSetting('downloadPath') as string
      let saveFolder: string
      if (customPath && fs.existsSync(customPath)) {
        saveFolder = customPath
      } else {
        saveFolder = app.getPath('downloads')
      }
      const fullPath = path.join(saveFolder, filename)
      const finalPath = ensureUniqueFilename(fullPath)
      item.setSavePath(finalPath)
    }

    if (isPrivate) {
      console.log('[Aura/downloads] Ninja download — not persisting:', filename)
      return
    }

    const db = getDb()
    const savePath = item.getSavePath() || filename
    const mimeType = item.getMimeType()
    const totalBytes = item.getTotalBytes()
    const now = Date.now()

    const info = db
      .prepare(
        `INSERT INTO downloads
          (url, filename, save_path, mime_type, total_bytes, received_bytes, state, started_at)
         VALUES (?, ?, ?, ?, ?, 0, 'progressing', ?)`
      )
      .run(url, filename, savePath, mimeType, totalBytes, now)
    const id = info.lastInsertRowid as number
    activeDownloads.set(id, item)
    broadcast()

    item.on('updated', (_evt, state) => {
      const received = item.getReceivedBytes()
      const total = item.getTotalBytes()
      db.prepare(
        `UPDATE downloads
         SET received_bytes = ?, total_bytes = ?, state = ?
         WHERE id = ?`
      ).run(received, total, state === 'progressing' ? 'progressing' : 'interrupted', id)
      broadcast()
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send('downloads:progress', { id, receivedBytes: received, totalBytes: total, state })
        }
      }
    })

    item.once('done', (_evt, state) => {
      db.prepare(
        `UPDATE downloads
         SET state = ?, received_bytes = ?, completed_at = ?, save_path = ?
         WHERE id = ?`
      ).run(state, item.getReceivedBytes(), Date.now(), item.getSavePath(), id)
      activeDownloads.delete(id)
      broadcast()
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send('downloads:progress', { id, receivedBytes: item.getReceivedBytes(), totalBytes: item.getTotalBytes(), state: state })
        }
      }
    })
  })
}

export function listDownloads(limit = 200): DownloadRecord[] {
  return getDb()
    .prepare(
      `SELECT id, url, filename, save_path AS savePath, mime_type AS mimeType,
              total_bytes AS totalBytes, received_bytes AS receivedBytes,
              state, started_at AS startedAt, completed_at AS completedAt
       FROM downloads ORDER BY started_at DESC LIMIT ?`
    )
    .all(limit) as DownloadRecord[]
}

export function getDownloadItem(id: number): DownloadItem | undefined {
  return activeDownloads.get(id)
}

export function pauseDownload(id: number): void {
  const item = activeDownloads.get(id)
  if (item && item.canResume()) item.pause()
}

export function resumeDownload(id: number): void {
  const item = activeDownloads.get(id)
  if (item) item.resume()
}

export function cancelDownload(id: number): void {
  const item = activeDownloads.get(id)
  if (item) item.cancel()
}

export function getDownloadRecord(id: number): DownloadRecord | null {
  const row = getDb()
    .prepare(
      `SELECT id, url, filename, save_path AS savePath, mime_type AS mimeType,
              total_bytes AS totalBytes, received_bytes AS receivedBytes,
              state, started_at AS startedAt, completed_at AS completedAt
       FROM downloads WHERE id = ?`
    )
    .get(id) as DownloadRecord | undefined
  return row ?? null
}

export function openDownloadedFile(savePath: string): void {
  shell.openPath(savePath).catch(() => {})
}

export function revealDownloadedFile(savePath: string): void {
  shell.showItemInFolder(savePath)
}

export function deleteDownloadRecord(id: number): void {
  getDb().prepare('DELETE FROM downloads WHERE id = ?').run(id)
  broadcast()
}

export function clearCompletedDownloads(): void {
  getDb()
    .prepare("DELETE FROM downloads WHERE state IN ('completed','cancelled','interrupted')")
    .run()
  broadcast()
}

export function setupDownloads(): void {
  attachDownloadHandler(session.defaultSession)
}

import { getDb } from './db'

export interface HistoryEntry {
  url: string
  title: string
  visitedAt: number
  visitCount: number
}

/**
 * History store — SQLite-backed.
 * STAGE 9.5: hardened isPrivate guards. Every public mutation function
 * accepts an isPrivate parameter and bails out before touching the DB.
 */

export function recordVisit(url: string, title: string, isPrivate = false): void {
  if (isPrivate) return
  if (!url.startsWith('http://') && !url.startsWith('https://')) return

  const db = getDb()
  const now = Date.now()
  const safeTitle = title || url

  const upsert = db.prepare(`
    INSERT INTO history (url, title, visited_at, visit_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(url) DO UPDATE SET
      title = CASE WHEN excluded.title <> '' THEN excluded.title ELSE history.title END,
      visited_at = excluded.visited_at,
      visit_count = history.visit_count + 1
  `)
  upsert.run(url, safeTitle, now)
}

export function updateTitle(url: string, title: string, isPrivate = false): void {
  if (isPrivate) return
  if (!title) return
  const db = getDb()
  db.prepare('UPDATE history SET title = ? WHERE url = ?').run(title, url)
}

export function search(query: string, limit = 6): HistoryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const db = getDb()
  const candidates = db
    .prepare(
      `SELECT url, title, visited_at AS visitedAt, visit_count AS visitCount
       FROM history
       WHERE LOWER(url) LIKE ? OR LOWER(title) LIKE ?
       LIMIT 200`
    )
    .all(`%${q}%`, `%${q}%`) as HistoryEntry[]

  const now = Date.now()
  const dayMs = 86_400_000

  const scored = candidates.map((entry) => {
    const url = entry.url.toLowerCase()
    const title = entry.title.toLowerCase()
    let score = 0

    try {
      const host = new URL(entry.url).hostname.replace(/^www\./, '')
      if (host.startsWith(q)) score += 100
      else if (host.includes(q)) score += 60
    } catch {}

    if (url.includes(q)) score += 40
    if (title.includes(q)) score += 30

    score += Math.log2(entry.visitCount + 1) * 5

    const age = now - entry.visitedAt
    if (age < dayMs) score += 20
    else if (age < dayMs * 7) score += 10

    return { ...entry, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(({ score: _s, ...rest }) => rest)
}

export function recent(limit = 6): HistoryEntry[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT url, title, visited_at AS visitedAt, visit_count AS visitCount
       FROM history
       ORDER BY visited_at DESC
       LIMIT ?`
    )
    .all(limit) as HistoryEntry[]
}

export function all(limit = 500): HistoryEntry[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT url, title, visited_at AS visitedAt, visit_count AS visitCount
       FROM history
       ORDER BY visited_at DESC
       LIMIT ?`
    )
    .all(limit) as HistoryEntry[]
}

export function deleteEntry(url: string): void {
  const db = getDb()
  db.prepare('DELETE FROM history WHERE url = ?').run(url)
}

export function clear(): void {
  const db = getDb()
  db.prepare('DELETE FROM history').run()
}

export function count(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) AS c FROM history').get() as { c: number }
  return row.c
}

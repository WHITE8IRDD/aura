import { getDb } from './db'

let initialized = false

function init(): void {
  if (initialized) return
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS zoom_levels (
      hostname TEXT PRIMARY KEY,
      factor REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  initialized = true
}

export function getZoomForHost(hostname: string): number {
  init()
  const row = getDb()
    .prepare('SELECT factor FROM zoom_levels WHERE hostname = ?')
    .get(hostname) as { factor: number } | undefined
  return row?.factor ?? 1.0
}

export function setZoomForHost(hostname: string, factor: number): void {
  init()
  const clamped = Math.max(0.25, Math.min(5.0, factor))
  getDb()
    .prepare(
      `INSERT INTO zoom_levels (hostname, factor, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(hostname) DO UPDATE SET factor = excluded.factor, updated_at = excluded.updated_at`
    )
    .run(hostname, clamped, Date.now())
}

export function clearZoomForHost(hostname: string): void {
  init()
  getDb().prepare('DELETE FROM zoom_levels WHERE hostname = ?').run(hostname)
}

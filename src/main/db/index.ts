import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { runMigrations } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'aura.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -32000')
  db.pragma('foreign_keys = ON')

  runMigrations(db)

  console.log('[Aura/db] Opened at', dbPath)
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

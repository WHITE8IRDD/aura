import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { runMigrations } from './schema'
import { unlinkSync } from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  app.name = 'Aura'
  const dbPath = join(app.getPath('userData'), 'aura.db')

  // Delete stale WAL/SHM files before opening.
  // If the WAL from a previous Electron session was not checkpointed (due to crash/kill),
  // it can contain stale/corrupted data that overrides the correct values in the main file
  // when WAL mode is enabled. These files cannot be deleted while held by a zombie process,
  // but we try anyway — if they survive, a WAL checkpoint on next open will fix them.
  for (const suffix of ['-wal', '-shm']) {
    const p = dbPath + suffix
    try { unlinkSync(p) } catch {}
  }

  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -32000')
  db.pragma('foreign_keys = ON')

  db.pragma('wal_checkpoint(TRUNCATE)')

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

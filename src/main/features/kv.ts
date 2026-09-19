import { getDb } from '../db'
import { FEATURES_TABLES_DDL } from '../db/schema'

let tablesEnsured = false

/**
 * Idempotent safety net: guarantees the features tables exist on the live
 * handle even if a database skipped the versioned migration (e.g. restored
 * or version-desynced userData). Runs once per process; CREATE TABLE IF
 * NOT EXISTS is a no-op when the migration already applied.
 */
export function ensureFeaturesTables(): void {
  if (tablesEnsured) return
  tablesEnsured = true
  try {
    getDb().exec(FEATURES_TABLES_DDL)
  } catch (err) {
    tablesEnsured = false
    throw err
  }
}

/** Simple key/value helpers over the shared `kv` table (JSON values). */
export function kvGet<T>(key: string, fallback: T): T {
  try {
    const row = getDb()
      .prepare('SELECT value FROM kv WHERE key = ?')
      .get(key) as { value: string } | undefined
    if (!row) return fallback
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}

export function kvSet(key: string, value: unknown): void {
  getDb()
    .prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value))
}

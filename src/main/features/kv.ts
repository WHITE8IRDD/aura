import { getDb } from '../db'

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

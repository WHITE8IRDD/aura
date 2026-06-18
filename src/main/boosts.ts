import { BrowserWindow, type WebContents } from 'electron'
import { getDb } from './db'

export interface Boost {
  id: number
  host: string
  name: string
  css: string
  enabled: boolean
  createdAt: number
}

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('boosts:update')
  }
}

export function addBoost(host: string, name: string, css: string): Boost {
  const db = getDb()
  const now = Date.now()
  const info = db.prepare(
    'INSERT INTO boosts (host, name, css, enabled, created_at) VALUES (?, ?, ?, 1, ?)'
  ).run(host.toLowerCase(), name, css, now)
  broadcast()
  return {
    id: info.lastInsertRowid as number,
    host: host.toLowerCase(),
    name, css, enabled: true, createdAt: now
  }
}

export function updateBoost(id: number, changes: Partial<Pick<Boost, 'host' | 'name' | 'css' | 'enabled'>>): void {
  const db = getDb()
  const cur = db.prepare('SELECT * FROM boosts WHERE id = ?').get(id) as
    | { host: string; name: string; css: string; enabled: number } | undefined
  if (!cur) return
  const host = changes.host?.toLowerCase() ?? cur.host
  const name = changes.name ?? cur.name
  const css = changes.css ?? cur.css
  const enabled = changes.enabled !== undefined ? (changes.enabled ? 1 : 0) : cur.enabled
  db.prepare('UPDATE boosts SET host = ?, name = ?, css = ?, enabled = ? WHERE id = ?')
    .run(host, name, css, enabled, id)
  broadcast()
}

export function deleteBoost(id: number): void {
  getDb().prepare('DELETE FROM boosts WHERE id = ?').run(id)
  broadcast()
}

export function listBoosts(): Boost[] {
  const rows = getDb().prepare(
    `SELECT id, host, name, css, enabled, created_at AS createdAt FROM boosts ORDER BY host, name`
  ).all() as Array<Omit<Boost, 'enabled'> & { enabled: number }>
  return rows.map((r) => ({ ...r, enabled: !!r.enabled }))
}

/** Get enabled boosts matching this hostname (exact match or trailing-domain match). */
export function getBoostsForHost(hostname: string): Boost[] {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  const all = listBoosts().filter((b) => b.enabled)
  return all.filter((b) => {
    const bHost = b.host.replace(/^www\./, '')
    return host === bHost || host.endsWith('.' + bHost)
  })
}

/**
 * Inject all matching boosts' CSS into a page's WebContents.
 * Returns the inserted CSS keys so callers can later remove them.
 */
export async function applyBoostsTo(wc: WebContents, hostname: string): Promise<string[]> {
  const matches = getBoostsForHost(hostname)
  const keys: string[] = []
  for (const boost of matches) {
    try {
      const key = await wc.insertCSS(boost.css, { cssOrigin: 'user' })
      keys.push(key)
    } catch (err) {
      console.warn('[Aura/boosts] insertCSS failed for boost', boost.name, err)
    }
  }
  return keys
}

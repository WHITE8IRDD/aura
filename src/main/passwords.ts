import { safeStorage } from 'electron'
import { randomInt } from 'crypto'
import { getDb } from './db/index'

export interface CredentialRecord {
  id: number
  origin: string
  username: string
  password: string
  title: string
  created_at: number
  updated_at: number
  last_used: number | null
}

export function setupPasswordsTable(): void {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      origin      TEXT NOT NULL,
      username    TEXT NOT NULL,
      password    TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      last_used   INTEGER,
      UNIQUE(origin, username)
    );
    CREATE INDEX IF NOT EXISTS idx_credentials_origin ON credentials(origin);

    CREATE TABLE IF NOT EXISTS password_blocklist (
      origin TEXT PRIMARY KEY
    );
  `)
}

function assertSafeOrigin(origin: string): void {
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    throw new Error('Invalid origin — cannot parse as URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Refusing credential storage for scheme: ${parsed.protocol}`)
  }
}

export class EncryptionUnavailableError extends Error {
  constructor() {
    super('OS-level credential encryption is unavailable on this system.')
    this.name = 'EncryptionUnavailableError'
  }
}

function encrypt(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new EncryptionUnavailableError()
  }
  return safeStorage.encryptString(plaintext).toString('base64')
}

function decrypt(ciphertext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new EncryptionUnavailableError()
  }
  try {
    return safeStorage.decryptString(Buffer.from(ciphertext, 'base64'))
  } catch {
    return ''
  }
}

export function saveCredential(
  origin: string,
  username: string,
  password: string,
  title: string
): number {
  assertSafeOrigin(origin)
  const db = getDb()
  const now = Date.now()
  const encrypted = encrypt(password)

  const existing = db
    .prepare(`SELECT id FROM credentials WHERE origin = ? AND username = ?`)
    .get(origin, username) as { id: number } | undefined

  if (existing) {
    db.prepare(`
      UPDATE credentials SET password = ?, title = ?, updated_at = ? WHERE id = ?
    `).run(encrypted, title, now, existing.id)
    return existing.id
  }

  const result = db.prepare(`
    INSERT INTO credentials (origin, username, password, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(origin, username, encrypted, title, now, now)

  return result.lastInsertRowid as number
}

export function getCredentialsForOrigin(origin: string): CredentialRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM credentials WHERE origin = ? ORDER BY last_used DESC NULLS LAST`)
    .all(origin) as CredentialRecord[]
  return rows.map(r => ({ ...r, password: decrypt(r.password) }))
}

export function getAllCredentials(): CredentialRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM credentials ORDER BY origin ASC, username ASC`)
    .all() as CredentialRecord[]
  return rows.map(r => ({ ...r, password: decrypt(r.password) }))
}

export function getCredentialById(id: number): CredentialRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM credentials WHERE id = ?`)
    .get(id) as CredentialRecord | undefined
  if (!row) return null
  return { ...row, password: decrypt(row.password) }
}

export function deleteCredential(id: number): void {
  getDb().prepare(`DELETE FROM credentials WHERE id = ?`).run(id)
}

export function updateCredential(id: number, username: string, password: string): void {
  getDb().prepare(`
    UPDATE credentials SET username = ?, password = ?, updated_at = ? WHERE id = ?
  `).run(username, encrypt(password), Date.now(), id)
}

export function markCredentialUsed(id: number): void {
  getDb()
    .prepare(`UPDATE credentials SET last_used = ? WHERE id = ?`)
    .run(Date.now(), id)
}

export function searchCredentials(query: string): CredentialRecord[] {
  const like = `%${query}%`
  const rows = getDb().prepare(`
    SELECT * FROM credentials
    WHERE origin LIKE ? OR username LIKE ? OR title LIKE ?
    ORDER BY origin ASC
  `).all(like, like, like) as CredentialRecord[]
  return rows.map(r => ({ ...r, password: decrypt(r.password) }))
}

export function checkDuplicate(origin: string, username: string): boolean {
  return !!getDb()
    .prepare(`SELECT id FROM credentials WHERE origin = ? AND username = ?`)
    .get(origin, username)
}

export function addToBlocklist(origin: string): void {
  assertSafeOrigin(origin)
  getDb()
    .prepare(`INSERT OR IGNORE INTO password_blocklist (origin) VALUES (?)`)
    .run(origin)
}

export function isBlocklisted(origin: string): boolean {
  return !!getDb()
    .prepare(`SELECT origin FROM password_blocklist WHERE origin = ?`)
    .get(origin)
}

export function removeFromBlocklist(origin: string): void {
  getDb()
    .prepare(`DELETE FROM password_blocklist WHERE origin = ?`)
    .run(origin)
}

export function generateSecurePassword(length = 20): string {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower   = 'abcdefghijklmnopqrstuvwxyz'
  const digits  = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const all     = upper + lower + digits + symbols

  const pick = (charset: string): string => charset[randomInt(charset.length)]
  const chars: string[] = [pick(upper), pick(lower), pick(digits), pick(symbols)]

  for (let i = chars.length; i < length; i++) {
    chars.push(pick(all))
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

export interface PasswordHealth {
  id: number
  origin: string
  username: string
  issue: 'reused' | 'weak' | 'stale'
}

export function analyzePasswordHealth(): PasswordHealth[] {
  const all = getAllCredentials()
  const issues: PasswordHealth[] = []
  const ONE_YEAR = 365 * 24 * 60 * 60 * 1000

  const passwordMap = new Map<string, CredentialRecord[]>()
  for (const cred of all) {
    const existing = passwordMap.get(cred.password) || []
    existing.push(cred)
    passwordMap.set(cred.password, existing)
  }
  for (const [, group] of passwordMap) {
    if (group.length > 1) {
      for (const cred of group) {
        issues.push({ id: cred.id, origin: cred.origin, username: cred.username, issue: 'reused' })
      }
    }
  }

  for (const cred of all) {
    const p = cred.password
    const isWeak = p.length < 10 ||
      !/[A-Z]/.test(p) ||
      !/[0-9]/.test(p) ||
      !/[^A-Za-z0-9]/.test(p)
    if (isWeak && !issues.find(i => i.id === cred.id && i.issue === 'weak')) {
      issues.push({ id: cred.id, origin: cred.origin, username: cred.username, issue: 'weak' })
    }
  }

  const oneYearAgo = Date.now() - ONE_YEAR
  for (const cred of all) {
    if (cred.updated_at < oneYearAgo) {
      issues.push({ id: cred.id, origin: cred.origin, username: cred.username, issue: 'stale' })
    }
  }

  return issues
}

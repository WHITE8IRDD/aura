import { safeStorage } from 'electron'
import { randomInt, webcrypto } from 'crypto'
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
  `)
}

// ── Origin validation ─────────────────────────────────────────────────────
// Never trust a raw string as an "origin" without checking scheme.
function assertSafeOrigin(origin: string): void {
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    throw new Error('Invalid origin')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Refusing to store credential for scheme ${parsed.protocol}`)
  }
}

// ── Encryption ────────────────────────────────────────────────────────────
// IMPORTANT: we do NOT silently degrade to base64. If OS-level encryption
// (Keychain / DPAPI / libsecret) isn't available, we refuse to store the
// password in plaintext-equivalent form. Caller must surface this to the
// user instead of pretending the save succeeded securely.
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
    // Corrupt row or wrong OS keychain — do not leak partial data.
    return ''
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────
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
    .prepare(`SELECT * FROM credentials WHERE origin = ? ORDER BY last_used DESC`)
    .all(origin) as CredentialRecord[]
  return rows.map(r => ({ ...r, password: decrypt(r.password) }))
}

export function getAllCredentials(): CredentialRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM credentials ORDER BY origin ASC, username ASC`)
    .all() as CredentialRecord[]
  return rows.map(r => ({ ...r, password: decrypt(r.password) }))
}

export function deleteCredential(id: number): void {
  getDb().prepare(`DELETE FROM credentials WHERE id = ?`).run(id)
}

export function updateCredential(id: number, username: string, password: string): void {
  getDb().prepare(`
    UPDATE credentials SET username = ?, password = ?, updated_at = ? WHERE id = ?
  `).run(username, encrypt(password), Date.now(), id)
}

// FIX for bug #4: takes the real id, no more hardcoded 0.
export function markCredentialUsed(id: number): void {
  getDb().prepare(`UPDATE credentials SET last_used = ? WHERE id = ?`).run(Date.now(), id)
}

export function searchCredentials(query: string): CredentialRecord[] {
  const like = `%${query}%`
  const rows = getDb().prepare(`
    SELECT * FROM credentials WHERE origin LIKE ? OR username LIKE ? OR title LIKE ?
    ORDER BY origin ASC
  `).all(like, like, like) as CredentialRecord[]
  return rows.map(r => ({ ...r, password: decrypt(r.password) }))
}

export function checkDuplicate(origin: string, username: string): boolean {
  return !!getDb()
    .prepare(`SELECT id FROM credentials WHERE origin = ? AND username = ?`)
    .get(origin, username)
}

// ── Secure password generator ──────────────────────────────────────────────
// Fix for bugs #1 and #2: uses crypto.randomInt (rejection-sampled, no
// modulo bias) for every character AND for the Fisher–Yates shuffle.
export function generateSecurePassword(length = 20): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const all = upper + lower + digits + symbols

  const pick = (charset: string) => charset[randomInt(charset.length)]

  const chars: string[] = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  for (let i = chars.length; i < length; i++) chars.push(pick(all))

  // Fisher–Yates using crypto randomness (NOT Math.random / Array.sort trick)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

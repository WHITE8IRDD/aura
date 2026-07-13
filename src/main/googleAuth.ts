import { shell, BrowserWindow, safeStorage } from 'electron'
import crypto from 'crypto'
import http from 'http'
import { getDb } from './db/index'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const SCOPES = 'openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('[googleAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env')
}

export interface GoogleTokens {
  access_token: string
  id_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

export interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture: string
  given_name?: string
  family_name?: string
  locale?: string
}

export interface GoogleAccount {
  id: string
  email: string
  name: string
  picture: string
  signed_in_at: number
  last_refreshed: number
}

export function setupGoogleAuthTable(): void {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS google_accounts (
      id             TEXT PRIMARY KEY,
      email          TEXT NOT NULL,
      name           TEXT NOT NULL DEFAULT '',
      picture        TEXT NOT NULL DEFAULT '',
      access_token   TEXT NOT NULL,
      refresh_token  TEXT,
      id_token       TEXT NOT NULL,
      expires_at     INTEGER NOT NULL,
      signed_in_at   INTEGER NOT NULL,
      last_refreshed INTEGER NOT NULL
    );
  `)
}

class AuthEncryptionError extends Error {
  constructor() { super('safeStorage unavailable'); this.name = 'AuthEncryptionError' }
}

function encryptToken(token: string): string {
  if (!safeStorage.isEncryptionAvailable()) throw new AuthEncryptionError()
  return safeStorage.encryptString(token).toString('base64')
}

function decryptToken(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) throw new AuthEncryptionError()
  try { return safeStorage.decryptString(Buffer.from(encrypted, 'base64')) }
  catch { return '' }
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier(): string { return base64url(crypto.randomBytes(32)) }
function generateCodeChallenge(v: string): string { return base64url(crypto.createHash('sha256').update(v).digest()) }
function generateState(): string { return base64url(crypto.randomBytes(16)) }

interface PendingAuth {
  verifier: string
  state: string
  createdAt: number
  server: http.Server
  port: number
}

let pendingAuth: PendingAuth | null = null
const AUTH_TIMEOUT_MS = 10 * 60 * 1000

function isPendingAuthExpired(): boolean {
  if (!pendingAuth) return true
  return Date.now() - pendingAuth.createdAt > AUTH_TIMEOUT_MS
}

const SUCCESS_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Aura — Google Sign-In</title><style>body{background:#0a0a0c;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}.c h1{font-size:24px;margin-bottom:8px}.c p{color:#888;font-size:14px;margin:0}.spinner{width:24px;height:24px;border:3px solid #333;border-top-color:#0a84ff;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><div class="c"><div class="spinner"></div><h1>Signing you in&hellip;</h1><p>You can close this window.</p></div></body></html>`

async function exchangeCode(code: string, verifier: string): Promise<GoogleTokens | { error: string }> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: `http://127.0.0.1:${pendingAuth!.port}`
      })
    })
    if (!res.ok) return { error: `token-exchange-failed: ${res.status}` }
    return await res.json() as GoogleTokens
  } catch (err) {
    return { error: `network: ${(err as Error).message}` }
  }
}

async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo | { error: string }> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    if (!res.ok) return { error: 'userinfo-failed' }
    return await res.json() as GoogleUserInfo
  } catch (err) {
    return { error: `userinfo: ${(err as Error).message}` }
  }
}

function saveTokens(userInfo: GoogleUserInfo, tokens: GoogleTokens): GoogleAccount | { error: string } {
  try {
    const now = Date.now()
    const expiresAt = now + (tokens.expires_in * 1000)
    const db = getDb()
    db.prepare(`
      INSERT OR REPLACE INTO google_accounts
        (id, email, name, picture, access_token, refresh_token, id_token,
         expires_at, signed_in_at, last_refreshed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userInfo.sub, userInfo.email, userInfo.name, userInfo.picture,
      encryptToken(tokens.access_token),
      tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      encryptToken(tokens.id_token),
      expiresAt, now, now
    )
    return {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      signed_in_at: now,
      last_refreshed: now
    }
  } catch (err) {
    return { error: `storage: ${(err as Error).message}` }
  }
}

function broadcastSignIn(account: GoogleAccount): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('google:signed-in', account)
  }
}

let oauthTabId: number | null = null
let oauthTabOpener: ((url: string) => number | void) | null = null
let oauthTabCloser: ((tabId: number) => void) | null = null

export function setOAuthTabOpener(
  opener: (url: string) => number | void,
  closer: (tabId: number) => void
): void {
  // Replaces shell.openExternal with in-browser tab creation
  // so Google session cookies are set in Aura's webview session
  oauthTabOpener = opener
  oauthTabCloser = closer
}

export function startGoogleSignIn(): void {
  if (!CLIENT_ID) {
    console.error('[googleAuth] Cannot start sign-in — CLIENT_ID missing')
    return
  }

  const verifier = generateCodeVerifier()
  const state = generateState()
  const challenge = generateCodeChallenge(verifier)

  // Start local HTTP server for the redirect
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`)
    const code = url.searchParams.get('code')
    const returnedState = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' })
      res.end(`<h1>Auth Error: ${error}</h1>`)
      if (oauthTabId !== null && oauthTabCloser) oauthTabCloser(oauthTabId)
      cleanup()
      return
    }

    if (!code || returnedState !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html' })
      res.end('<h1>Invalid callback</h1>')
      if (oauthTabId !== null && oauthTabCloser) oauthTabCloser(oauthTabId)
      cleanup()
      return
    }

    // Respond immediately so the tab doesn't hang
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(SUCCESS_HTML)

    // Exchange code for tokens (async — tab already has success page)
    const tokensOrErr = await exchangeCode(code, verifier)
    if ('error' in tokensOrErr) {
      console.error('[googleAuth] Token exchange failed:', tokensOrErr.error)
      broadcastSignIn({ id: '', email: '', name: '', picture: '', signed_in_at: 0, last_refreshed: 0 })
      if (oauthTabId !== null && oauthTabCloser) oauthTabCloser(oauthTabId)
      cleanup()
      return
    }
    const tokens = tokensOrErr as GoogleTokens

    // Fetch user info
    const userInfoOrErr = await fetchUserInfo(tokens.access_token)
    if ('error' in userInfoOrErr) {
      console.error('[googleAuth] Userinfo failed:', userInfoOrErr.error)
      if (oauthTabId !== null && oauthTabCloser) oauthTabCloser(oauthTabId)
      cleanup()
      return
    }
    const userInfo = userInfoOrErr as GoogleUserInfo

    // Save to DB
    const accountOrErr = saveTokens(userInfo, tokens)
    if ('error' in accountOrErr) {
      console.error('[googleAuth] Storage failed:', accountOrErr.error)
      if (oauthTabId !== null && oauthTabCloser) oauthTabCloser(oauthTabId)
      cleanup()
      return
    }

    // Close the OAuth tab and notify renderers
    if (oauthTabId !== null && oauthTabCloser) oauthTabCloser(oauthTabId)
    broadcastSignIn(accountOrErr)
    cleanup()
  })

  const port = 0 // random available port
  server.listen(port, '127.0.0.1', () => {
    const addr = server.address()
    const actualPort = typeof addr === 'object' && addr ? addr.port : 0

    pendingAuth = { verifier, state, createdAt: Date.now(), server, port: actualPort }

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `http://127.0.0.1:${actualPort}`,
      response_type: 'code',
      scope: SCOPES,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent'
    })

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    // Open in Aura tab (sets session cookies) instead of system browser
    if (oauthTabOpener) {
      const tabId = oauthTabOpener(oauthUrl)
      if (tabId !== undefined && tabId !== null) {
        oauthTabId = tabId as number
      }
    } else {
      shell.openExternal(oauthUrl)
    }
  })
}

function cleanup(): void {
  if (pendingAuth) {
    try { pendingAuth.server.close() } catch {}
    pendingAuth = null
  }
}

export async function handleOAuthCallback(_deepLink: string): Promise<{
  ok: boolean; reason?: string; account?: GoogleAccount
}> {
  // No longer needed — the local HTTP server handles the callback
  return { ok: false, reason: 'http-server-mode' }
}

export async function refreshGoogleToken(accountId: string): Promise<boolean> {
  const db = getDb()
  const row = db.prepare(`SELECT refresh_token FROM google_accounts WHERE id = ?`)
    .get(accountId) as { refresh_token: string | null } | undefined
  if (!row || !row.refresh_token) return false

  const refreshToken = decryptToken(row.refresh_token)
  if (!refreshToken) return false

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })
    if (!res.ok) return false
    const tokens = await res.json() as GoogleTokens
    const now = Date.now()
    db.prepare(`
      UPDATE google_accounts
      SET access_token = ?, id_token = ?, expires_at = ?, last_refreshed = ?
      WHERE id = ?
    `).run(
      encryptToken(tokens.access_token),
      encryptToken(tokens.id_token),
      now + (tokens.expires_in * 1000),
      now, accountId
    )
    return true
  } catch { return false }
}

export function listGoogleAccounts(): GoogleAccount[] {
  return getDb().prepare(`
    SELECT id, email, name, picture, signed_in_at, last_refreshed
    FROM google_accounts ORDER BY signed_in_at DESC
  `).all() as GoogleAccount[]
}

export function getGoogleAccount(id: string): GoogleAccount | null {
  const row = getDb().prepare(`
    SELECT id, email, name, picture, signed_in_at, last_refreshed
    FROM google_accounts WHERE id = ?
  `).get(id) as GoogleAccount | undefined
  return row ?? null
}

export async function getGoogleAccessToken(accountId: string): Promise<string | null> {
  const db = getDb()
  const row = db.prepare(`SELECT access_token, expires_at FROM google_accounts WHERE id = ?`)
    .get(accountId) as { access_token: string; expires_at: number } | undefined
  if (!row) return null

  if (Date.now() >= row.expires_at - 60_000) {
    const ok = await refreshGoogleToken(accountId)
    if (!ok) return null
    const updated = db.prepare(`SELECT access_token FROM google_accounts WHERE id = ?`)
      .get(accountId) as { access_token: string } | undefined
    if (!updated) return null
    return decryptToken(updated.access_token)
  }
  return decryptToken(row.access_token)
}

export async function signOutGoogleAccount(accountId: string): Promise<void> {
  const db = getDb()
  const row = db.prepare(`SELECT access_token FROM google_accounts WHERE id = ?`)
    .get(accountId) as { access_token: string } | undefined

  if (row) {
    try {
      const token = decryptToken(row.access_token)
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    } catch { /* best effort */ }
  }

  db.prepare(`DELETE FROM google_accounts WHERE id = ?`).run(accountId)

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('google:signed-out', accountId)
  }
}

export function cancelPendingAuth(): void { cleanup() }

import { app, session, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { readFile, mkdir, readdir, copyFile, rm, rename } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import AdmZip from 'adm-zip'
import { getDb } from './db'

export interface ExtensionRecord {
  id: string
  name: string
  version: string
  description: string
  author: string
  homeUrl: string
  iconPath: string
  sourceType: 'unpacked' | 'crx'
  sourcePath: string
  enabled: number
  installed_at: number
}

function extensionsDir(): string {
  return join(app.getPath('userData'), 'extensions')
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
}

function extDir(id: string): string {
  return join(extensionsDir(), id)
}

function tmpDir(): string {
  return join(extensionsDir(), `_tmp_${randomUUID()}`)
}

function db(): ReturnType<typeof getDb> {
  return getDb()
}

// ─── CRX header parsing ───────────────────────────────────────

function parseCrxHeader(buf: Buffer): { zipOffset: number } {
  const magic = buf.slice(0, 4).toString()
  if (magic !== 'Cr24') throw new Error('Not a valid CRX file (magic != Cr24)')
  const version = buf.readUInt32LE(4)
  if (version === 2) {
    const pubkeyLen = buf.readUInt32LE(8)
    const sigLen = buf.readUInt32LE(12)
    return { zipOffset: 16 + pubkeyLen + sigLen }
  } else if (version === 3) {
    const headerLen = buf.readUInt32LE(8)
    return { zipOffset: 12 + headerLen }
  }
  throw new Error(`Unsupported CRX version: ${version}`)
}

// ─── Icon resolution ──────────────────────────────────────────

function findIcon(dir: string): string {
  const candidates = ['icon.png', 'icon128.png', 'icon_128.png', 'icon-128.png']
  for (const name of candidates) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  const iconsDir = join(dir, 'icons')
  if (existsSync(iconsDir)) {
    for (const name of ['icon128.png', 'icon_128.png', 'icon-128.png', 'icon.png']) {
      const p = join(iconsDir, name)
      if (existsSync(p)) return p
    }
  }
  return ''
}

// ─── Database ─────────────────────────────────────────────────

function listDB(): ExtensionRecord[] {
  return db().prepare('SELECT * FROM extensions ORDER BY installed_at ASC').all() as ExtensionRecord[]
}

function getDB(id: string): ExtensionRecord | undefined {
  return db().prepare('SELECT * FROM extensions WHERE id = ?').get(id) as ExtensionRecord | undefined
}

function upsertDB(rec: ExtensionRecord): void {
  db().prepare(`
    INSERT INTO extensions (id, name, version, description, author, homeUrl, iconPath, sourceType, sourcePath, enabled, installed_at)
    VALUES (@id, @name, @version, @description, @author, @homeUrl, @iconPath, @sourceType, @sourcePath, @enabled, @installed_at)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, version=@version, description=@description, author=@author, homeUrl=@homeUrl,
      iconPath=@iconPath, sourceType=@sourceType, sourcePath=@sourcePath, enabled=@enabled
  `).run(rec)
}

function deleteDB(id: string): void {
  db().prepare('DELETE FROM extensions WHERE id = ?').run(id)
}

function setEnabledDB(id: string, enabled: number): void {
  db().prepare('UPDATE extensions SET enabled = ? WHERE id = ?').run(enabled, id)
}

// ─── Session operations ──────────────────────────────────────

async function loadIntoSession(dir: string): Promise<{ id: string } | null> {
  try {
    const ext = await session.defaultSession.loadExtension(dir)
    return { id: ext.id }
  } catch (err) {
    console.error('[ext] loadExtension failed for', dir, err)
    return null
  }
}

function unloadFromSession(id: string): void {
  try {
    session.defaultSession.removeExtension(id)
  } catch (err) {
    console.error('[ext] removeExtension failed for', id, err)
  }
}

function isLoadedInSession(id: string): boolean {
  return session.defaultSession.getAllExtensions().some(e => e.id === id)
}

// ─── Install unpacked ────────────────────────────────────────

export async function installUnpacked(sourcePath: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const manifestPath = join(sourcePath, 'manifest.json')
  if (!existsSync(manifestPath)) return { success: false, error: 'No manifest.json found in folder' }

  let manifest: Record<string, unknown>
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch {
    return { success: false, error: 'Invalid manifest.json' }
  }

  const name = String(manifest.name ?? 'Unnamed Extension')
  const version = String(manifest.version ?? '0.0.0')

  // Load from source to verify + get ID
  const sessionResult = await loadIntoSession(sourcePath)
  if (!sessionResult) return { success: false, error: 'Failed to load extension (invalid manifest or missing permissions)' }

  const id = sessionResult.id
  unloadFromSession(id)

  const final = extDir(id)
  if (existsSync(final)) return { success: false, error: `Extension "${name}" (${id}) is already installed` }

  await ensureDir(extensionsDir())
  try {
    await copyDir(sourcePath, final)
  } catch (err) {
    await rm(final, { recursive: true, force: true }).catch(() => {})
    return { success: false, error: `Failed to copy extension: ${(err as Error).message}` }
  }

  // Load from final location
  await loadIntoSession(final)

  const description = String(manifest.description ?? '')
  const author = typeof manifest.author === 'string' ? manifest.author : ''
  const homeUrl = String(manifest.homepage_url ?? '')
  const iconPath = findIcon(final)

  upsertDB({
    id, name, version, description, author, homeUrl,
    iconPath, sourceType: 'unpacked', sourcePath,
    enabled: 1, installed_at: Math.floor(Date.now() / 1000)
  })

  return { success: true, id }
}

// ─── Install CRX ─────────────────────────────────────────────

export async function installCrx(crxPath: string): Promise<{ success: boolean; id?: string; error?: string }> {
  let crxBuf: Buffer
  try {
    crxBuf = await readFile(crxPath)
  } catch (err) {
    return { success: false, error: `Cannot read CRX file: ${(err as Error).message}` }
  }

  let zipOffset: number
  try {
    zipOffset = parseCrxHeader(crxBuf).zipOffset
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  const zipBuf = crxBuf.slice(zipOffset)
  let zip: AdmZip
  try {
    zip = new AdmZip(zipBuf)
  } catch {
    return { success: false, error: 'Invalid ZIP data in CRX payload' }
  }

  // Check manifest before extracting
  const manifestEntry = zip.getEntry('manifest.json')
  if (!manifestEntry) return { success: false, error: 'No manifest.json found in CRX' }

  let manifest: Record<string, unknown>
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf-8'))
  } catch {
    return { success: false, error: 'Invalid manifest.json in CRX' }
  }

  const name = String(manifest.name ?? 'Unnamed Extension')
  const version = String(manifest.version ?? '0.0.0')

  // Extract to temp dir
  const tmp = tmpDir()
  await ensureDir(tmp)
  try {
    zip.extractAllTo(tmp, true)
  } catch (err) {
    await rm(tmp, { recursive: true, force: true }).catch(() => {})
    return { success: false, error: `Failed to extract CRX: ${(err as Error).message}` }
  }

  // Load to verify + get ID
  const sessionResult = await loadIntoSession(tmp)
  if (!sessionResult) {
    await rm(tmp, { recursive: true, force: true }).catch(() => {})
    return { success: false, error: 'Failed to load CRX extension' }
  }

  const id = sessionResult.id
  unloadFromSession(id)

  const final = extDir(id)
  if (existsSync(final)) {
    await rm(tmp, { recursive: true, force: true }).catch(() => {})
    return { success: false, error: `Extension "${name}" (${id}) is already installed` }
  }

  try {
    await rename(tmp, final)
  } catch {
    // Cross-device rename fallback
    try {
      await copyDir(tmp, final)
      await rm(tmp, { recursive: true, force: true }).catch(() => {})
    } catch (err) {
      await rm(tmp, { recursive: true, force: true }).catch(() => {})
      await rm(final, { recursive: true, force: true }).catch(() => {})
      return { success: false, error: `Failed to finalize: ${(err as Error).message}` }
    }
  }

  await loadIntoSession(final)

  const description = String(manifest.description ?? '')
  const author = typeof manifest.author === 'string' ? manifest.author : ''
  const homeUrl = String(manifest.homepage_url ?? '')
  const iconPath = findIcon(final)

  upsertDB({
    id, name, version, description, author, homeUrl,
    iconPath, sourceType: 'crx', sourcePath: crxPath,
    enabled: 1, installed_at: Math.floor(Date.now() / 1000)
  })

  return { success: true, id }
}

// ─── Enable / Disable / Delete ───────────────────────────────

export async function enableExtension(id: string): Promise<{ success: boolean; error?: string }> {
  if (!getDB(id)) return { success: false, error: 'Extension not found' }
  if (isLoadedInSession(id)) {
    setEnabledDB(id, 1)
    return { success: true }
  }
  const dir = extDir(id)
  if (!existsSync(dir)) return { success: false, error: 'Extension directory missing' }
  const result = await loadIntoSession(dir)
  if (!result) return { success: false, error: 'Failed to load extension' }
  setEnabledDB(id, 1)
  return { success: true }
}

export async function disableExtension(id: string): Promise<{ success: boolean; error?: string }> {
  if (!getDB(id)) return { success: false, error: 'Extension not found' }
  unloadFromSession(id)
  setEnabledDB(id, 0)
  return { success: true }
}

export async function deleteExtension(id: string): Promise<{ success: boolean; error?: string }> {
  if (!getDB(id)) return { success: false, error: 'Extension not found' }
  unloadFromSession(id)
  deleteDB(id)
  const dir = extDir(id)
  if (existsSync(dir)) await rm(dir, { recursive: true, force: true }).catch(() => {})
  return { success: true }
}

// ─── Query ───────────────────────────────────────────────────

export function listExtensions(): ExtensionRecord[] {
  return listDB()
}

export function getExtension(id: string): ExtensionRecord | undefined {
  return getDB(id)
}

// ─── Icon data URL ───────────────────────────────────────────

export async function getIconDataUrl(id: string): Promise<string | null> {
  const rec = getDB(id)
  if (!rec || !rec.iconPath) return null
  try {
    const buf = await readFile(rec.iconPath)
    const ext = rec.iconPath.split('.').pop()?.toLowerCase() ?? 'png'
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

// ─── Startup: reload all enabled ────────────────────────────

export async function reloadEnabledExtensions(): Promise<void> {
  const all = listDB().filter(e => e.enabled === 1)
  let loaded = 0
  for (const ext of all) {
    const dir = extDir(ext.id)
    if (!existsSync(dir)) {
      console.warn('[ext] Dir missing for', ext.id, '- disabling')
      setEnabledDB(ext.id, 0)
      continue
    }
    const result = await loadIntoSession(dir)
    if (result) loaded++
  }
  console.log(`[ext] Reloaded ${loaded}/${all.length} enabled extensions`)
}

// ─── Dialogs ─────────────────────────────────────────────────

export async function pickFolder(win?: BrowserWindow | null): Promise<string | null> {
  const r = await dialog.showOpenDialog(win ?? undefined, {
    properties: ['openDirectory'],
    title: 'Select Extension Folder'
  })
  return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
}

export async function pickCrx(win?: BrowserWindow | null): Promise<string | null> {
  const r = await dialog.showOpenDialog(win ?? undefined, {
    properties: ['openFile'],
    title: 'Select CRX Extension',
    filters: [{ name: 'Chrome Extension', extensions: ['crx'] }]
  })
  return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
}

// ─── File helpers ────────────────────────────────────────────

async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  for (const e of entries) {
    const s = join(src, e.name)
    const d = join(dest, e.name)
    if (e.isDirectory()) await copyDir(s, d)
    else await copyFile(s, d)
  }
}

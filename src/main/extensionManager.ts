import { app, session, dialog, BrowserWindow, net } from 'electron'
import { join, normalize } from 'path'
import { readFile, mkdir, readdir, copyFile, rm, rename } from 'fs/promises'
import { existsSync, readFileSync, createWriteStream, unlinkSync, mkdirSync, readdirSync } from 'fs'
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

// ─── i18n & icon resolution from manifest ─────────────────────

export function resolveI18nMessage(
  text: string | undefined,
  extensionDir: string,
  defaultLocale?: string
): string {
  if (!text) return ''

  const match = text.match(/^__MSG_(.+)__$/)
  if (!match) return text

  const messageName = match[1]
  const localesDir = join(extensionDir, '_locales')

  const candidates = [defaultLocale, 'en', 'en_US', 'en_GB'].filter(
    (v): v is string => !!v
  )

  try {
    if (existsSync(localesDir)) {
      candidates.push(...readdirSync(localesDir))
    }
  } catch {
    // ignore
  }

  const tried = new Set<string>()
  for (const locale of candidates) {
    if (tried.has(locale)) continue
    tried.add(locale)

    try {
      const messagesPath = join(localesDir, locale, 'messages.json')
      if (!existsSync(messagesPath)) continue

      const messages = JSON.parse(readFileSync(messagesPath, 'utf-8'))
      const value = messages?.[messageName]?.message
      if (typeof value === 'string' && value.length > 0) {
        return value
      }
    } catch {
      continue
    }
  }

  return messageName.replace(/[_-]+/g, ' ').trim()
}

export function findBestIconPath(extensionDir: string, manifest: any): string | null {
  const icons = manifest?.icons
  if (!icons || typeof icons !== 'object') return null

  const sizes = Object.keys(icons)
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => b - a)

  for (const size of sizes) {
    const relPath = icons[String(size)]
    if (typeof relPath !== 'string') continue

    const safeRelPath = relPath.replace(/^\/+/, '')
    const absPath = normalize(join(extensionDir, safeRelPath))

    if (!absPath.startsWith(normalize(extensionDir))) continue

    if (existsSync(absPath)) return absPath
  }

  return null
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

  const defaultLocale = manifest.default_locale as string | undefined
  const rawName = String(manifest.name ?? 'Unnamed Extension')
  const version = String(manifest.version ?? '0.0.0')

  // Load from source to verify + get ID
  const sessionResult = await loadIntoSession(sourcePath)
  if (!sessionResult) return { success: false, error: 'Failed to load extension (invalid manifest or missing permissions)' }

  const id = sessionResult.id
  unloadFromSession(id)

  const final = extDir(id)
  if (existsSync(final)) return { success: false, error: `Extension "${rawName}" (${id}) is already installed` }

  await ensureDir(extensionsDir())
  try {
    await copyDir(sourcePath, final)
  } catch (err) {
    await rm(final, { recursive: true, force: true }).catch(() => {})
    return { success: false, error: `Failed to copy extension: ${(err as Error).message}` }
  }

  // Load from final location
  await loadIntoSession(final)

  const name = resolveI18nMessage(rawName, final, defaultLocale) || rawName
  const description = resolveI18nMessage(String(manifest.description ?? ''), final, defaultLocale)
  const author = typeof manifest.author === 'string' ? manifest.author : ''
  const homeUrl = String(manifest.homepage_url ?? '')
  const iconPath = findBestIconPath(final, manifest) || ''

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

  const defaultLocale = manifest.default_locale as string | undefined
  const rawName = String(manifest.name ?? 'Unnamed Extension')
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
    return { success: false, error: `Extension "${rawName}" (${id}) is already installed` }
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

  const name = resolveI18nMessage(rawName, final, defaultLocale) || rawName
  const description = resolveI18nMessage(String(manifest.description ?? ''), final, defaultLocale)
  const author = typeof manifest.author === 'string' ? manifest.author : ''
  const homeUrl = String(manifest.homepage_url ?? '')
  const iconPath = findBestIconPath(final, manifest) || ''

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

// ─── Chrome Web Store download ─────────────────────────────

const CHROME_UA_DL =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export async function downloadCrxFromStore(
  extensionId: string
): Promise<{ success: boolean; crxPath: string | null; error: string | null }> {
  if (!/^[a-p]{32}$/.test(extensionId)) {
    return { success: false, crxPath: null, error: 'Invalid extension ID format' }
  }

  const url =
    `https://clients2.google.com/service/update2/crx?response=redirect` +
    `&os=win&arch=x64&os_arch=x86_64&nacl_arch=x86-64&prod=chromiumcrx` +
    `&prodchannel=&prodversion=131.0.6778.86&lang=en-US` +
    `&acceptformat=crx2,crx3&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`

  const extDir = extensionsDir()
  mkdirSync(extDir, { recursive: true })
  const tempPath = join(extDir, `_download_${extensionId}_${Date.now()}.crx`)

  return new Promise((resolve) => {
    let settled = false
    const cleanup = () => { try { unlinkSync(tempPath) } catch {} }
    const finish = (r: { success: boolean; crxPath: string | null; error: string | null }) => {
      if (!settled) { settled = true; resolve(r) }
    }

    let fileStream: ReturnType<typeof createWriteStream>
    try {
      fileStream = createWriteStream(tempPath)
    } catch (e: unknown) {
      finish({ success: false, crxPath: null, error: (e as Error)?.message || 'Cannot create temp file' })
      return
    }

    const request = net.request({ url, redirect: 'follow' })
    request.setHeader('User-Agent', CHROME_UA_DL)

    const timeout = setTimeout(() => { try { request.abort() } catch {} }, 30_000)

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        clearTimeout(timeout)
        fileStream.destroy()
        cleanup()
        finish({ success: false, crxPath: null, error: `HTTP ${response.statusCode} from CRX server` })
        return
      }
      response.on('data', (chunk) => fileStream.write(chunk))
      response.on('end', () => { clearTimeout(timeout); fileStream.end() })
      response.on('error', (err: Error) => {
        clearTimeout(timeout); fileStream.destroy(); cleanup()
        finish({ success: false, crxPath: null, error: err?.message || 'Download stream error' })
      })
    })

    fileStream.on('finish', () => {
      clearTimeout(timeout)
      finish({ success: true, crxPath: tempPath, error: null })
    })
    fileStream.on('error', (err: Error) => {
      clearTimeout(timeout); cleanup()
      finish({ success: false, crxPath: null, error: err?.message || 'File write error' })
    })

    request.on('error', (err: Error) => {
      clearTimeout(timeout); fileStream.destroy(); cleanup()
      finish({ success: false, crxPath: null, error: err?.message || 'Request error' })
    })

    request.end()
  })
}

export async function installFromStoreId(extensionId: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const dl = await downloadCrxFromStore(extensionId)
  if (!dl.success || !dl.crxPath) {
    return { success: false, error: dl.error || 'Download failed' }
  }
  const result = await installCrx(dl.crxPath)
  try { unlinkSync(dl.crxPath) } catch {}
  return result
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

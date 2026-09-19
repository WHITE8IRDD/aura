import type Database from 'better-sqlite3'

export type ShieldsLevel = 'off' | 'standard' | 'aggressive' | 'custom'
type PresetLevel = Exclude<ShieldsLevel, 'custom'>

export interface ShieldToggles {
  blockAds: boolean
  blockTrackers: boolean
  blockSocial: boolean
  blockFingerprinters: boolean
  blockAnnoyances: boolean
}

export interface SiteShieldSettings extends ShieldToggles {
  domain: string
  level: ShieldsLevel
  blockedCount: number
}

const PRESETS: Record<PresetLevel, ShieldToggles> = {
  off: {
    blockAds: false,
    blockTrackers: false,
    blockSocial: false,
    blockFingerprinters: false,
    blockAnnoyances: false,
  },
  standard: {
    blockAds: true,
    blockTrackers: true,
    blockSocial: true,
    blockFingerprinters: true,
    blockAnnoyances: false,
  },
  aggressive: {
    blockAds: true,
    blockTrackers: true,
    blockSocial: true,
    blockFingerprinters: true,
    blockAnnoyances: true,
  },
}

interface ShieldsRow {
  domain: string
  level: string
  block_ads: number
  block_trackers: number
  block_social: number
  block_fingerprinters: number
  block_annoyances: number
  blocked_count: number
}

const FLUSH_INTERVAL_MS = 5000
const MAX_CACHE_ENTRIES = 2000

let db: Database.Database | null = null
let stmtGet: Database.Statement | null = null
let stmtUpsert: Database.Statement | null = null
let stmtAddCount: Database.Statement | null = null
let flushTimer: NodeJS.Timeout | null = null

const cache = new Map<string, SiteShieldSettings>()
const pending = new Map<string, number>()

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS site_shields (
      domain TEXT PRIMARY KEY,
      level TEXT NOT NULL DEFAULT 'standard',
      block_ads INTEGER NOT NULL DEFAULT 1,
      block_trackers INTEGER NOT NULL DEFAULT 1,
      block_social INTEGER NOT NULL DEFAULT 1,
      block_fingerprinters INTEGER NOT NULL DEFAULT 1,
      block_annoyances INTEGER NOT NULL DEFAULT 0,
      blocked_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER
    );
  `)

  const existing = new Set(
    (database.prepare('PRAGMA table_info(site_shields)').all() as { name: string }[]).map(
      (c) => c.name
    )
  )
  const add = (name: string, ddl: string): void => {
    if (!existing.has(name)) database.exec(`ALTER TABLE site_shields ADD COLUMN ${ddl}`)
  }
  add('level', "level TEXT NOT NULL DEFAULT 'standard'")
  add('block_ads', 'block_ads INTEGER NOT NULL DEFAULT 1')
  add('block_trackers', 'block_trackers INTEGER NOT NULL DEFAULT 1')
  add('block_social', 'block_social INTEGER NOT NULL DEFAULT 1')
  add('block_fingerprinters', 'block_fingerprinters INTEGER NOT NULL DEFAULT 1')
  add('block_annoyances', 'block_annoyances INTEGER NOT NULL DEFAULT 0')
  add('blocked_count', 'blocked_count INTEGER NOT NULL DEFAULT 0')
  add('updated_at', 'updated_at INTEGER')
}

export function initShieldsDatabase(database: Database.Database): void {
  if (flushTimer) clearInterval(flushTimer)
  cache.clear()
  pending.clear()

  db = database
  migrate(database)

  stmtGet = database.prepare('SELECT * FROM site_shields WHERE domain = ?')
  stmtUpsert = database.prepare(`
    INSERT INTO site_shields
      (domain, level, block_ads, block_trackers, block_social, block_fingerprinters, block_annoyances, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    ON CONFLICT(domain) DO UPDATE SET
      level = excluded.level,
      block_ads = excluded.block_ads,
      block_trackers = excluded.block_trackers,
      block_social = excluded.block_social,
      block_fingerprinters = excluded.block_fingerprinters,
      block_annoyances = excluded.block_annoyances,
      updated_at = strftime('%s', 'now')
  `)
  stmtAddCount = database.prepare(`
    INSERT INTO site_shields
      (domain, level, block_ads, block_trackers, block_social, block_fingerprinters, block_annoyances, blocked_count)
    VALUES (?, 'standard', 1, 1, 1, 1, 0, ?)
    ON CONFLICT(domain) DO UPDATE SET blocked_count = blocked_count + ?
  `)

  flushTimer = setInterval(flushBlockedCounts, FLUSH_INTERVAL_MS)
  flushTimer.unref?.()
}

export function cleanDomain(hostname: string): string {
  if (!hostname) return ''
  const h = hostname.trim().toLowerCase()
  if (h.startsWith('[')) {
    const end = h.indexOf(']')
    return end > 0 ? h.slice(0, end + 1) : h
  }
  return h.replace(/:\d+$/, '').replace(/\.$/, '').replace(/^www\./, '')
}

function normalizeLevel(level: string): ShieldsLevel {
  return level === 'off' || level === 'standard' || level === 'aggressive' || level === 'custom'
    ? level
    : 'standard'
}

function rowToSettings(row: ShieldsRow): SiteShieldSettings {
  const level = normalizeLevel(row.level)
  const toggles: ShieldToggles =
    level === 'custom'
      ? {
          blockAds: !!row.block_ads,
          blockTrackers: !!row.block_trackers,
          blockSocial: !!row.block_social,
          blockFingerprinters: !!row.block_fingerprinters,
          blockAnnoyances: !!row.block_annoyances,
        }
      : PRESETS[level]
  return { domain: row.domain, level, ...toggles, blockedCount: row.blocked_count || 0 }
}

function defaults(domain: string): SiteShieldSettings {
  return { domain, level: 'standard', ...PRESETS.standard, blockedCount: 0 }
}

function loadSettings(clean: string): SiteShieldSettings {
  const cached = cache.get(clean)
  if (cached) return cached

  let settings = defaults(clean)
  if (stmtGet) {
    try {
      const row = stmtGet.get(clean) as ShieldsRow | undefined
      if (row) settings = rowToSettings(row)
    } catch (err) {
      console.warn('[Aura/ShieldsStore] Failed to read site shields:', err)
    }
  }

  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear()
  cache.set(clean, settings)
  return settings
}

function persist(settings: SiteShieldSettings): SiteShieldSettings {
  if (stmtUpsert) {
    try {
      stmtUpsert.run(
        settings.domain,
        settings.level,
        settings.blockAds ? 1 : 0,
        settings.blockTrackers ? 1 : 0,
        settings.blockSocial ? 1 : 0,
        settings.blockFingerprinters ? 1 : 0,
        settings.blockAnnoyances ? 1 : 0
      )
    } catch (err) {
      console.warn('[Aura/ShieldsStore] Failed to save site shields:', err)
    }
  }
  cache.set(settings.domain, settings)
  return { ...settings, blockedCount: settings.blockedCount + (pending.get(settings.domain) ?? 0) }
}

export function getSiteShields(domain: string): SiteShieldSettings {
  const clean = cleanDomain(domain)
  if (!clean) return defaults('')
  const base = loadSettings(clean)
  const extra = pending.get(clean) ?? 0
  return extra ? { ...base, blockedCount: base.blockedCount + extra } : base
}

export function setSiteShieldsLevel(domain: string, level: ShieldsLevel): SiteShieldSettings {
  const clean = cleanDomain(domain)
  if (!clean) return { ...defaults(''), level }

  const current = loadSettings(clean)
  const toggles: ShieldToggles = level === 'custom' ? current : PRESETS[level]
  return persist({
    domain: clean,
    level,
    blockAds: toggles.blockAds,
    blockTrackers: toggles.blockTrackers,
    blockSocial: toggles.blockSocial,
    blockFingerprinters: toggles.blockFingerprinters,
    blockAnnoyances: toggles.blockAnnoyances,
    blockedCount: current.blockedCount,
  })
}

export function setSiteShieldsToggles(
  domain: string,
  patch: Partial<ShieldToggles>
): SiteShieldSettings {
  const clean = cleanDomain(domain)
  if (!clean) return defaults('')

  const current = loadSettings(clean)
  return persist({ ...current, ...patch, domain: clean, level: 'custom' })
}

export function incrementSiteBlockedCount(domain: string, count = 1): void {
  const clean = cleanDomain(domain)
  if (!clean || !db || count <= 0) return
  pending.set(clean, (pending.get(clean) ?? 0) + count)
}

export function flushBlockedCounts(): void {
  if (!db || !stmtAddCount || pending.size === 0) return

  const batch = [...pending]
  pending.clear()
  const add = stmtAddCount

  try {
    db.transaction(() => {
      for (const [domain, n] of batch) add.run(domain, n, n)
    })()
    for (const [domain, n] of batch) {
      const cached = cache.get(domain)
      if (cached) cached.blockedCount += n
    }
  } catch (err) {
    for (const [domain, n] of batch) pending.set(domain, (pending.get(domain) ?? 0) + n)
    console.warn('[Aura/ShieldsStore] Failed to flush blocked counts:', err)
  }
}

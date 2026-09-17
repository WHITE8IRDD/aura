import type Database from 'better-sqlite3'

export type ShieldsLevel = 'off' | 'standard' | 'aggressive' | 'custom'

export interface SiteShieldSettings {
  domain: string
  level: ShieldsLevel
  blockAds: boolean
  blockTrackers: boolean
  blockSocial: boolean
  blockFingerprinters: boolean
  blockAnnoyances: boolean
  blockedCount: number
}

const DEFAULT_SETTINGS: Omit<SiteShieldSettings, 'domain'> = {
  level: 'standard',
  blockAds: true,
  blockTrackers: true,
  blockSocial: true,
  blockFingerprinters: true,
  blockAnnoyances: true,
  blockedCount: 0,
}

let dbInstance: Database.Database | null = null

export function initShieldsDatabase(db: Database.Database): void {
  dbInstance = db
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_shields (
      domain TEXT PRIMARY KEY,
      level TEXT NOT NULL DEFAULT 'standard',
      block_ads INTEGER NOT NULL DEFAULT 1,
      block_trackers INTEGER NOT NULL DEFAULT 1,
      block_social INTEGER NOT NULL DEFAULT 1,
      block_fingerprinters INTEGER NOT NULL DEFAULT 1,
      block_annoyances INTEGER NOT NULL DEFAULT 1,
      blocked_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `)
}

export function getSiteShields(domain: string): SiteShieldSettings {
  const clean = cleanDomain(domain)
  if (!clean || !dbInstance) return { domain: clean, ...DEFAULT_SETTINGS }

  try {
    const row = dbInstance.prepare('SELECT * FROM site_shields WHERE domain = ?').get(clean) as any
    if (!row) return { domain: clean, ...DEFAULT_SETTINGS }

    return {
      domain: clean,
      level: row.level as ShieldsLevel,
      blockAds: Boolean(row.block_ads),
      blockTrackers: Boolean(row.block_trackers),
      blockSocial: Boolean(row.block_social),
      blockFingerprinters: Boolean(row.block_fingerprinters),
      blockAnnoyances: Boolean(row.block_annoyances),
      blockedCount: row.blocked_count || 0,
    }
  } catch {
    return { domain: clean, ...DEFAULT_SETTINGS }
  }
}

export function setSiteShieldsLevel(domain: string, level: ShieldsLevel): SiteShieldSettings {
  const clean = cleanDomain(domain)
  if (!clean || !dbInstance) return { domain: clean, ...DEFAULT_SETTINGS, level }

  const isOff = level === 'off'
  const isAggressive = level === 'aggressive'

  const settings: SiteShieldSettings = {
    domain: clean,
    level,
    blockAds: !isOff,
    blockTrackers: !isOff,
    blockSocial: !isOff,
    blockFingerprinters: !isOff || isAggressive,
    blockAnnoyances: isAggressive,
    blockedCount: getSiteShields(clean).blockedCount,
  }

  try {
    dbInstance.prepare(`
      INSERT INTO site_shields (domain, level, block_ads, block_trackers, block_social, block_fingerprinters, block_annoyances)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(domain) DO UPDATE SET
        level = excluded.level,
        block_ads = excluded.block_ads,
        block_trackers = excluded.block_trackers,
        block_social = excluded.block_social,
        block_fingerprinters = excluded.block_fingerprinters,
        block_annoyances = excluded.block_annoyances,
        updated_at = strftime('%s', 'now')
    `).run(
      clean,
      level,
      settings.blockAds ? 1 : 0,
      settings.blockTrackers ? 1 : 0,
      settings.blockSocial ? 1 : 0,
      settings.blockFingerprinters ? 1 : 0,
      settings.blockAnnoyances ? 1 : 0
    )
  } catch (err) {
    console.warn('[Aura/ShieldsStore] Failed to save site shields:', err)
  }

  return settings
}

export function incrementSiteBlockedCount(domain: string, count = 1): void {
  const clean = cleanDomain(domain)
  if (!clean || !dbInstance) return

  try {
    dbInstance.prepare(`
      INSERT INTO site_shields (domain, blocked_count)
      VALUES (?, ?)
      ON CONFLICT(domain) DO UPDATE SET
        blocked_count = blocked_count + ?
    `).run(clean, count, count)
  } catch {}
}

function cleanDomain(hostname: string): string {
  if (!hostname) return ''
  return hostname.toLowerCase().replace(/^www\./, '').trim()
}
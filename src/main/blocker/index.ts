import { ElectronBlocker, fetch } from '@cliqz/adblocker-electron'
import { session, type Session } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { getCachePath } from './lists'
import { cleanTrackingUrl } from './url-cleaner'
import {
  getSiteShields,
  incrementSiteBlockedCount,
  setSiteShieldsLevel,
  type ShieldsLevel
} from './shields-store'
import { registerNetworkAdBlocker, initAdBlockEngine, incrementWcBlockedCount, getWcBlockedStats, incrementTabBlockedCount, getTabBlockedStats } from './adblock-engine'

export { registerNetworkAdBlocker, initAdBlockEngine, incrementWcBlockedCount, getWcBlockedStats, incrementTabBlockedCount, getTabBlockedStats }

interface BlockerStats {
  trackers: number
  ads: number
  fingerprinters: number
  social: number
  bandwidthSavedBytes: number
  sessionStart: number
}

const stats: BlockerStats = {
  trackers: 0,
  ads: 0,
  fingerprinters: 0,
  social: 0,
  bandwidthSavedBytes: 0,
  sessionStart: Date.now(),
}

// Per-tab blocked request counters for popover stats
const tabBlockedCounts = new Map<number, { ads: number; trackers: number; total: number }>()

let engine: ElectronBlocker | null = null
const installedSessions = new WeakSet<Session>()

// NEVER_BLOCK_HOSTS is reserved ONLY for critical payment and auth infrastructure
const NEVER_BLOCK_HOSTS = new Set<string>([
  'accounts.google.com',
  'accounts.youtube.com',
  'login.live.com',
  'login.microsoftonline.com',
  'appleid.apple.com',
  'github.com',
  'api.github.com',
  'gitlab.com',
  'stripe.com',
  'checkout.stripe.com',
  'paypal.com',
  'www.paypal.com',
])

const AD_DOMAINS = [
  'doubleclick', 'googlesyndication', 'googleadservices', 'pubmatic',
  'criteo', 'taboola', 'outbrain', 'openx', 'rubiconproject', 'adnxs',
  'casalemedia', 'gumgum', 'indexww', 'media.net', 'adsystem', 'adserver',
  'adsbygoogle', 'pagead2',
  // Streaming/Anime site ad & popunder networks
  'adsterra', 'popads', 'popcash', 'propellerads', 'exoclick', 'juicyads',
  'clickadilla', 'monetag', 'hilltopads', 'ad-maven', 'mydrive', 'videas',
  'streamtape', 'filemoon', 'vidoza', 'doodstream'
]

const FINGERPRINT_DOMAINS = ['fingerprintjs', 'fpcollect', 'castle.io', 'perimeterx', 'datadome']

const SOCIAL_DOMAINS = [
  'facebook.com/tr', 'connect.facebook.net', 'twitter.com/i/adsct',
  'analytics.twitter', 'linkedin.com/li.lms', 'px.ads.linkedin',
  'tiktok.com/i18n/pixel', 'pinterest.com/ct', 'reddit.com/api/v2/pixel'
]

const TRACKER_DOMAINS = [
  'google-analytics', 'googletagmanager', 'hotjar', 'fullstory',
  'mixpanel', 'segment.com', 'amplitude', 'heap.io', 'logrocket',
  'quantserve', 'scorecardresearch', 'comscore', 'chartbeat', 'parsely'
]

function categorize(url: string): 'trackers' | 'ads' | 'fingerprinters' | 'social' {
  const lower = url.toLowerCase()
  for (const p of SOCIAL_DOMAINS) if (lower.includes(p)) return 'social'
  for (const p of FINGERPRINT_DOMAINS) if (lower.includes(p)) return 'fingerprinters'
  for (const p of AD_DOMAINS) if (lower.includes(p)) return 'ads'
  for (const p of TRACKER_DOMAINS) if (lower.includes(p)) return 'trackers'
  return 'ads'
}

export async function initBlocker(): Promise<ElectronBlocker> {
  if (engine) return engine

  const cachePath = getCachePath()
  if (existsSync(cachePath)) {
    try {
      const buf = await readFile(cachePath)
      engine = ElectronBlocker.deserialize(new Uint8Array(buf))
      console.log('[Aura/blocker] Loaded cached engine')
      return engine
    } catch (err) {
      console.warn('[Aura/blocker] Cache corrupted, rebuilding:', err)
    }
  }

  console.log('[Aura/blocker] Building multi-list uBlock-grade engine...')
  // Load full prebuilt ad & tracking suite
  engine = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
    enableDefaults: true,
  })

  try {
    await writeFile(cachePath, engine.serialize())
    console.log('[Aura/blocker] Engine cached to', cachePath)
  } catch (err) {
    console.warn('[Aura/blocker] Failed to cache engine:', err)
  }

  return engine
}

export function installBlocker(targetSession: Session): void {
  if (!engine) {
    console.warn('[Aura/blocker] Engine must be initialized first')
    return
  }
  if (installedSessions.has(targetSession)) return

  // Enable request blocking & cosmetic injection in session
  engine.enableBlockingInSession(targetSession)
  installedSessions.add(targetSession)

  // === URL TRACKING PARAMETER STRIPPER ===
  targetSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
    if (details.resourceType === 'mainFrame') {
      const cleaned = cleanTrackingUrl(details.url)
      if (cleaned && cleaned !== details.url) {
        console.log(`[Aura/Shields] Stripped tracking params: ${details.url} -> ${cleaned}`)
        return callback({ redirectURL: cleaned })
      }
    }
    callback({})
  })

  // === REQUEST BLOCKED STATS & SHIELDS CHECK ===
  engine.on('request-blocked', (request) => {
    try {
      const hostname = request.sourceHostname || new URL(request.url).hostname
      const cleanHost = hostname.replace(/^www\./, '').toLowerCase()

      // NEVER block video playback streams - these are the actual video content
      if (request.url.includes('googlevideo.com/videoplayback')) return

      if (NEVER_BLOCK_HOSTS.has(cleanHost)) return

      const shields = getSiteShields(cleanHost)
      if (shields.level === 'off') return

      const category = categorize(request.url)
      if (category === 'ads' && !shields.blockAds) return
      if (category === 'trackers' && !shields.blockTrackers) return
      if (category === 'social' && !shields.blockSocial) return
      if (category === 'fingerprinters' && !shields.blockFingerprinters) return

      // Increment stats
      stats.bandwidthSavedBytes += 35_000
      stats[category] += 1
      incrementSiteBlockedCount(cleanHost, 1)

      // Tab specific counter
      if (request.tabId !== undefined) {
        const current = tabBlockedCounts.get(request.tabId) || { ads: 0, trackers: 0, total: 0 }
        if (category === 'ads') current.ads += 1
        else current.trackers += 1
        current.total += 1
        tabBlockedCounts.set(request.tabId, current)
      }
    } catch {}
  })

  // === COSMETICS OVERRIDE ===
  const origGetCosmetics = engine.getCosmeticsFilters.bind(engine)
  engine.getCosmeticsFilters = (opts) => {
    const hostname = (opts.hostname || '').replace(/^www\./, '').toLowerCase()
    if (NEVER_BLOCK_HOSTS.has(hostname)) {
      return { active: false, extended: [], scripts: [], styles: '' }
    }
    // Never inject cosmetics into video playback streams
    if (opts.documentUrl && opts.documentUrl.includes('googlevideo.com/videoplayback')) {
      return { active: false, extended: [], scripts: [], styles: '' }
    }
    const shields = getSiteShields(hostname)
    if (shields.level === 'off') {
      return { active: false, extended: [], scripts: [], styles: '' }
    }
    return origGetCosmetics(opts)
  }

  console.log('[Aura/blocker] Multi-list engine installed on session')
}

export function resetTabBlockedStats(tabId: number) {
  tabBlockedCounts.delete(tabId)
}

export function getBlockerStats(): BlockerStats {
  return { ...stats }
}

export function areShieldsEnabledFor(hostname: string): boolean {
  const clean = hostname.toLowerCase().replace(/^www\./, '')
  if (!clean) return true
  const shields = getSiteShields(clean)
  return shields.level !== 'off'
}

export function setSiteShields(hostname: string, enabled: boolean): boolean {
  const clean = hostname.toLowerCase().replace(/^www\./, '')
  if (!clean) return enabled
  const newLevel: ShieldsLevel = enabled ? 'standard' : 'off'
  setSiteShieldsLevel(clean, newLevel)
  return enabled
}

export async function setupDefaultSessionBlocking(): Promise<void> {
  await initBlocker()
  installBlocker(session.defaultSession)
}
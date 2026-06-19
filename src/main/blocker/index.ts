import { ElectronBlocker } from '@cliqz/adblocker-electron'
import { session, type Session } from 'electron'
import fetch from 'cross-fetch'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { getCachePath } from './lists'
import { getSetting } from '../settings'

interface BlockerStats {
  trackers: number
  ads: number
  fingerprinters: number
  social: number
  bandwidthSavedBytes: number
  sessionStart: number
}

const stats: BlockerStats = {
  trackers: 0, ads: 0, fingerprinters: 0, social: 0,
  bandwidthSavedBytes: 0, sessionStart: Date.now()
}

let engine: ElectronBlocker | null = null
const installedSessions = new WeakSet<Session>()
const disabledHosts = new Set<string>()

const NEVER_BLOCK_HOSTS = new Set<string>([
  'youtube.com', 'www.youtube.com', 'm.youtube.com',
  'googlevideo.com', 'ytimg.com', 'i.ytimg.com', 'yt3.ggpht.com',
  'accounts.google.com', 'accounts.youtube.com',
  'login.live.com', 'login.microsoftonline.com',
  'appleid.apple.com', 'github.com', 'api.github.com',
  'gitlab.com', 'stripe.com', 'checkout.stripe.com',
  'paypal.com', 'www.paypal.com'
])

const AD_DOMAINS = [
  'doubleclick', 'googlesyndication', 'googleadservices',
  'pubmatic', 'criteo', 'taboola', 'outbrain',
  'openx', 'rubiconproject', 'adnxs', 'casalemedia',
  'gumgum', 'indexww', 'media.net', 'adsystem', 'adserver', 'adsbygoogle'
]
const FINGERPRINT_DOMAINS = [
  'fingerprintjs', 'fpcollect', 'castle.io', 'perimeterx', 'datadome'
]
const SOCIAL_DOMAINS = [
  'facebook.com/tr', 'connect.facebook.net',
  'twitter.com/i/adsct', 'analytics.twitter',
  'linkedin.com/li.lms', 'px.ads.linkedin',
  'tiktok.com/i18n/pixel', 'pinterest.com/ct',
  'reddit.com/api/v2/pixel'
]
const TRACKER_DOMAINS = [
  'google-analytics', 'googletagmanager',
  'hotjar', 'fullstory', 'mixpanel', 'segment.com',
  'amplitude', 'heap.io', 'logrocket',
  'quantserve', 'scorecardresearch', 'comscore',
  'chartbeat', 'parsely'
]

function categorize(url: string): 'trackers' | 'ads' | 'fingerprinters' | 'social' {
  const lower = url.toLowerCase()
  for (const p of SOCIAL_DOMAINS) if (lower.includes(p)) return 'social'
  for (const p of FINGERPRINT_DOMAINS) if (lower.includes(p)) return 'fingerprinters'
  for (const p of AD_DOMAINS) if (lower.includes(p)) return 'ads'
  for (const p of TRACKER_DOMAINS) if (lower.includes(p)) return 'trackers'
  return 'trackers'
}

function categoryBlockedBySettings(category: ReturnType<typeof categorize>): boolean {
  const level = getSetting('shieldsLevel')
  if (level === 'strict') return true
  if (level === 'standard') return true
  if (category === 'trackers') return getSetting('blockTrackers')
  if (category === 'ads') return getSetting('blockAds')
  if (category === 'social') return getSetting('blockSocialTrackers')
  if (category === 'fingerprinters') return getSetting('blockFingerprinters')
  return true
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
  console.log('[Aura/blocker] Building engine from filter lists…')
  engine = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
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
    console.warn('[Aura/blocker] initBlocker() must complete before install')
    return
  }
  if (installedSessions.has(targetSession)) return
  engine.enableBlockingInSession(targetSession)
  installedSessions.add(targetSession)

  engine.on('request-blocked', (request) => {
    try {
      const fromHost = request.sourceHostname ?? new URL(request.url).hostname
      const cleanHost = fromHost.replace(/^www\./, '')
      if (disabledHosts.has(cleanHost)) return
      if (NEVER_BLOCK_HOSTS.has(fromHost) || NEVER_BLOCK_HOSTS.has(cleanHost)) return
    } catch {}

    const category = categorize(request.url)
    if (!categoryBlockedBySettings(category)) return

    stats.bandwidthSavedBytes += 30_000
    stats[category] += 1
  })

  const whitelistLines: string[] = []
  for (const host of NEVER_BLOCK_HOSTS) {
    whitelistLines.push(`@@||${host}^$document`)
    whitelistLines.push(`${host}#@#+js()`)
  }
  try {
    engine.updateFromDiff({ added: whitelistLines })
    engine.lists.set('aura-whitelist', whitelistLines.join('\n'))
    console.log(`[Aura/blocker] Applied ${whitelistLines.length} whitelist rules`)
  } catch (err) {
    console.warn('[Aura/blocker] Failed to apply whitelist rules:', err)
  }

  const origGetCosmetics = engine.getCosmeticsFilters.bind(engine)
  engine.getCosmeticsFilters = (opts) => {
    const hostname = opts.hostname || ''
    const cleanHost = hostname.replace(/^www\./, '')
    if (NEVER_BLOCK_HOSTS.has(hostname) || NEVER_BLOCK_HOSTS.has(cleanHost) || disabledHosts.has(cleanHost)) {
      return { active: false, extended: [], scripts: [], styles: '' }
    }
    return origGetCosmetics(opts)
  }

  console.log('[Aura/blocker] Installed on session')
}

export function setSiteShields(hostname: string, enabled: boolean): boolean {
  const cleanHost = hostname.toLowerCase().replace(/^www\./, '')
  if (enabled) disabledHosts.delete(cleanHost)
  else disabledHosts.add(cleanHost)
  return enabled
}

export function areShieldsEnabledFor(hostname: string): boolean {
  const cleanHost = hostname.toLowerCase().replace(/^www\./, '')
  return !disabledHosts.has(cleanHost)
}

export function getBlockerStats(): BlockerStats {
  return { ...stats }
}

export function resetBlockerStats(): void {
  stats.trackers = 0; stats.ads = 0
  stats.fingerprinters = 0; stats.social = 0
  stats.bandwidthSavedBytes = 0; stats.sessionStart = Date.now()
}

export async function setupDefaultSessionBlocking(): Promise<void> {
  await initBlocker()
  installBlocker(session.defaultSession)
}

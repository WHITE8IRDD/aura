import { ElectronBlocker, fetch } from '@cliqz/adblocker-electron'
import { session, type Session } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { getCachePath } from './lists'
import { incrementSiteBlockedCount, cleanDomain } from './shields-store'

let engine: ElectronBlocker | null = null
const installedSessions = new WeakSet<Session>()

// Keyed strictly by WebContents ID (wcId)
export const tabBlockedCounts = new Map<number, { ads: number; trackers: number; total: number }>()

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
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'googlevideo.com',
  'ytimg.com',
])

const CUSTOM_BLOCK_RULES = `
||aliexpress.com^
||aliexpress-media.com^
||popads.net^
||popcash.net^
||adsterra.com^
||propellerads.com^
||exoclick.com^
||juicyads.com^
||clickadilla.com^
||monetag.com^
||hilltopads.com^
||ad-maven.com^
||clickadu.com^
||adcash.com^
||bet365.com^
||1xbet.com^
||opera.com/download^
`

export async function initAdBlockEngine(): Promise<ElectronBlocker> {
  if (engine) return engine

  const cachePath = getCachePath()
  if (existsSync(cachePath)) {
    try {
      const buf = await readFile(cachePath)
      engine = ElectronBlocker.deserialize(new Uint8Array(buf))
      console.log('[Aura/AdBlock] Loaded cached uBlock engine')
    } catch (err) {
      console.warn('[Aura/AdBlock] Failed to deserialize cached engine, rebuilding...')
    }
  }

  if (!engine) {
    console.log('[Aura/AdBlock] Downloading EasyList + EasyPrivacy filters...')
    engine = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, { enableDefaults: true })
    try {
      await writeFile(cachePath, engine.serialize())
    } catch {}
  }

  // Append custom domain rules to engine
  engine.update({
    newLists: [CUSTOM_BLOCK_RULES]
  })

  // Listen for request blocks to update stats
  engine.on('request-blocked', (request: any) => {
    try {
      const wcId = request.webContentsId ?? request.tabId
      if (wcId !== undefined && wcId >= 0) {
        incrementWcBlockedCount(wcId, 1)
      }

      if (request.sourceHostname) {
        const cleanHost = cleanDomain(request.sourceHostname)
        if (!NEVER_BLOCK_HOSTS.has(cleanHost)) {
          incrementSiteBlockedCount(cleanHost, 1)
        }
      }
    } catch {}
  })

  return engine
}

export function incrementWcBlockedCount(wcId: number, count = 1): void {
  if (wcId < 0) return
  const current = tabBlockedCounts.get(wcId) || { ads: 0, trackers: 0, total: 0 }
  current.ads += count
  current.total += count
  tabBlockedCounts.set(wcId, current)
}

export function getWcBlockedStats(wcId: number): { ads: number; trackers: number; total: number } {
  return tabBlockedCounts.get(wcId) || { ads: 0, trackers: 0, total: 0 }
}

// Legacy aliases (same wcId-keyed map)
export const incrementTabBlockedCount = incrementWcBlockedCount
export const getTabBlockedStats = getWcBlockedStats

export function registerNetworkAdBlocker(targetSession: Session): void {
  if (!engine) return
  if (installedSessions.has(targetSession)) return

  // enableBlockingInSession attaches the webRequest listener correctly without conflicts
  engine.enableBlockingInSession(targetSession)
  installedSessions.add(targetSession)
  console.log('[Aura/AdBlock] Network blocker registered on session')
}

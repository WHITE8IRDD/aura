import { webContents } from 'electron'
import type {
  CallbackResponse, HandlerDetails, OnBeforeRequestListenerDetails, Session, WebContents,
  WindowOpenHandlerResponse,
} from 'electron'
import { fromElectronDetails } from '@ghostery/adblocker-electron'
import { parse as parseUrl } from 'tldts'
import { getBlocker } from './engine'
import {
  getSiteShields, incrementSiteBlockedCount, cleanDomain,
} from './shields-store'
import { stripTrackingParams } from './url-cleaner'
import {
  hostOf, hrefsMatch, isPopunderHost, isSocialWidget, isYouTubeHost, hostMatches, registrableDomain,
} from './util'
import {
  AGGRESSIVE_PATH_PATTERN, ANNOYANCE_CSS, BASE_COSMETIC_CSS, FINGERPRINT_HOSTS, POPUNDER_PATH_PATTERN,
} from './constants'

export { initEngine } from './engine'

export function getBlockerStats(): { trackers: number; ads: number; fingerprinters: number; social: number; bandwidthSavedBytes: number } {
  return { trackers: 0, ads: 0, fingerprinters: 0, social: 0, bandwidthSavedBytes: 0 }
}

// HTTPS-only mode state (integrated from security/https-only.ts)
const allowedInsecureHosts = new Set<string>()
const SKIP_UPGRADE_HOSTS = new Set<string>([
  'youtube.com', 'www.youtube.com', 'google.com', 'www.google.com'
])

function isLocalAddress(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  )
}

export function allowInsecureHost(host: string): void {
  allowedInsecureHosts.add(host)
}

export function isHostAllowedInsecure(host: string): boolean {
  return allowedInsecureHosts.has(host)
}

const GESTURE_WINDOW_MS = 1500
const LINK_CLICK_WINDOW_MS = 2000

export const tabBlockedCounts = new Map<number, number>()

const registeredTabs = new Set<number>()
const installedSessions = new WeakSet<Session>()
const lastGesture = new Map<number, { t: number; href: string }>()
const domBuckets = new Map<number, { t: number; n: number }>()
const cosmeticsInjected = new Set<number>()

export const isRegisteredTab = (id: number): boolean => registeredTabs.has(id)
export const getPageCount = (id: number): number => tabBlockedCounts.get(id) ?? 0

function recordBlock(wcId: number, topHost: string, n = 1): void {
  tabBlockedCounts.set(wcId, (tabBlockedCounts.get(wcId) ?? 0) + n)
  incrementSiteBlockedCount(topHost, n)
}

export function noteGesture(wcId: number, href: string): void {
  if (!registeredTabs.has(wcId)) return
  lastGesture.set(wcId, { t: Date.now(), href: href.slice(0, 2048) })
}

export function noteDomBlocked(wc: WebContents, count: number): void {
  if (!registeredTabs.has(wc.id)) return
  const now = Date.now()
  const bucket = domBuckets.get(wc.id) ?? { t: now, n: 0 }
  if (now - bucket.t > 1000) {
    bucket.t = now
    bucket.n = 0
  }
  if (bucket.n >= 60) return
  const n = Math.max(0, Math.min(25, Math.floor(count)))
  bucket.n += n
  domBuckets.set(wc.id, bucket)
  if (n > 0) recordBlock(wc.id, cleanDomain(hostOf(wc.getURL())), n)
}

/* ---------------------------------------------------------------- network layer */

function handleBeforeRequest(details: OnBeforeRequestListenerDetails): CallbackResponse {
  const wcId = details.webContentsId
  if (wcId === undefined || !registeredTabs.has(wcId)) return {}

  let reqUrl: URL
  try {
    reqUrl = new URL(details.url)
  } catch {
    return {}
  }
  if (!/^(https?|wss?):$/.test(reqUrl.protocol)) return {}

  // HTTPS-only mode: upgrade HTTP → HTTPS for mainFrame requests
  if (details.resourceType === 'mainFrame' && reqUrl.protocol === 'http:') {
    try { if (require('../settings').getSetting('httpsOnly')) {
      const host = reqUrl.hostname.toLowerCase()
      if (
        !allowedInsecureHosts.has(host) &&
        !isLocalAddress(host) &&
        !SKIP_UPGRADE_HOSTS.has(host)
      ) {
        reqUrl.protocol = 'https:'
        return { redirectURL: reqUrl.toString() }
      }
    }} catch {}
  }

  const reqHost = reqUrl.hostname.toLowerCase()
  const isMain = details.resourceType === 'mainFrame'
  const tab = webContents.fromId(wcId)
  const topHost = cleanDomain(isMain ? reqHost : hostOf(tab?.getURL()) || hostOf(details.referrer))

  if (isYouTubeHost(reqHost) || isYouTubeHost(topHost)) return {}

  const s = getSiteShields(topHost)
  if (s.level === 'off') return {}

  const block = (): CallbackResponse => {
    recordBlock(wcId, topHost)
    return { cancel: true }
  }

  if (isMain && details.method === 'GET') {
    const cleaned = stripTrackingParams(details.url)
    if (cleaned) return { redirectURL: cleaned }
  }

  if (s.blockAds) {
    if (isPopunderHost(reqHost)) return block()
    if (!isMain && POPUNDER_PATH_PATTERN.test(reqUrl.pathname)) return block()
  }
  if (isMain) return {}

  const thirdParty = registrableDomain(reqHost) !== registrableDomain(topHost)

  if (thirdParty) {
    if (s.blockSocial && isSocialWidget(reqHost, reqUrl.pathname)) return block()
    if (s.blockFingerprinters && hostMatches(reqHost, FINGERPRINT_HOSTS)) return block()
  }

  const blocker = getBlocker()
  if (blocker && (s.blockAds || s.blockTrackers)) {
    const result = blocker.match(fromElectronDetails(details))
    if (result.redirect) {
      recordBlock(wcId, topHost)
      return { redirectURL: result.redirect.dataUrl }
    }
    if (result.match) return block()
  }

  if (
    s.level === 'aggressive' && thirdParty && AGGRESSIVE_PATH_PATTERN.test(reqUrl.pathname) &&
    (details.resourceType === 'script' || details.resourceType === 'subFrame' || details.resourceType === 'image')
  ) {
    return block()
  }

  return {}
}

export function installBlockerOnSession(ses: Session): void {
  if (installedSessions.has(ses)) return
  installedSessions.add(ses)
  ses.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (details, callback) => {
      try {
        callback(handleBeforeRequest(details))
      } catch (err) {
        console.warn('[Aura/Blocker] request handler error:', err)
        callback({})
      }
    }
  )
}

/* ---------------------------------------------------------------- popups & navigation */

function shouldBlockPopup(wc: WebContents, details: HandlerDetails): boolean {
  const curHost = cleanDomain(hostOf(wc.getURL()))
  if (isYouTubeHost(curHost)) return false
  const s = getSiteShields(curHost)
  if (s.level === 'off') return false

  const target = (() => {
    try {
      return new URL(details.url)
    } catch {
      return null
    }
  })()
  if (target) {
    if (s.blockAds && (isPopunderHost(target.hostname) || POPUNDER_PATH_PATTERN.test(target.pathname))) return true
  }

  const g = lastGesture.get(wc.id)
  const fresh = !!g && Date.now() - g.t < GESTURE_WINDOW_MS
  if (!fresh) return true

  if (s.level === 'aggressive' && target && registrableDomain(target.hostname) !== registrableDomain(curHost)) {
    return !(g!.href && hrefsMatch(g!.href, details.url))
  }
  return false
}

function shouldBlockNavigation(wc: WebContents, targetUrl: string, kind: 'navigate' | 'redirect'): boolean {
  const curHost = cleanDomain(hostOf(wc.getURL()))
  if (!curHost || isYouTubeHost(curHost)) return false
  const s = getSiteShields(curHost)
  if (s.level === 'off') return false

  const host = hostOf(targetUrl)
  if (!host) return false
  if (s.blockAds && isPopunderHost(host)) return true
  if (kind !== 'navigate') return false
  if (registrableDomain(host) === registrableDomain(curHost)) return false

  const g = lastGesture.get(wc.id)
  const clickedThatLink = !!g && Date.now() - g.t < LINK_CLICK_WINDOW_MS && !!g.href && hrefsMatch(g.href, targetUrl)
  if (clickedThatLink) return false

  if (isYouTubeHost(host)) return true
  const fresh = !!g && Date.now() - g.t < GESTURE_WINDOW_MS
  return s.level === 'aggressive' && !fresh
}

/* ---------------------------------------------------------------- cosmetics */

async function injectCosmetics(wc: WebContents): Promise<void> {
  if (wc.isDestroyed() || cosmeticsInjected.has(wc.id)) return
  const url = wc.getURL()
  if (!/^https?:/i.test(url)) return
  const host = hostOf(url)
  if (isYouTubeHost(host)) return
  const s = getSiteShields(cleanDomain(host))
  if (s.level === 'off') return

  const css: string[] = []
  if (s.blockAds) css.push(BASE_COSMETIC_CSS)
  if (s.blockAnnoyances) css.push(ANNOYANCE_CSS)

  const blocker = getBlocker()
  if (blocker && s.blockAds) {
    try {
      const parsed = parseUrl(url)
      const result = blocker.getCosmeticsFilters({
        url,
        hostname: parsed.hostname ?? host,
        domain: parsed.domain ?? '',
        classes: [],
        hrefs: [],
        ids: [],
        getBaseRules: s.level === 'aggressive',
        getInjectionRules: false,
        getExtendedRules: false,
        getRulesFromDOM: false,
        getRulesFromHostname: true,
      })
      if (result.styles) css.push(result.styles)
    } catch (err) {
      console.warn('[Aura/Blocker] cosmetic lookup failed:', err)
    }
  }
  if (css.length === 0) return

  try {
    await wc.insertCSS(css.join('\n'), { cssOrigin: 'user' })
    cosmeticsInjected.add(wc.id)
  } catch {
    // tab navigated away or was destroyed mid-injection
  }
}

/* ---------------------------------------------------------------- tab registration */

export interface TabProtectionOptions {
  onAllowedPopup: (details: HandlerDetails) => WindowOpenHandlerResponse
}

export function registerTabWebContents(wc: WebContents, opts: TabProtectionOptions): void {
  const id = wc.id
  if (registeredTabs.has(id)) return
  registeredTabs.add(id)
  tabBlockedCounts.set(id, 0)
  installBlockerOnSession(wc.session)

  wc.on('did-start-navigation', (event) => {
    if (event.isMainFrame && !event.isSameDocument) {
      tabBlockedCounts.set(id, 0)
      cosmeticsInjected.delete(id)
    }
  })

  wc.on('will-navigate', (event) => {
    if (event.isMainFrame && shouldBlockNavigation(wc, event.url, 'navigate')) {
      event.preventDefault()
      recordBlock(id, cleanDomain(hostOf(wc.getURL())))
    }
  })
  wc.on('will-redirect', (event) => {
    if (event.isMainFrame && shouldBlockNavigation(wc, event.url, 'redirect')) {
      event.preventDefault()
      recordBlock(id, cleanDomain(hostOf(wc.getURL())))
    }
  })

  wc.setWindowOpenHandler((details) => {
    if (shouldBlockPopup(wc, details)) {
      recordBlock(id, cleanDomain(hostOf(wc.getURL())))
      return { action: 'deny' }
    }
    return opts.onAllowedPopup(details)
  })

  wc.on('did-navigate', () => void injectCosmetics(wc))
  wc.on('dom-ready', () => void injectCosmetics(wc))

  wc.once('destroyed', () => {
    registeredTabs.delete(id)
    tabBlockedCounts.delete(id)
    lastGesture.delete(id)
    domBuckets.delete(id)
    cosmeticsInjected.delete(id)
  })
}

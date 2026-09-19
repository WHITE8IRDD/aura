import { WebContents } from 'electron'

const STREAMING_RE = /witanime|reanime|anime|stream/i

// Explicit embed hosts not caught by the /stream/ regex (hijack clicks
// usually fire inside the video iframe, not on witanime itself).
const STREAMING_EMBED_HOSTS = [
  'vidhide', 'voe', 'filemoon', 'vidoza', 'mixdrop',
  'upstream', 'mcloud', 'megafiles', 'dood',
]

function isStreamingHost(url: string): boolean {
  const l = (url || '').toLowerCase()
  return STREAMING_RE.test(l) || STREAMING_EMBED_HOSTS.some(h => l.includes(h))
}

const AD_PATTERNS = [
  'popads', 'popcash', 'adsterra', 'propellerads', 'exoclick', 'juicyads',
  'clickadilla', 'monetag', 'hilltopads', 'ad-maven', 'clickadu', 'adcash',
  'bet365', '1xbet', 'gambling', 'casino', 'redirect', 'shortener', 'traffic',
  'banner', 'promo', 'link', 'out', 'clk', 'goto', 'opera.com', 'aliexpress'
]

const STREAMING_HIJACK_TARGETS = [
  'youtube.com', 'youtu.be', 'aliexpress', 'opads', 'popads', 'popcash',
  'adsterra', 'monetag', '1xbet', 'bet365', 'casino', 'opera.com/download',
  'xm.com', 'trading',
]

function isHijackTarget(url: string): boolean {
  const l = (url || '').toLowerCase()
  return STREAMING_HIJACK_TARGETS.some(pat => l.includes(pat))
}

/**
 * Single source of truth for popup decisions. Returns true when the open
 * must be denied outright (no tab, no window). MUST be consulted by every
 * setWindowOpenHandler registration — Electron keeps only the LAST one.
 */
export function shouldBlockPopup(currentUrl: string, url: string, disposition?: string): boolean {
  if (!url || url === 'about:blank') return true

  const lowerUrl = url.toLowerCase()

  // Streaming/anime/embed page trying to open YouTube or ad links -> DENY!
  if (
    isStreamingHost(currentUrl) &&
    (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('aliexpress') || lowerUrl.includes('adsterra'))
  ) {
    console.log(`[Aura/Shields] Blocked streaming site popup: ${url}`)
    return true
  }

  if (AD_PATTERNS.some(pat => lowerUrl.includes(pat))) return true
  if (disposition === 'pop-up' || disposition === 'new-window') {
    console.log(`[Aura/Shields] Blocked ad popup: ${url}`)
    return true
  }
  return false
}

export function applyPopupInterceptor(wc: WebContents): void {
  // Idempotency: tabs.ts + the global web-contents-created hook both call
  // this; duplicate will-navigate listeners would double-log and double-fire.
  try {
    if ((wc as any).__auraPopupGuardsApplied) return
    ;(wc as any).__auraPopupGuardsApplied = true
  } catch {}
  // 1. Intercept window.open & popups
  wc.setWindowOpenHandler(({ url, disposition }) => {
    if (shouldBlockPopup(wc.getURL() || '', url, disposition)) {
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // 2. Same-Tab Navigation Guard (stops location.href = 'https://youtube.com/...')
  wc.on('will-navigate', (event, navigationUrl) => {
    if (isStreamingHost(wc.getURL() || '') && isHijackTarget(navigationUrl)) {
      console.log(`[Aura/Shields] Blocked same-tab navigation hijack: ${navigationUrl}`)
      event.preventDefault()
    }
  })

  // 3. Intercept HTTP redirects
  wc.on('will-redirect', (event, navigationUrl) => {
    if (isStreamingHost(wc.getURL() || '') && isHijackTarget(navigationUrl)) {
      console.log(`[Aura/Shields] Blocked redirect hijack: ${navigationUrl}`)
      event.preventDefault()
    }
  })
}

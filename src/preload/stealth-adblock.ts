import { webFrame } from 'electron'

const EXEMPT_HOSTS = [
  'youtube.com',
  'googlevideo.com',
  'ytimg.com',
  'accounts.google.com',
  'twitch.tv',
]

function isExemptHost(): boolean {
  try {
    const host = window.location.hostname.toLowerCase()
    return EXEMPT_HOSTS.some(h => host.includes(h))
  } catch {
    return false
  }
}

function reportDomBlocked(count: number): void {
  try {
    if (!count || count <= 0) return
    window.dispatchEvent(new CustomEvent('aura-dom-blocked', { detail: { count } }))
  } catch {}
}

/**
 * Runs in the ISOLATED preload world (CSP / Trusted-Types immune — these
 * DOM APIs are not script sinks). Destroys AliExpress banners, Firefox
 * survey modals and floating sports widgets the millisecond they appear
 * via MutationObserver, plus a 300ms sweep for anything missed.
 */
function nukeAds(): number {
  try {
    if (isExemptHost()) return 0
    if (!document || !document.querySelectorAll) return 0

    let removed = 0
    const hide = (el: Element): void => {
      try {
        ;(el as HTMLElement).style.setProperty('display', 'none', 'important')
        el.remove()
        removed++
      } catch {}
    }

    // A. AliExpress banners (+ parent containers)
    try {
      document.querySelectorAll('a[href*="aliexpress"], img[src*="aliexpress"]').forEach((el) => {
        hide((el as Element).closest('div, section, iframe, p') || el)
      })
    } catch {}

    // B. "Is your browser Firefox?" survey / browser-choice modals.
    // Iterated leaf-first (reverse document order): removing the modal
    // first strips its text from ancestors, so page-root wrappers that
    // merely CONTAIN the modal text survive.
    try {
      const candidates = Array.from(document.querySelectorAll('div, section, dialog')).reverse()
      candidates.forEach((el) => {
        if (!el.isConnected) return
        const text = ((el as HTMLElement).textContent || '').toLowerCase()
        if (
          text.includes('is your browser firefox') ||
          text.includes('choose your browser to continue')
        ) {
          hide(el)
        }
      })
    } catch {}

    // C. Floating sports-ball / corner widgets
    try {
      document.querySelectorAll('div, section, aside').forEach((el) => {
        try {
          const style = window.getComputedStyle(el)
          const isFixed = style.position === 'fixed' || style.position === 'absolute'
          const zIndex = parseInt(style.zIndex || '0', 10)
          if (!isFixed || zIndex < 20 || el.tagName === 'VIDEO') return
          const rect = el.getBoundingClientRect()
          const isCorner =
            (rect.right >= window.innerWidth - 160 || rect.left <= 160) &&
            rect.height < 400
          if (!isCorner) return
          if (el.querySelector('video')) return
          if ((el as HTMLElement).closest('header, nav, #main, .main')) return
          const hasAdContent =
            el.querySelector('img, svg, canvas, a') || style.backgroundImage !== 'none'
          if (hasAdContent) hide(el)
        } catch {}
      })
    } catch {}

    // D. Opera & explicit ad selectors
    try {
      const adSelectors = [
        '.opera-ad', '.ad-box', '.ads-container', '.banner-ads', '.ad-wrapper',
        'a[href*="opera.com"]', 'a[href*="bet365"]', 'a[href*="1xbet"]',
        'a[href*="monetag"]', 'a[href*="adsterra"]',
      ]
      adSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => hide(el))
      })
    } catch {}

    return removed
  } catch {
    return 0
  }
}

export function injectStealthAdBlockScriptlet(): void {
  try {
    if (isExemptHost()) return

    // 1. Neutralize window.open in the MAIN world via webFrame. This
    // bypasses page CSP entirely (no inline <script> element needed, so
    // Trusted Types / script-src cannot refuse it).
    try {
      webFrame.executeJavaScript(`
        (function() {
          try {
            let lastUserClick = 0;
            window.addEventListener('click', function() { lastUserClick = Date.now(); }, true);
            window.addEventListener('mouseup', function() { lastUserClick = Date.now(); }, true);
            const origOpen = window.open;
            window.open = function(url, target, features) {
              try {
                const strUrl = String(url || '').toLowerCase();
                const timeSinceClick = Date.now() - lastUserClick;
                const isAd = ['pop', 'ad', 'bet', 'click', 'cash', 'redirect', 'link', 'promo', 'goto', 'out', 'opera', '1xbet', 'aliexpress', 'youtube.com']
                  .some(function(k) { return strUrl.includes(k); });
                if (isAd || timeSinceClick > 800 || !url) {
                  try { window.dispatchEvent(new CustomEvent('aura-dom-blocked', { detail: { count: 1 } })); } catch (e) {}
                  return null;
                }
              } catch (e) {}
              return origOpen.apply(window, arguments);
            };
          } catch (e) {}
        })();
      `)
    } catch {}

    // 2. Continuous DOM nuke in the isolated world.
    const runNuke = (): void => {
      try {
        const removed = nukeAds()
        if (removed > 0) reportDomBlocked(removed)
      } catch {}
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runNuke)
    } else {
      runNuke()
    }

    // MutationObserver: destroy banners/modals the millisecond they appear.
    try {
      const observer = new MutationObserver(() => {
        try {
          runNuke()
        } catch {}
      })
      const root = document.documentElement || document.body
      if (root) {
        observer.observe(root, { childList: true, subtree: true })
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          try {
            observer.observe(document.documentElement || document.body, {
              childList: true,
              subtree: true,
            })
          } catch {}
        })
      }
    } catch {}

    // Sweep fallback for anything the observer misses.
    setInterval(runNuke, 300)
  } catch {}
}

// Re-exported for tab.ts interval driver (isolated-world loop backup).
export { nukeAds as nukeStreamingAds }

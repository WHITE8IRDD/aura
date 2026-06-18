import type { WebContents } from 'electron'

/**
 * Cookie banner killer — auto-hides common cookie consent overlays
 * by injecting a CSS rules file at page load.
 *
 * This is conceptually similar to the "I don't care about cookies"
 * Firefox/Chrome extension. We don't auto-click "reject" (which would
 * require per-site DOM heuristics), we just hide the visual overlay
 * — the result is the user can continue browsing without dismissing
 * popups manually.
 *
 * The CSS list below is curated from public lists used by uBlock Origin's
 * "EasyList Cookie" filter (https://easylist.to/easylist/easylist-cookie.txt).
 * Stage 10 plan: fetch and cache the full upstream list weekly.
 */

const COOKIE_BANNER_CSS = `
/* Generic cookie banner / consent classes */
[id*="cookie-banner" i],
[id*="cookie-notice" i],
[id*="cookie-consent" i],
[id*="cookie-policy" i],
[id*="cookie-bar" i],
[id*="cookieBar" i],
[id*="cookieNotice" i],
[id*="cookie_notice" i],
[id*="cookieconsent" i],
[id*="gdpr" i],
[class*="cookie-banner" i],
[class*="cookie-notice" i],
[class*="cookie-consent" i],
[class*="cookie-policy" i],
[class*="cookie-bar" i],
[class*="cookieBar" i],
[class*="cookieNotice" i],
[class*="cookie_notice" i],
[class*="cookieconsent" i],
[class*="gdpr-banner" i],
[class*="consent-banner" i],
[class*="consent-popup" i],
[class*="privacy-banner" i],
[aria-label*="cookie" i][role="dialog"],
[aria-label*="consent" i][role="dialog"],
[aria-label*="privacy" i][role="dialog"],
[data-test*="cookie" i],
[data-testid*="cookie" i],

/* Common third-party consent platforms */
#onetrust-banner-sdk,
#onetrust-consent-sdk,
#truste-consent-track,
#truste-consent-content,
.cmplz-cookiebanner,
.cc-window,
.cc-banner,
.cc-bottom,
.cookie-law-info-bar,
.ot-sdk-row,
#sp_message_container_,
[id^="sp_message_container_"],
.qc-cmp2-container,
#qc-cmp2-container,
#didomi-host,
.didomi-popup-container,
.osano-cm-dialog,
.osano-cm-window,
#axeptio_overlay,
#axeptio_main_button,
#hs-eu-cookie-confirmation,
#CybotCookiebotDialog,
#CybotCookiebotDialogBodyUnderlay,
.fc-consent-root,
#consent_blackbar,
#cookiescript_injected,
[class^="iubenda-cs-"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Restore body scrolling that some banners disable */
html, body {
  overflow: auto !important;
}
`

/**
 * Inject the cookie-killer CSS into a page.
 * Safe to call on every navigation — Chromium dedupes via cssOrigin.
 */
export async function applyCookieKillerTo(wc: WebContents): Promise<void> {
  try {
    await wc.insertCSS(COOKIE_BANNER_CSS, { cssOrigin: 'user' })
  } catch (err) {
    console.warn('[Aura/cookie-killer] insertCSS failed:', err)
  }
}

export { COOKIE_BANNER_CSS }

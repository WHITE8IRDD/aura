import { WebContents } from 'electron'

export const GLOBAL_COSMETIC_CSS = `
/* Target AliExpress Ad Banners */
a[href*="aliexpress"],
img[src*="aliexpress"],
[class*="aliexpress"],
[id*="aliexpress"],
iframe[src*="aliexpress"],

/* Target Opera Ads & Banners */
a[href*="opera.com"],
img[src*="opera"],
.opera-ad,

/* Target Floating Widgets & Survey Modals */
[class*="floating-ad"], [id*="floating-ad"],
[class*="sticky-ad"], [id*="sticky-ad"],
[class*="widget-ad"], [id*="widget-ad"],
div[class*="ball"], div[id*="ball"],
div[class*="modal"][class*="browser"],
div[class*="popup"][class*="browser"],

/* General Anime/Streaming Site Ad Containers */
.witanime-ad,
.anime-ad,
.sidebar-ad,
.main-ad,
.ad-box,
.ads-container,
.banner-ads,
[class*="floating-ad"],
[id*="floating-ad"],
[class*="sticky-ad"],
[id*="sticky-ad"],
[class*="widget-ad"],
[id*="widget-ad"],
div[class*="ball"],
div[id*="ball"],
a[href*="bet365"],
a[href*="1xbet"],
a[href*="monetag"],
a[href*="adsterra"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  max-height: 0 !important;
  pointer-events: none !important;
}
`

export async function applyCosmeticHiding(wc: WebContents): Promise<void> {
  try {
    const url = wc.getURL() || ''
    const lower = url.toLowerCase()

    // Only web pages — never our own file:// UI, devtools, or auth pages.
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      return
    }

    // DO NOT INJECT ON YOUTUBE, TWITCH, OR GOOGLE AUTH
    if (
      lower.includes('youtube.com') ||
      lower.includes('googlevideo.com') ||
      lower.includes('ytimg.com') ||
      lower.includes('twitch.tv') ||
      lower.includes('accounts.google.com')
    ) {
      return
    }

    await wc.insertCSS(GLOBAL_COSMETIC_CSS, { cssOrigin: 'user' })
  } catch {}
}

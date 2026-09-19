export const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_name',
  'utm_brand', 'utm_creative_format', 'utm_marketing_tactic',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'twclid', 'ttclid',
  'li_fat_id', 'igshid', 'mc_eid', 'mc_cid', '_hsenc', '_hsmi', '__hstc', '__hssc', '__hsfp',
  'hsctatracking', 'mkt_tok', 'vero_id', 'vero_conv', 'oly_enc_id', 'oly_anon_id', 'rb_clickid',
  's_cid', 'sccid', 'trk_contact', 'trk_msg', 'trk_module', 'trk_sid', '_ga', '_gl', 'ref_src',
  'ref_url', 'spm', 'cmpid', 'elqtrackid', 'elqaid', 'elqat', 'soc_src', 'soc_trk', 'icid', 'ncid',
  'sr_share', 'wickedid', 'irclickid', 'ck_subscriber_id', 'epik', 'piwik_campaign', 'piwik_kwd',
])

export const TRACKING_PARAM_PREFIXES: readonly string[] = ['utm_', 'mtm_', 'pk_', 'hsa_']

export const YOUTUBE_EXEMPT_HOSTS: readonly string[] = [
  'youtube.com', 'youtube-nocookie.com', 'googlevideo.com', 'ytimg.com', 'ggpht.com', 'youtu.be',
]

export const POPUNDER_DOMAINS: readonly string[] = [
  'adsterra.com', 'highperformanceformat.com', 'highrevenuegate.com', 'effectivegatecpm.com',
  'profitablecpmrate.com', 'profitablegatecpm.com',
  'propellerads.com', 'propellerclick.com', 'onclickalgo.com', 'onclickmega.com', 'onclasrv.com',
  'oclasrv.com', 'propu.sh', 'monetag.com',
  'exoclick.com', 'exosrv.com', 'exdynsrv.com', 'magsrv.com',
  'popads.net', 'popcash.net', 'clickadilla.com', 'clickadu.com', 'hilltopads.net', 'hilltopads.com',
  'adcash.com', 'juicyads.com', 'trafficjunky.net', 'trafficstars.com', 'tsyndicate.com',
]

export const POPUNDER_HOST_PATTERNS: readonly RegExp[] = [
  /(^|\.)1x(bet|lite|slots|bit|games|stavka)[a-z0-9-]*\./i,
]

export const POPUNDER_PATH_PATTERN = /(^|[/?&=._-])(pop-?under|click-?under|popcash|popads)([/?&=._-]|$)/i
export const AGGRESSIVE_PATH_PATTERN = /\/(ads?|adserver|adframe|banners?|sponsored|prebid)[/._-]/i

export const AD_FRAME_HOSTS: readonly string[] = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'adnxs.com', 'taboola.com',
  'outbrain.com', 'criteo.com', 'amazon-adsystem.com', 'adform.net', 'rubiconproject.com',
  'pubmatic.com', 'openx.net',
]

export const SOCIAL_WIDGET_HOSTS: readonly string[] = [
  'connect.facebook.net', 'staticxx.facebook.com', 'platform.twitter.com', 'platform.linkedin.com',
  'platform.instagram.com', 'assets.pinterest.com', 'widgets.pinterest.com', 'sharethis.com',
  'addthis.com', 'addtoany.com',
]

export const FINGERPRINT_HOSTS: readonly string[] = [
  'fingerprintjs.com', 'fpjs.io', 'fpcdn.io', 'iovation.com', 'iesnare.com',
  'threatmetrix.com', 'online-metrix.net',
]

export const BASE_COSMETIC_CSS = `
ins.adsbygoogle, .adsbygoogle, [id^="google_ads_iframe"], [id^="google_ads_"], [id^="div-gpt-ad"],
[data-ad-slot], [data-google-query-id], .ad-banner, .ad-container, .ad-slot, .ad-wrapper, .advert,
.advertisement, .banner-ad, .sponsored-ad, [id*="taboola"], [class*="taboola"], .OUTBRAIN, [id^="outbrain"],
iframe[src*="doubleclick.net"], iframe[src*="googlesyndication.com"], iframe[src*="adsterra"],
iframe[src*="propellerads"], iframe[src*="exoclick"], iframe[src*="popads"],
a[href*="opera.com/download"], a[href*="opera.com/gx"], a[href*="opera.com/computer"],
[class*="opera" i][class*="banner" i], [id*="opera" i][id*="banner" i],
a[href*="s.click.aliexpress.com"], a[href*="aliexpress.com/af/"], iframe[src*="aliexpress.com"],
[class*="aliexpress" i][class*="banner" i] {
  display: none !important;
  visibility: hidden !important;
}
`

export const ANNOYANCE_CSS = `
[class*="survey" i][class*="modal" i], [id*="survey" i][id*="modal" i], [class*="survey" i][class*="popup" i],
[class*="rugby" i], [class*="sports-widget" i], [id*="sports-widget" i],
[class*="floating-widget" i], [id*="floating-widget" i], [class*="side-widget" i] {
  display: none !important;
}
`

/**
 * URL Tracking Parameter Stripper
 * Strips known invasive tracking tokens (utm_*, fbclid, gclid, etc.) from URLs
 * before navigation occurs.
 */

const TRACKING_PARAMS = new Set([
  // Google / Analytics
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_cid', 'utm_reader',
  'gclid', 'gclsrc', '_ga', '_gl',
  // Facebook / Instagram
  'fbclid', 'igshid',
  // Twitter / X
  'twclid',
  // Microsoft / Bing
  'msclkid',
  // Yandex
  'yclid', '_openstat',
  // Mailchimp / Email
  'mc_eid', 'mc_cid',
  // Hubspot
  '_hsenc', '_hsmi', 'hsCtaTracking',
  // Affiliate & Cross-site trackers
  'aff_id', 'clickid', 'trk_id', 'tblci'
])

export function cleanTrackingUrl(rawUrl: string): string | null {
  try {
    if (!rawUrl || !rawUrl.startsWith('http')) return null
    const url = new URL(rawUrl)
    let modified = false

    for (const param of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(param.toLowerCase()) || param.toLowerCase().startsWith('utm_')) {
        url.searchParams.delete(param)
        modified = true
      }
    }

    return modified ? url.toString() : null
  } catch {
    return null
  }
}
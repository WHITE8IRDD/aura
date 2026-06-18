import { getBlockerStats } from './blocker'

interface PrivacyStats {
  trackersBlocked: number
  adsBlocked: number
  fingerprintersBlocked: number
  socialBlocked: number
  bandwidthSavedKb: number
}

export function getPrivacyStats(): PrivacyStats {
  const s = getBlockerStats()
  return {
    trackersBlocked: s.trackers,
    adsBlocked: s.ads,
    fingerprintersBlocked: s.fingerprinters,
    socialBlocked: s.social,
    bandwidthSavedKb: Math.floor(s.bandwidthSavedBytes / 1024)
  }
}

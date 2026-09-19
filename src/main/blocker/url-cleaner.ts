import { TRACKING_PARAMS, TRACKING_PARAM_PREFIXES } from './constants'

export function stripTrackingParams(rawUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.search) return null

  let changed = false
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase()
    if (TRACKING_PARAMS.has(lower) || TRACKING_PARAM_PREFIXES.some((p) => lower.startsWith(p))) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  return changed ? url.toString() : null
}

import { getDomain } from 'tldts'
import {
  POPUNDER_DOMAINS, POPUNDER_HOST_PATTERNS, YOUTUBE_EXEMPT_HOSTS, SOCIAL_WIDGET_HOSTS,
} from './constants'

const registrableCache = new Map<string, string>()

export function registrableDomain(host: string): string {
  const hit = registrableCache.get(host)
  if (hit !== undefined) return hit
  const value = getDomain(host) ?? host
  if (registrableCache.size > 5000) registrableCache.clear()
  registrableCache.set(host, value)
  return value
}

export function hostOf(url: string | undefined | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function hostMatches(host: string, list: readonly string[]): boolean {
  for (const d of list) if (host === d || host.endsWith('.' + d)) return true
  return false
}

export const isYouTubeHost = (host: string): boolean => hostMatches(host, YOUTUBE_EXEMPT_HOSTS)

export const isPopunderHost = (host: string): boolean =>
  hostMatches(host, POPUNDER_DOMAINS) || POPUNDER_HOST_PATTERNS.some((re) => re.test(host))

export function isSocialWidget(host: string, pathname: string): boolean {
  if (hostMatches(host, SOCIAL_WIDGET_HOSTS)) return true
  if (host === 'facebook.com' || host.endsWith('.facebook.com')) {
    return pathname.startsWith('/plugins/') || pathname === '/tr' || pathname.startsWith('/tr/')
  }
  return false
}

export function hrefsMatch(a: string, b: string): boolean {
  try {
    const x = new URL(a)
    const y = new URL(b)
    const trim = (p: string): string => (p.length > 1 ? p.replace(/\/+$/, '') : p)
    return x.hostname === y.hostname && trim(x.pathname) === trim(y.pathname)
  } catch {
    return false
  }
}

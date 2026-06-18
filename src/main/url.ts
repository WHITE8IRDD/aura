/**
 * url.ts — Input normalization for the address bar.
 *
 * Decides whether the user typed a URL to navigate to,
 * or a search query to send to DuckDuckGo.
 *
 * Rules (in order):
 *  1. Empty → new tab
 *  2. aura:// internal scheme → pass through
 *  3. Already has http/https/file/about scheme → pass through
 *  4. Looks like a hostname (has a dot, no spaces, valid TLD shape) → prepend https://
 *  5. localhost / bare IP → prepend https:// (or http:// for localhost)
 *  6. Everything else → DuckDuckGo search
 */

const SEARCH = (q: string): string =>
  `https://duckduckgo.com/?q=${encodeURIComponent(q)}`

export function normalizeInput(raw: string): string {
  const input = raw.trim()
  if (!input) return 'aura://newtab'

  // Internal Aura pages
  if (input.startsWith('aura://')) return input

  // Already a fully qualified URL
  if (/^https?:\/\//i.test(input)) return input
  if (/^(file|about|chrome):/i.test(input)) return input

  // localhost — use http not https (no cert locally)
  if (/^localhost(:\d+)?(\/.*)?$/.test(input)) return `http://${input}`

  // Bare IP address
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(input)) return `http://${input}`

  // Looks like a domain (has a dot, no spaces, something after the dot)
  const looksLikeDomain =
    /^[^\s]+\.[a-zA-Z]{2,}(\/.*)?$/.test(input) && !input.includes(' ')

  if (looksLikeDomain) return `https://${input}`

  // Fallback — search
  return SEARCH(input)
}

export function isInternal(url: string): boolean {
  return url.startsWith('aura://')
}

export function isSecure(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('aura://')
}

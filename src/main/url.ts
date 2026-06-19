import { getSetting } from './settings'

const SEARCH_URLS: Record<string, (q: string) => string> = {
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  google:     (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  brave:      (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  startpage:  (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`
}

export function searchUrl(query: string): string {
  const engine = getSetting('defaultSearchEngine')
  const builder = SEARCH_URLS[engine] ?? SEARCH_URLS.google
  return builder(query)
}

export function normalizeInput(raw: string): string {
  const input = raw.trim()
  if (!input) return 'aura://newtab'

  if (input.startsWith('aura://')) return input
  if (/^https?:\/\//i.test(input)) return input
  if (/^(file|about|chrome):/i.test(input)) return input

  if (/^localhost(:\d+)?(\/.*)?$/.test(input)) return `http://${input}`
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(input)) return `http://${input}`

  const looksLikeDomain =
    /^[^\s]+\.[a-zA-Z]{2,}(\/.*)?$/.test(input) && !input.includes(' ')

  if (looksLikeDomain) return `https://${input}`

  return searchUrl(input)
}

export function isInternal(url: string): boolean {
  return url.startsWith('aura://')
}

export function isSecure(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('aura://')
}

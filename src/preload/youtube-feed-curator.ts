import { ipcRenderer } from 'electron'
import type { YtRule, YtSettings } from '../shared/youtube'
import { DEFAULT_YT_SETTINGS } from '../shared/youtube'

/**
 * Aura YouTube feed curator. Runs INSIDE the tab preload's isolated world
 * (see tab.ts) — never injected as a page <script>, so page CSP cannot
 * block it and no world-crossing is needed. Exposes NOTHING to the page:
 * it talks to main only through the preload-scoped ipcRenderer import.
 *
 * Behavior is driven by the user's Aura settings + rules (hideShorts,
 * hideHomeFeed, focusMode, block_keyword/block_channel). All setup is
 * idempotent: a module-level started flag, marker attributes on touched
 * nodes, and a single shared MutationObserver.
 */

const HIDDEN_ATTR = 'data-aura-hidden'
const SEEN_ATTR = 'data-aura-seen'
const BANNER_ATTR = 'data-aura-home-banner'

export function isYouTubeHost(): boolean {
  const host = window.location.hostname
  return host === 'youtube.com' || host.endsWith('.youtube.com')
}

interface CuratorRules {
  blockKeywords: string[]
  blockChannels: { raw: string; normalized: string }[]
}

let started = false
let observer: MutationObserver | null = null
let hrefPoll: ReturnType<typeof setInterval> | null = null
let lastHref = ''
let settingsCache: YtSettings | null = null
let rulesCache: CuratorRules | null = null
let cacheForHref = ''
let scheduled = false

/* ── selectors (isolated helpers — easy to repair on YT layout changes) ── */

function shortsShelfSelector(): string {
  return 'ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer'
}

function videoCardSelector(): string {
  return (
    'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer,' +
    'ytd-grid-video-renderer, ytd-playlist-video-renderer'
  )
}

function cardTitle(card: Element): string {
  const t = card.querySelector('a#video-title, #video-title')
  return (t?.textContent ?? '').trim()
}

function cardChannel(card: Element): { id: string | null; title: string } {
  const link = card.querySelector('#channel-name a, ytd-channel-name a') as HTMLAnchorElement | null
  const href = link?.getAttribute('href') ?? ''
  const chanMatch = href.match(/^\/channel\/(UC[a-zA-Z0-9_-]{22})/)
  const handleMatch = href.match(/^\/(@[a-zA-Z0-9._-]{1,100})/)
  const title =
    link?.textContent?.trim() ||
    (card.querySelector('#channel-name #text, ytd-channel-name #text')?.textContent ?? '').trim()
  return { id: chanMatch?.[1] ?? null, title: handleMatch?.[1] ?? title }
}

/* ── settings + rules (cached per URL, refreshed on SPA nav) ── */

async function loadConfig(force: boolean): Promise<{ settings: YtSettings; rules: CuratorRules }> {
  if (!force && settingsCache && rulesCache && cacheForHref === window.location.href) {
    return { settings: settingsCache, rules: rulesCache }
  }
  let settings: YtSettings = { ...DEFAULT_YT_SETTINGS }
  const rules: CuratorRules = { blockKeywords: [], blockChannels: [] }
  try {
    const [s, rows] = await Promise.all([
      ipcRenderer.invoke('yt:getSettings') as Promise<YtSettings>,
      ipcRenderer.invoke('yt:getRules') as Promise<YtRule[]>,
    ])
    if (s && typeof s === 'object') {
      settings = {
        hideShorts: s.hideShorts !== false,
        hideHomeFeed: s.hideHomeFeed !== false,
        focusMode: s.focusMode === true,
        hideWatched: s.hideWatched === true,
      }
    }
    for (const row of Array.isArray(rows) ? rows : []) {
      if (row.rule_type === 'block_keyword' && row.value.trim()) {
        rules.blockKeywords.push(row.value.trim().toLocaleLowerCase())
      } else if (row.rule_type === 'block_channel' && row.value.trim()) {
        rules.blockChannels.push({
          raw: row.value.trim(),
          normalized: row.value.trim().toLocaleLowerCase(),
        })
      }
    }
  } catch {
    /* offline or shutting down: keep last-known config */
  }
  settingsCache = settings
  if (!rulesCache || force) rulesCache = rules
  cacheForHref = window.location.href
  return { settings, rules: rulesCache ?? rules }
}

function hideEl(el: Element): void {
  if ((el as HTMLElement).dataset.auraHidden === '1') return
  ;(el as HTMLElement).dataset.auraHidden = '1'
  ;(el as HTMLElement).style.display = 'none'
}

/* ── Shorts filtering (DOM-proven only — never inferred from RSS) ── */

function applyShortsFiltering(root: ParentNode): void {
  const shelves = root.querySelectorAll(shortsShelfSelector())
  shelves.forEach((shelf) => {
    if (shelf instanceof Element) hideEl(shelf)
  })

  const links = root.querySelectorAll('a[href^="/shorts/"]')
  links.forEach((link) => {
    if (!(link instanceof Element)) return
    if (link.closest(`[${HIDDEN_ATTR}="1"]`)) return
    const card = link.closest(videoCardSelector())
    if (card) hideEl(card)
  })

  const navEntries = root.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer')
  navEntries.forEach((entry) => {
    if (!(entry instanceof Element)) return
    const link = entry.querySelector('a[href^="/shorts"]') as HTMLAnchorElement | null
    const label = (entry.querySelector('#title, .title')?.textContent ?? '').trim().toLowerCase()
    if ((link || label === 'shorts') && !(entry as HTMLElement).dataset.auraHidden) hideEl(entry)
  })
}

/* ── home feed replace + focus mode ── */

function applyHomeFeed(root: ParentNode): void {
  const grid = root.querySelector('ytd-rich-grid-renderer #contents') as HTMLElement | null
  if (!grid || grid.dataset.auraHidden === '1') return
  hideEl(grid)
  if (document.querySelector(`[${BANNER_ATTR}]`)) return
  const banner = document.createElement('div')
  banner.setAttribute(BANNER_ATTR, '1')
  banner.style.cssText =
    'margin:48px auto;max-width:460px;text-align:center;padding:28px;border-radius:14px;' +
    'border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);' +
    'color:#fff;font:14px/1.5 system-ui,sans-serif;'
  banner.textContent =
    'Your recommendations live in Aura now — open the YouTube Feed from the toolbar play button.'
  grid.parentElement?.appendChild(banner)
}

function applyFocusMode(root: ParentNode): void {
  const related = root.querySelector('#related')
  if (related instanceof Element) hideEl(related)
  const comments = root.querySelector('#comments')
  if (comments instanceof Element) hideEl(comments)
}

/* ── keyword / channel blocking on youtube.com ── */

function applyBlockRules(root: ParentNode, rules: CuratorRules): void {
  if (rules.blockKeywords.length === 0 && rules.blockChannels.length === 0) return
  const cards = root.querySelectorAll(videoCardSelector())
  cards.forEach((card) => {
    if (!(card instanceof Element)) return
    const el = card as HTMLElement
    if (el.dataset.auraHidden === '1' || el.dataset.auraSeen === '1') return
    el.dataset.auraSeen = '1'

    const title = cardTitle(card).toLocaleLowerCase()
    if (title && rules.blockKeywords.some((kw) => title.includes(kw))) {
      hideEl(card)
      return
    }

    if (rules.blockChannels.length > 0) {
      const chan = cardChannel(card)
      const chanTitle = chan.title.toLocaleLowerCase()
      const blocked = rules.blockChannels.some(
        (rule) => (chan.id !== null && rule.raw === chan.id) || (chanTitle !== '' && rule.normalized === chanTitle),
      )
      if (blocked) hideEl(card)
    }
  })
}

/* ── Subscribe button lives in youtube/aura-sub.ts (Shadow DOM controller).
 * This module is filters-only: Shorts / home-feed / focus / block rules. */

/* ── sweep + observers ── */

function isHomePath(): boolean {
  const path = window.location.pathname
  return path === '/' || path === '/feed' || path === ''
}

async function sweep(): Promise<void> {
  if (!isYouTubeHost()) return
  const navChanged = window.location.href !== lastHref
  lastHref = window.location.href
  try {
    const { settings, rules } = await loadConfig(navChanged)
    const root = document.documentElement
    if (settings.hideShorts) applyShortsFiltering(root)
    if (settings.hideHomeFeed && isHomePath()) applyHomeFeed(root)
    if (settings.focusMode && window.location.pathname === '/watch') applyFocusMode(root)
    applyBlockRules(root, rules)
  } catch {
    /* never let curation break the page */
  }
}

function scheduleSweep(): void {
  if (scheduled) return
  scheduled = true
  window.setTimeout(() => {
    scheduled = false
    void sweep()
  }, 250)
}

export function initYouTubeFeedCurator(): void {
  if (started) return
  if (!isYouTubeHost()) return
  started = true

  try {
    observer = new MutationObserver(() => scheduleSweep())
    const target = document.documentElement ?? document
    observer.observe(target, { childList: true, subtree: true })
  } catch {
    /* observer unsupported: href poll still drives sweeps */
  }

  // YouTube SPA navigation rarely fires popstate for us — poll href cheaply
  // (string compare only; DOM scans happen in the debounced sweep).
  lastHref = window.location.href
  hrefPoll = setInterval(() => {
    try {
      if (window.location.href !== lastHref) void sweep()
    } catch {
      /* ignore */
    }
  }, 500)
  try {
    window.addEventListener('popstate', () => scheduleSweep())
    window.addEventListener('hashchange', () => scheduleSweep())
  } catch {
    /* ignore */
  }

  void sweep()
}

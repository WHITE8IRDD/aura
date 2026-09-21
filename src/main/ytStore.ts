import type Database from 'better-sqlite3'
import { XMLParser } from 'fast-xml-parser'
import { YT_TABLES_DDL } from './db/schema'
import type {
  YtChannel,
  YtFeedItem,
  YtRule,
  YtRuleType,
  YtSettings,
  YtWatchLaterItem,
} from '../shared/youtube'
import { DEFAULT_YT_SETTINGS } from '../shared/youtube'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
})

const CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{22}$/
const HANDLE_RE = /^@?[a-zA-Z0-9._-]{1,100}$/
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/

const RULE_TYPES: ReadonlySet<YtRuleType> = new Set([
  'block_keyword',
  'block_channel',
  'priority_topic',
])

const SETTINGS_KEY = 'yt.settings'
const FEED_STALE_MS = 10 * 60 * 1000
const PRIORITY_BOOST_MS = 12 * 60 * 60 * 1000 // one match ≈ 12h newer

export function isValidChannelId(value: unknown): boolean {
  return CHANNEL_ID_RE.test(cleanText(value, 100))
}

export function isValidVideoId(value: unknown): boolean {
  return VIDEO_ID_RE.test(cleanText(value, 50))
}

export function isValidHandle(value: unknown): boolean {
  return HANDLE_RE.test(cleanText(value, 100).replace(/^@/, ''))
}

function cleanText(value: unknown, maxLength = 300): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function normalize(value: string): string {
  return cleanText(value, 300).toLocaleLowerCase()
}

/** Idempotent safety net: heals DBs that skipped the yt migration. */
export function ensureYouTubeTables(db: Database.Database): void {
  db.exec(YT_TABLES_DDL)
}

/* ── settings (own yt_settings table — no dependency on the kv layer) ── */

export function dbGetSettings(db: Database.Database): YtSettings {
  try {
    const row = db.prepare('SELECT value FROM yt_settings WHERE key = ?').get(SETTINGS_KEY) as {
      value: string
    } | undefined
    if (!row) return { ...DEFAULT_YT_SETTINGS }
    const stored = JSON.parse(row.value) as Partial<YtSettings>
    return { ...DEFAULT_YT_SETTINGS, ...stored }
  } catch {
    return { ...DEFAULT_YT_SETTINGS }
  }
}

export function dbSaveSettings(db: Database.Database, patch: Partial<YtSettings>): YtSettings {
  const next = { ...dbGetSettings(db) }
  for (const key of Object.keys(DEFAULT_YT_SETTINGS) as Array<keyof YtSettings>) {
    if (typeof patch[key] === 'boolean') next[key] = patch[key] as boolean
  }
  db.prepare('INSERT INTO yt_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    SETTINGS_KEY,
    JSON.stringify(next),
  )
  return next
}

/* ── subscriptions ── */

export function dbListSubscriptions(db: Database.Database): YtChannel[] {
  return db
    .prepare(
      `SELECT channel_id, title, handle, avatar_url, created_at
       FROM yt_subscriptions ORDER BY created_at DESC`,
    )
    .all() as YtChannel[]
}

export function dbSubscribe(
  db: Database.Database,
  channelId: string,
  title: string,
  handle: string | null,
  avatarUrl: string | null,
): void {
  db.prepare(
    `INSERT INTO yt_subscriptions (channel_id, title, handle, avatar_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(channel_id) DO UPDATE SET
       title = excluded.title, handle = excluded.handle, avatar_url = excluded.avatar_url`,
  ).run(channelId, title, handle, avatarUrl)
}

export function dbUnsubscribe(db: Database.Database, channelId: string): void {
  db.prepare('DELETE FROM yt_subscriptions WHERE channel_id = ?').run(channelId)
}

export function dbHasSubscription(db: Database.Database, channelId: string): boolean {
  const row = db.prepare('SELECT 1 AS ok FROM yt_subscriptions WHERE channel_id = ?').get(channelId)
  return row !== undefined
}

/** Find by handle, tolerating a stored '@' prefix either way. Case-insensitive. */
export function dbFindByHandle(
  db: Database.Database,
  handle: string,
): { channel_id: string } | undefined {
  const bare = handle.replace(/^@/, '')
  const row = db
    .prepare(
      `SELECT channel_id FROM yt_subscriptions
       WHERE handle = ? COLLATE NOCASE OR handle = ? COLLATE NOCASE LIMIT 1`,
    )
    .get(bare, `@${bare}`) as { channel_id: string } | undefined
  return row
}

/* ── watch later + watched ── */

export function dbGetWatchLater(db: Database.Database): YtWatchLaterItem[] {
  return db
    .prepare(
      `SELECT video_id, title, channel_title, thumbnail_url, added_at
       FROM yt_watch_later ORDER BY added_at DESC`,
    )
    .all() as YtWatchLaterItem[]
}

export function dbAddWatchLater(
  db: Database.Database,
  videoId: string,
  title: string,
  channelTitle: string | null,
  thumbnailUrl: string | null,
): void {
  db.prepare(
    `INSERT INTO yt_watch_later (video_id, title, channel_title, thumbnail_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(video_id) DO UPDATE SET
       title = excluded.title, channel_title = excluded.channel_title,
       thumbnail_url = excluded.thumbnail_url`,
  ).run(videoId, title, channelTitle, thumbnailUrl)
}

export function dbRemoveWatchLater(db: Database.Database, videoId: string): void {
  db.prepare('DELETE FROM yt_watch_later WHERE video_id = ?').run(videoId)
}

export function dbSetWatched(db: Database.Database, videoId: string, watched: boolean): void {
  if (watched) {
    db.prepare('INSERT OR IGNORE INTO yt_watched (video_id) VALUES (?)').run(videoId)
  } else {
    db.prepare('DELETE FROM yt_watched WHERE video_id = ?').run(videoId)
  }
}

export function dbGetWatchedIds(db: Database.Database): Set<string> {
  const rows = db.prepare('SELECT video_id FROM yt_watched').all() as Array<{ video_id: string }>
  return new Set(rows.map((r) => r.video_id))
}

/* ── rules ── */

export function dbGetRules(db: Database.Database): YtRule[] {
  return db.prepare('SELECT id, rule_type, value FROM yt_feed_rules ORDER BY id ASC').all() as YtRule[]
}

export function dbAddRule(db: Database.Database, ruleType: YtRuleType, value: string): void {
  db.prepare('INSERT OR IGNORE INTO yt_feed_rules (rule_type, value) VALUES (?, ?)').run(
    ruleType,
    value,
  )
}

export function dbRemoveRule(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM yt_feed_rules WHERE id = ?').run(id)
}

/* ── channel resolution + metadata (network) ── */

interface ResolvedChannel {
  channelId: string
  handle: string | null
}

export type ChannelReference =
  | { kind: 'id'; channelId: string }
  | { kind: 'handle'; handle: string }
  | { kind: 'url'; url: string }
  | null

/**
 * Pure input classifier (no network): UC id anywhere, @handle in a
 * URL / bare / trailing-@ form, or a full channel URL. Unit-testable.
 */
export function parseChannelReference(raw: string): ChannelReference {
  const input = cleanText(raw, 500)
  if (!input) return null

  const uc = input.match(/(UC[a-zA-Z0-9_-]{22})/)
  if (uc?.[1]) return { kind: 'id', channelId: uc[1] }

  const atUrl = input.match(/youtube\.com\/@([^/?#\s]+)/i)
  if (atUrl?.[1]) {
    try {
      return { kind: 'handle', handle: decodeURIComponent(atUrl[1]).replace(/^@/, '') }
    } catch {
      return { kind: 'handle', handle: atUrl[1].replace(/^@/, '') }
    }
  }
  const atBare = input.match(/^@([^/?#\s]+)$/)
  if (atBare?.[1]) return { kind: 'handle', handle: atBare[1] }
  if (!input.includes('/') && !input.includes(' ') && !input.includes(':')) {
    const name = input.replace(/^@/, '')
    if (HANDLE_RE.test(name)) return { kind: 'handle', handle: name }
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input)
      if (url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) {
        return { kind: 'url', url: url.toString() }
      }
    } catch {
      return null
    }
  }
  return null
}

function extractChannelId(html: string): string | null {
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/i,
    /<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[a-zA-Z0-9_-]{22})["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["'][^"']*\/channel\/(UC[a-zA-Z0-9_-]{22})["']/i,
    /"channelId":"(UC[a-zA-Z0-9_-]{22})"/i,
    /"externalId":"(UC[a-zA-Z0-9_-]{22})"/i,
    /"browseId":"(UC[a-zA-Z0-9_-]{22})"/i,
    /channel\/(UC[a-zA-Z0-9_-]{22})/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1] && CHANNEL_ID_RE.test(match[1])) return match[1]
  }
  return null
}

function looksLikeBotCheck(html: string): boolean {
  return (
    /consent\.youtube\.com/i.test(html) ||
    /confirm you('|’)re not a bot/i.test(html) ||
    /sign in to confirm/i.test(html)
  )
}

function extractTitle(html: string, fallback: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)+)"/i,
    /"title":"((?:[^"\\]|\\.)+)"/i,
    /<title>([^<]+)<\/title>/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    const title = match?.[1]?.replace(/\\u0026/g, '&').replace(/\s*-\s*YouTube\s*$/, '').trim()
    if (title) return cleanText(title, 200)
  }
  return fallback
}

function extractAvatar(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]?.startsWith('https://')) return match[1].slice(0, 1000)
  }
  return null
}

async function fetchHtml(url: string, label: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error(`[yt] YouTube timed out while looking up ${label}`)
    }
    throw new Error(`[yt] Could not reach YouTube while looking up ${label}`)
  }
  if (response.status === 404) throw new Error(`[yt] Channel ${label} was not found`)
  if (response.status === 429 || response.status === 403) {
    throw new Error('[yt] YouTube blocked the lookup — try again in a minute')
  }
  if (!response.ok) throw new Error(`[yt] Lookup failed (HTTP ${response.status})`)
  return response.text()
}

/**
 * Resolve any accepted input to a UC channel id. Tries the handle page
 * and its /about variant (YouTube serves bot-check/consent shells too
 * often to trust a single fetch), with specific errors per failure mode.
 */
export async function resolveChannelInput(raw: string): Promise<ResolvedChannel> {
  const ref = parseChannelReference(raw)
  if (!ref) throw new Error('[yt] Enter a channel URL, @handle or channel ID')
  if (ref.kind === 'id') return { channelId: ref.channelId, handle: null }

  if (ref.kind === 'url') {
    const html = await fetchHtml(ref.url, 'that channel URL')
    const id = extractChannelId(html)
    if (!id) {
      if (looksLikeBotCheck(html)) {
        throw new Error('[yt] YouTube blocked the lookup — try again in a minute')
      }
      throw new Error('[yt] Could not find a channel at that URL')
    }
    return { channelId: id, handle: null }
  }

  const label = `@${ref.handle}`
  const candidates = [
    `https://www.youtube.com/@${encodeURIComponent(ref.handle)}`,
    `https://www.youtube.com/@${encodeURIComponent(ref.handle)}/about`,
  ]
  let lastError: Error | null = null
  for (const url of candidates) {
    try {
      const html = await fetchHtml(url, label)
      const id = extractChannelId(html)
      if (id) return { channelId: id, handle: label }
      if (looksLikeBotCheck(html)) {
        lastError = new Error('[yt] YouTube blocked the lookup — try again in a minute')
        continue
      }
      lastError = new Error(`[yt] Could not find a channel for ${label}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(`[yt] Lookup failed for ${label}`)
      if (/timed out|blocked|Could not reach/.test(lastError.message)) break
    }
  }
  throw lastError ?? new Error(`[yt] Could not find a channel for ${label}`)
}

export async function fetchChannelMeta(
  channelId: string,
): Promise<{ title: string; avatarUrl: string | null }> {
  const html = await fetchHtml(
    `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`,
    'that channel',
  )
  return { title: extractTitle(html, 'YouTube channel'), avatarUrl: extractAvatar(html) }
}

/* ── Takeout CSV import ── */

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else quoted = false
      } else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else cur += ch
  }
  cells.push(cur)
  return cells
}

/** Parse a Google Takeout subscriptions.csv into {channelId,title} rows. Pure. */
export function parseSubscriptionCsv(text: string): Array<{ channelId: string; title: string }> {
  const rows: Array<{ channelId: string; title: string }> = []
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells = splitCsvLine(line)
    const first = (cells[0] ?? '').trim()
    if (/channel\s*id/i.test(first)) continue // header
    if (!CHANNEL_ID_RE.test(first)) continue
    const title = cleanText(cells[2] ?? cells[1] ?? first, 200) || first
    rows.push({ channelId: first, title })
  }
  return rows
}

/* ── feed fetch / parse / rank ── */

interface RawFeedItem {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: number
  thumbnailUrl: string
  views: number
}

/** Parse one channel Atom feed. Pure — never marks Shorts (RSS has no flag). */
export function parseChannelFeedXml(
  xml: string,
  channel: { channel_id: string; title: string },
): RawFeedItem[] {
  let parsed: { feed?: { entry?: unknown | unknown[] } }
  try {
    parsed = parser.parse(xml) as { feed?: { entry?: unknown | unknown[] } }
  } catch {
    return []
  }
  const rawEntries = parsed.feed?.entry
  const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : []

  return entries.slice(0, 10).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const data = entry as Record<string, unknown>
    const videoId = cleanText(data['yt:videoId'], 50)
    const title = cleanText(data.title, 500)
    const publishedAt = Date.parse(cleanText(data.published, 80)) || 0
    if (!VIDEO_ID_RE.test(videoId) || !title) return []

    let views = 0
    try {
      const group = data['media:group'] as Record<string, unknown> | undefined
      const community = group?.['media:community'] as Record<string, unknown> | undefined
      const stats = community?.['media:statistics'] as Record<string, unknown> | undefined
      const rawViews = stats?.['@_views']
      const n = typeof rawViews === 'string' ? Number(rawViews) : Number(rawViews ?? NaN)
      if (Number.isFinite(n) && n >= 0) views = Math.floor(n)
    } catch {
      /* views stay 0 */
    }

    return [
      {
        videoId,
        title,
        channelId: channel.channel_id,
        channelTitle: channel.title,
        publishedAt,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        views,
      },
    ]
  })
}

function priorityMatches(title: string, rules: YtRule[]): number {
  const t = normalize(title)
  return rules
    .filter((r) => r.rule_type === 'priority_topic')
    .reduce((n, r) => {
      const kw = normalize(r.value)
      return kw && t.includes(kw) ? n + 1 : n
    }, 0)
}

function isBlocked(
  item: RawFeedItem,
  rules: YtRule[],
): boolean {
  const title = normalize(item.title)
  if (
    rules
      .filter((r) => r.rule_type === 'block_keyword')
      .some((r) => {
        const kw = normalize(r.value)
        return kw.length > 0 && title.includes(kw)
      })
  )
    return true
  const chanTitle = normalize(item.channelTitle)
  return rules
    .filter((r) => r.rule_type === 'block_channel')
    .some((r) => {
      const v = cleanText(r.value, 200)
      return v === item.channelId || normalize(v) === chanTitle
    })
}

/** Dedupe, filter, enrich and rank. Pure — unit-testable. */
export function rankFeedItems(
  items: RawFeedItem[],
  rules: YtRule[],
  settings: YtSettings,
  watchedIds: Set<string>,
  laterIds: Set<string>,
): YtFeedItem[] {
  const unique = new Map<string, RawFeedItem>()
  for (const item of items) {
    if (!isValidVideoId(item.videoId) || !cleanText(item.title, 500)) continue
    if (isBlocked(item, rules)) continue
    unique.set(item.videoId, item)
  }
  return [...unique.values()]
    .map((item) => {
      const matches = priorityMatches(item.title, rules)
      const watched = watchedIds.has(item.videoId)
      return {
        ...item,
        boosted: matches > 0,
        watched,
        inWatchLater: laterIds.has(item.videoId),
        __score: item.publishedAt + matches * PRIORITY_BOOST_MS,
      }
    })
    .filter((item) => !(settings.hideWatched && item.watched))
    .sort((a, b) => b.__score - a.__score)
    .map(({ __score: _score, ...item }) => item)
}

async function fetchChannelFeed(channel: YtChannel): Promise<RawFeedItem[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
    channel.channel_id,
  )}`
  const response = await fetch(rssUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 AuraBrowser/1.0',
      accept: 'application/atom+xml,application/xml,text/xml',
    },
  })
  if (!response.ok) throw new Error(`[yt] Feed request failed (HTTP ${response.status})`)
  return parseChannelFeedXml(await response.text(), {
    channel_id: channel.channel_id,
    title: channel.title,
  })
}

/* ── in-memory feed cache ── */

let cache: { items: RawFeedItem[]; at: number } | null = null

export function clearFeedCache(): void {
  cache = null
}

/** Read the current raw cache without fetching. Exported for the IPC shell. */
export function getCachedItems(): RawFeedItem[] {
  return cache?.items ?? []
}

export async function refreshFeedCache(db: Database.Database): Promise<RawFeedItem[]> {
  const channels = dbListSubscriptions(db)
  const results = await Promise.allSettled(channels.map((ch) => fetchChannelFeed(ch)))
  const items: RawFeedItem[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') items.push(...result.value)
  }
  cache = { items, at: Date.now() }
  return items
}

/** Return cached items, refetching when forced or stale. Exported for the IPC shell. */
export async function getRefreshedItems(db: Database.Database, force: unknown): Promise<RawFeedItem[]> {
  const stale = !cache || Date.now() - cache.at > FEED_STALE_MS
  if (force === true || stale) return refreshFeedCache(db)
  return (cache as { items: RawFeedItem[] }).items
}

export function enrichFeed(db: Database.Database, items: RawFeedItem[]): YtFeedItem[] {
  return rankFeedItems(items, dbGetRules(db), dbGetSettings(db), dbGetWatchedIds(db), new Set(
    dbGetWatchLater(db).map((w) => w.video_id),
  ))
}

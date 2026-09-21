import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import type Database from 'better-sqlite3'
import {
  dbAddRule,
  dbAddWatchLater,
  dbFindByHandle,
  dbGetRules,
  dbGetSettings,
  dbGetWatchLater,
  dbGetWatchedIds,
  dbHasSubscription,
  dbRemoveRule,
  dbRemoveWatchLater,
  dbSaveSettings,
  dbSetWatched,
  dbSubscribe,
  dbUnsubscribe,
  ensureYouTubeTables,
  isValidChannelId,
  isValidHandle,
  isValidVideoId,
  parseChannelFeedXml,
  parseSubscriptionCsv,
  rankFeedItems,
  resolveChannelInput,
} from '../src/main/ytStore'
import type { YtRule } from '../src/shared/youtube'
import { DEFAULT_YT_SETTINGS } from '../src/shared/youtube'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// node:sqlite speaks the same prepare/run/get/all dialect as the subset of
// better-sqlite3 used by youtubeFeed.ts — cast once, here only.
function memDb(): Database.Database {
  const raw = new DatabaseSync(':memory:')
  raw.exec(
    `CREATE TABLE yt_subscriptions (channel_id TEXT PRIMARY KEY, title TEXT NOT NULL, handle TEXT, avatar_url TEXT, created_at INTEGER NOT NULL DEFAULT 1);
     CREATE TABLE yt_watch_later (video_id TEXT PRIMARY KEY, title TEXT NOT NULL, channel_title TEXT, thumbnail_url TEXT, duration TEXT, added_at INTEGER NOT NULL DEFAULT 1);
     CREATE TABLE yt_watched (video_id TEXT PRIMARY KEY, watched_at INTEGER NOT NULL DEFAULT 1);
     CREATE TABLE yt_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
     CREATE TABLE yt_feed_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, rule_type TEXT NOT NULL, value TEXT NOT NULL);
     CREATE UNIQUE INDEX idx_yt_feed_rules_unique ON yt_feed_rules(rule_type, lower(value));`,
  )
  return raw as unknown as Database.Database
}

const GOOD_UC = 'UCBa659QWEk1IU5vplA9t9yg'

// Validators.
assert.ok(isValidChannelId(GOOD_UC))
assert.ok(!isValidChannelId('UCshort'))
assert.ok(!isValidChannelId(''))
assert.ok(isValidVideoId('dQw4w9WgXcQ'))
assert.ok(!isValidVideoId('too-short'))
assert.ok(isValidHandle('@mkbhd'))
assert.ok(!isValidHandle('!!!'))

// Malformed subscribe input rejects before any network happens.
await assert.rejects(() => resolveChannelInput(''))
await assert.rejects(() => resolveChannelInput('!!! not a channel !!!'))
assert.deepEqual(await resolveChannelInput(GOOD_UC), { channelId: GOOD_UC, handle: null })

// Takeout CSV parsing (quoted commas, header, junk lines).
const csv = [
  'Channel Id,Channel Url,Channel Title',
  `${GOOD_UC},https://www.youtube.com/channel/${GOOD_UC},Some Channel`,
  'UCxxxxxxxxxxxxxxxxxxxxxx,https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx,"Quoted, Title"',
  'not-a-row',
  '',
].join('\n')
const parsedCsv = parseSubscriptionCsv(csv)
assert.equal(parsedCsv.length, 2)
assert.equal(parsedCsv[0].title, 'Some Channel')
assert.equal(parsedCsv[1].title, 'Quoted, Title')

// Atom parsing: valid entries, malformed ignored, views read, no Shorts flag.
const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    <title>Never Gonna Give You Up</title>
    <published>2024-01-02T10:00:00+00:00</published>
    <media:group><media:community><media:statistics views="12345"/></media:community></media:group>
  </entry>
  <entry>
    <yt:videoId>9bZkp7q19f0</yt:videoId>
    <title>Gangnam Style</title>
    <published>2024-02-03T10:00:00+00:00</published>
  </entry>
  <entry><title>No video id here</title></entry>
</feed>`
const parsed = parseChannelFeedXml(SAMPLE_XML, { channel_id: GOOD_UC, title: 'Ch' })
assert.equal(parsed.length, 2)
assert.equal(parsed[0].views, 12345)
assert.equal(parsed[1].views, 0)
assert.equal(typeof parsed[0].publishedAt, 'number')
assert.ok(parsed[0].publishedAt > 0)
assert.deepEqual(parseChannelFeedXml('garbage <', { channel_id: GOOD_UC, title: 'Ch' }), [])

// Ranking: blocks, dedup, priority boost ≈12h, watched filter, flags.
const raw = [
  { videoId: 'dQw4w9WgXcQ', title: 'My clickbait title', channelId: GOOD_UC, channelTitle: 'Ch', publishedAt: Date.parse('2024-03-01T00:00:00Z'), thumbnailUrl: 't', views: 0 },
  { videoId: 'dQw4w9WgXcQ', title: 'My clickbait title', channelId: GOOD_UC, channelTitle: 'Ch', publishedAt: Date.parse('2024-03-01T00:00:00Z'), thumbnailUrl: 't', views: 0 },
  { videoId: '9bZkp7q19f0', title: 'Old video', channelId: GOOD_UC, channelTitle: 'Ch', publishedAt: Date.parse('2023-01-01T00:00:00Z'), thumbnailUrl: 't', views: 0 },
  { videoId: 'J---aiyznGQ', title: 'Keyboard review', channelId: 'UCxxxxxxxxxxxxxxxxxxxxxx', channelTitle: 'Keys', publishedAt: Date.parse('2024-01-15T00:00:00Z'), thumbnailUrl: 't', views: 0 },
]
const rules: YtRule[] = [
  { id: 1, rule_type: 'block_keyword', value: 'CLICKBAIT' },
  { id: 2, rule_type: 'priority_topic', value: 'keyboard' },
]
const ranked = rankFeedItems(raw, rules, { ...DEFAULT_YT_SETTINGS }, new Set(), new Set(['9bZkp7q19f0']))
assert.equal(ranked.length, 2)
assert.equal(ranked[0].videoId, 'J---aiyznGQ')
assert.equal(ranked[0].boosted, true)
assert.equal(ranked[1].inWatchLater, true)
// Priority ≈12h: a 13h-newer unboosted video still loses to one match.
const boostCheck = rankFeedItems(
  [
    { videoId: 'dQw4w9WgXcQ', title: 'plain', channelId: GOOD_UC, channelTitle: 'C', publishedAt: 1_000_000_000, thumbnailUrl: 't', views: 0 },
    { videoId: '9bZkp7q19f0', title: 'keyboard basin', channelId: GOOD_UC, channelTitle: 'C', publishedAt: 1_000_000_000 - 6 * 3600 * 1000, thumbnailUrl: 't', views: 0 },
  ],
  [{ id: 1, rule_type: 'priority_topic', value: 'keyboard' }],
  { ...DEFAULT_YT_SETTINGS },
  new Set(),
  new Set(),
)
assert.equal(boostCheck[0].videoId, '9bZkp7q19f0')
// hideWatched filters.
const hidden = rankFeedItems(raw, [], { ...DEFAULT_YT_SETTINGS, hideWatched: true }, new Set(['9bZkp7q19f0']), new Set())
assert.ok(!hidden.some((i) => i.videoId === '9bZkp7q19f0'))

// SQLite CRUD: subs upsert/unsubscribe, later upsert/remove, watched, rules dedup.
{
  const db = memDb()
  dbSubscribe(db, GOOD_UC, 'Ch', '@ch', null)
  dbSubscribe(db, GOOD_UC, 'Ch Renamed', '@ch', null)
  let subs = db.prepare('SELECT * FROM yt_subscriptions').all() as Array<{ title: string }>
  assert.equal(subs.length, 1)
  assert.equal(subs[0].title, 'Ch Renamed')
  assert.ok(dbHasSubscription(db, GOOD_UC))
  assert.ok(!dbHasSubscription(db, 'UCxxxxxxxxxxxxxxxxxxxxxx'))
  assert.equal(dbFindByHandle(db, 'ch')?.channel_id, GOOD_UC)
  assert.equal(dbFindByHandle(db, '@CH')?.channel_id, GOOD_UC)
  assert.equal(dbFindByHandle(db, 'nobody'), undefined)
  dbUnsubscribe(db, GOOD_UC)
  assert.equal((db.prepare('SELECT * FROM yt_subscriptions').all() as unknown[]).length, 0)

  dbAddWatchLater(db, 'dQw4w9WgXcQ', 'Never', 'Ch', 'thumb')
  dbAddWatchLater(db, 'dQw4w9WgXcQ', 'Never (updated)', 'Ch', 'thumb2')
  let later = dbGetWatchLater(db)
  assert.equal(later.length, 1)
  assert.equal(later[0].title, 'Never (updated)')
  dbRemoveWatchLater(db, 'dQw4w9WgXcQ')
  assert.equal(dbGetWatchLater(db).length, 0)

  dbSetWatched(db, 'dQw4w9WgXcQ', true)
  assert.ok(dbGetWatchedIds(db).has('dQw4w9WgXcQ'))
  dbSetWatched(db, 'dQw4w9WgXcQ', false)
  assert.ok(!dbGetWatchedIds(db).has('dQw4w9WgXcQ'))

  dbAddRule(db, 'block_keyword', 'Clickbait')
  dbAddRule(db, 'block_keyword', 'clickbait')
  dbAddRule(db, 'priority_topic', 'rust')
  let rows = dbGetRules(db)
  assert.equal(rows.length, 2)
  dbRemoveRule(db, rows[0].id)
  rows = dbGetRules(db)
  assert.equal(rows.length, 1)

  assert.deepEqual(dbGetSettings(db).hideShorts, true)
  dbSaveSettings(db, { focusMode: true, hideWatched: true })
  const st = dbGetSettings(db)
  assert.equal(st.focusMode, true)
  assert.equal(st.hideWatched, true)
  assert.equal(st.hideShorts, true)

  ensureYouTubeTables(db)
  ensureYouTubeTables(db)
}

// Security static checks.
const curatorSrc = readFileSync(join(root, 'src/preload/youtube-feed-curator.ts'), 'utf8')
assert.ok(!curatorSrc.includes('exposeInMainWorld'))
assert.ok(!curatorSrc.includes('contextBridge'))
assert.ok(curatorSrc.includes("endsWith('.youtube.com')"))
assert.ok(!curatorSrc.includes("includes('youtube.com')"))

const tabSrc = readFileSync(join(root, 'src/preload/tab.ts'), 'utf8')
assert.ok(!tabSrc.includes("'yt:"))
assert.ok(tabSrc.includes('initYouTubeFeedCurator'))

const bridgeSrc = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.ok(bridgeSrc.includes('yt:getSubscriptions'))
assert.ok(!bridgeSrc.includes("exposeInMainWorld('electron'"))

console.log('verify-youtube-feed: ALL CHECKS PASSED')

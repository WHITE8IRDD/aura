import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { TabManager } from './tabs'
import {
  clearFeedCache,
  dbAddRule,
  dbAddWatchLater,
  dbFindByHandle,
  dbGetRules,
  dbGetSettings,
  dbGetWatchLater,
  dbHasSubscription,
  dbListSubscriptions,
  dbRemoveRule,
  dbRemoveWatchLater,
  dbSaveSettings,
  dbSetWatched,
  dbSubscribe,
  dbUnsubscribe,
  enrichFeed,
  ensureYouTubeTables,
  fetchChannelMeta,
  getCachedItems,
  getRefreshedItems,
  parseSubscriptionCsv,
  resolveChannelInput,
} from './ytStore'
import type { YtChannel, YtFeedItem, YtRule, YtRuleType, YtSettings } from '../shared/youtube'
import { DEFAULT_YT_SETTINGS } from '../shared/youtube'
import { YT_IPC, type YtSubResult } from '../shared/youtube-ipc'

const CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{22}$/
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/
const RULE_TYPES: ReadonlySet<YtRuleType> = new Set(['block_keyword', 'block_channel', 'priority_topic'])

function cleanText(value: unknown, maxLength = 300): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function broadcastChanged(): void {
  for (const m of TabManager.getAll()) {
    try {
      const w = m.getWindow()
      if (w && !w.isDestroyed()) {
        w.webContents.send('yt:changed')
        w.webContents.send(YT_IPC.subscriptionsChanged)
      }
    } catch {
      /* window gone */
    }
  }
}

const UC_RE = /^UC[\w-]{22}$/

interface ButtonRef {
  channelId?: unknown
  handle?: unknown
  title?: unknown
  avatarUrl?: unknown
}

/** Sender must be a YouTube page (button-only channel). Cannot be forged. */
function fromYouTube(e: Electron.IpcMainInvokeEvent): boolean {
  try {
    const url = e.senderFrame?.url ?? ''
    const host = new URL(url).hostname
    return host === 'www.youtube.com' || host === 'youtube.com'
  } catch {
    return false
  }
}

function parseButtonRef(raw: unknown): {
  channelId: string | null
  handle: string | null
  title: string
  avatarUrl: string | null
} | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const channelId =
    typeof r.channelId === 'string' && UC_RE.test(r.channelId) ? r.channelId : null
  const handle =
    typeof r.handle === 'string' && r.handle.length > 0 && r.handle.length <= 100 ? r.handle : null
  if (!channelId && !handle) return null
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, 200) : ''
  const avatarUrl =
    typeof r.avatarUrl === 'string' && r.avatarUrl.startsWith('https://')
      ? r.avatarUrl.slice(0, 500)
      : null
  return { channelId, handle, title: title || handle || 'YouTube channel', avatarUrl }
}

/** Stored channel id for a button ref, or null when not subscribed. */
function storedChannelId(
  db: Database.Database,
  ref: { channelId: string | null; handle: string | null },
): string | null {
  if (ref.channelId && dbHasSubscription(db, ref.channelId)) return ref.channelId
  if (ref.handle) return dbFindByHandle(db, ref.handle)?.channel_id ?? null
  return null
}

/**
 * Register all yt:* IPC handlers. Call exactly once during app startup,
 * after the database is initialized. All input is validated + normalized.
 * Storage/parsing logic lives in ./ytStore (importable without Electron,
 * so it stays unit-testable); this module is the thin IPC shell.
 */
export function setupYouTubeFeedIPC(db: Database.Database): void {
  ensureYouTubeTables(db)

  ipcMain.handle('yt:getSubscriptions', (): YtChannel[] => dbListSubscriptions(db))

  ipcMain.handle(YT_IPC.isSubscribed, (e, raw): YtSubResult => {
    if (!fromYouTube(e)) return { ok: false, error: 'bad-sender' }
    const ref = parseButtonRef(raw)
    if (!ref) return { ok: false, error: 'bad-input' }
    try {
      const id = storedChannelId(db, ref)
      return { ok: true, subscribed: id !== null, channelId: id }
    } catch (err) {
      console.error('[Aura YT] is-subscribed db error', err)
      return { ok: false, error: 'db-error' }
    }
  })

  ipcMain.handle(
    'yt:subscribe',
    async (_event, input: { input?: unknown } & ButtonRef): Promise<YtChannel[]> => {
      // Full button ref (Shadow-DOM pill): already validated above, persist
      // directly with no resolution round-trip.
      const direct = parseButtonRef(input)
      if (direct?.channelId) {
        dbSubscribe(db, direct.channelId, direct.title, direct.handle, direct.avatarUrl)
        console.log(`[Aura YT] subscribed ${direct.channelId} ${direct.handle ?? ''} ${direct.title}`)
        broadcastChanged()
        return dbListSubscriptions(db)
      }
      // Legacy dashboard form: single free-text input, resolved in main.
      const resolved = await resolveChannelInput(String(input?.input ?? ''))
      const meta = await fetchChannelMeta(resolved.channelId)
      dbSubscribe(db, resolved.channelId, meta.title, resolved.handle, meta.avatarUrl)
      console.log(`[Aura YT] subscribed ${resolved.channelId} ${resolved.handle ?? ''} ${meta.title}`)
      broadcastChanged()
      return dbListSubscriptions(db)
    },
  )

  ipcMain.handle('yt:unsubscribe', (_event, channelId: string): YtChannel[] => {
    if (!CHANNEL_ID_RE.test(cleanText(channelId, 100))) throw new Error('[yt] Invalid channel ID')
    dbUnsubscribe(db, cleanText(channelId, 100))
    broadcastChanged()
    return dbListSubscriptions(db)
  })

  ipcMain.handle(
    'yt:importSubscriptions',
    (_event, text: string): { added: number; skipped: number } => {
      const rows = parseSubscriptionCsv(String(text ?? '').slice(0, 1_000_000))
      let added = 0
      let skipped = 0
      const seen = new Set<string>()
      for (const row of rows) {
        if (seen.has(row.channelId)) {
          skipped++
          continue
        }
        seen.add(row.channelId)
        const exists = db.prepare('SELECT 1 FROM yt_subscriptions WHERE channel_id = ?').get(row.channelId)
        if (exists) {
          skipped++
          continue
        }
        dbSubscribe(db, row.channelId, row.title, null, null)
        added++
      }
      if (added > 0) {
        clearFeedCache()
        broadcastChanged()
      }
      return { added, skipped }
    },
  )

  ipcMain.handle('yt:getFeed', (): YtFeedItem[] => enrichFeed(db, getCachedItems()))

  ipcMain.handle('yt:refreshFeed', async (_event, force: unknown): Promise<YtFeedItem[]> => {
    const items = await getRefreshedItems(db, force)
    broadcastChanged()
    return enrichFeed(db, items)
  })

  ipcMain.handle('yt:getWatchLater', () => dbGetWatchLater(db))

  ipcMain.handle(
    'yt:addWatchLater',
    (
      _event,
      input: { videoId?: unknown; title?: unknown; channelTitle?: unknown; thumbnailUrl?: unknown },
    ): boolean => {
      const videoId = cleanText(input?.videoId, 50)
      if (!VIDEO_ID_RE.test(videoId)) throw new Error('[yt] Invalid video ID')
      const title = cleanText(input?.title, 500)
      if (!title) throw new Error('[yt] Video title is required')
      dbAddWatchLater(
        db,
        videoId,
        title,
        cleanText(input?.channelTitle, 200) || null,
        cleanText(input?.thumbnailUrl, 1000) || null,
      )
      broadcastChanged()
      return true
    },
  )

  ipcMain.handle('yt:removeWatchLater', (_event, videoId: string): boolean => {
    const id = cleanText(videoId, 50)
    if (!VIDEO_ID_RE.test(id)) throw new Error('[yt] Invalid video ID')
    dbRemoveWatchLater(db, id)
    broadcastChanged()
    return true
  })

  ipcMain.handle('yt:markWatched', (_event, videoId: string, watched: unknown): boolean => {
    const id = cleanText(videoId, 50)
    if (!VIDEO_ID_RE.test(id)) throw new Error('[yt] Invalid video ID')
    dbSetWatched(db, id, watched === true)
    broadcastChanged()
    return true
  })

  ipcMain.handle('yt:getRules', (): YtRule[] => dbGetRules(db))

  ipcMain.handle(
    'yt:addRule',
    (_event, input: { ruleType?: unknown; value?: unknown }): YtRule[] => {
      const ruleType = input?.ruleType as YtRuleType
      if (!RULE_TYPES.has(ruleType)) throw new Error('[yt] Unsupported rule type')
      const value = cleanText(input?.value, 200)
      if (!value) throw new Error('[yt] Rule value is required')
      dbAddRule(db, ruleType, value)
      clearFeedCache()
      broadcastChanged()
      return dbGetRules(db)
    },
  )

  ipcMain.handle('yt:removeRule', (_event, id: number): YtRule[] => {
    if (!Number.isInteger(id) || (id as number) <= 0) throw new Error('[yt] Invalid rule ID')
    dbRemoveRule(db, id)
    clearFeedCache()
    broadcastChanged()
    return dbGetRules(db)
  })

  ipcMain.handle('yt:getSettings', (): YtSettings => dbGetSettings(db))

  ipcMain.handle(
    'yt:setSetting',
    (_event, key: string, value: unknown): YtSettings => {
      if (!(key in DEFAULT_YT_SETTINGS)) throw new Error('[yt] Unknown setting')
      if (typeof value !== 'boolean') throw new Error('[yt] Setting value must be boolean')
      const next = dbSaveSettings(db, { [key]: value } as Partial<YtSettings>)
      broadcastChanged()
      return next
    },
  )
}

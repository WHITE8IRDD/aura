import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_YT_SETTINGS,
  type YtChannel,
  type YtFeedItem,
  type YtRule,
  type YtRuleType,
  type YtSettings,
  type YtWatchLaterItem,
} from '../../../../shared/youtube'
import { errorText } from './utils'

export interface YouTubeState {
  feed: YtFeedItem[]
  subs: YtChannel[]
  later: YtWatchLaterItem[]
  rules: YtRule[]
  settings: YtSettings
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh(force?: boolean): Promise<void>
  subscribe(input: string): Promise<void>
  unsubscribe(channelId: string): Promise<void>
  importText(text: string): Promise<{ added: number; skipped: number }>
  toggleLater(item: { videoId: string; title: string; channelTitle: string; inWatchLater?: boolean }): Promise<void>
  removeLater(videoId: string): Promise<void>
  markWatched(videoId: string, watched: boolean): Promise<void>
  addRule(type: YtRuleType, value: string): Promise<void>
  removeRule(id: number): Promise<void>
  setSetting<K extends keyof YtSettings>(key: K, value: YtSettings[K]): Promise<void>
}

const api = () => window.aura.youtube

export function useYouTube(): YouTubeState {
  const [feed, setFeed] = useState<YtFeedItem[]>([])
  const [subs, setSubs] = useState<YtChannel[]>([])
  const [later, setLater] = useState<YtWatchLaterItem[]>([])
  const [rules, setRules] = useState<YtRule[]>([])
  const [settings, setSettings] = useState<YtSettings>(DEFAULT_YT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)

  const load = useCallback(async () => {
    try {
      const [f, s, l, r, st] = await Promise.all([
        api().getFeed(),
        api().getSubscriptions(),
        api().getWatchLater(),
        api().getRules(),
        api().getSettings(),
      ])
      if (!alive.current) return
      setFeed(f || [])
      setSubs(s || [])
      setLater(l || [])
      setRules(r || [])
      setSettings(st || DEFAULT_YT_SETTINGS)
      setError(null)
    } catch (e) {
      if (alive.current) setError(errorText(e))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  const refresh = useCallback(
    async (force = true) => {
      setRefreshing(true)
      try {
        await api().refreshFeed(force)
        await load()
      } catch (e) {
        setError(errorText(e))
      } finally {
        setRefreshing(false)
      }
    },
    [load],
  )

  useEffect(() => {
    alive.current = true
    let timer = 0
    const off = api().onChanged(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void load(), 80)
    })

    void load()
      .then(() => api().refreshFeed(false))
      .then(() => load())
      .catch(() => undefined)

    return () => {
      alive.current = false
      window.clearTimeout(timer)
      if (typeof off === 'function') off()
    }
  }, [load])

  return {
    feed,
    subs,
    later,
    rules,
    settings,
    loading,
    refreshing,
    error,
    refresh,
    subscribe: async (input) => {
      const list = await api().subscribe({ input })
      setSubs(list || [])
      await load()
    },
    unsubscribe: async (id) => {
      const list = await api().unsubscribe(id)
      setSubs(list || [])
      await load()
    },
    importText: (text) => api().importSubscriptions(text),
    toggleLater: async (i) => {
      if (i.inWatchLater) await api().removeWatchLater(i.videoId)
      else await api().addWatchLater({ videoId: i.videoId, title: i.title, channelTitle: i.channelTitle })
      await load()
    },
    removeLater: async (id) => {
      await api().removeWatchLater(id)
      await load()
    },
    markWatched: async (id, w) => {
      await api().markWatched(id, w)
    },
    addRule: async (ruleType, value) => {
      const list = await api().addRule({ ruleType, value })
      setRules(list || [])
      await load()
    },
    removeRule: async (id) => {
      const list = await api().removeRule(id)
      setRules(list || [])
      await load()
    },
    setSetting: async (k, v) => {
      const next = await api().setSetting(k, v)
      setSettings(next || DEFAULT_YT_SETTINGS)
    },
  }
}

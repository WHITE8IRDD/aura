import React, { useEffect, useState } from 'react'
import WidgetCard from './WidgetCard'

interface Story {
  id: number
  title: string
  url?: string
  by: string
  score: number
}

interface Props {
  size: 1 | 2 | 3
  onNavigate: (url: string) => void
  dragHandlers?: {
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
}

export default function NewsWidget({
  size,
  onNavigate,
  dragHandlers
}: Props): React.ReactElement {
  const [stories, setStories] = useState<Story[]>(() => {
    try {
      const cached = localStorage.getItem('aura:news:cache')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(stories.length === 0)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const count = size === 1 ? 3 : size === 2 ? 6 : 10

    async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), ms)
      try {
        const res = await fetch(url, { signal: controller.signal })
        return res
      } finally {
        clearTimeout(timer)
      }
    }

    async function load(): Promise<void> {
      try {
        setError(false)
        const idsRes = await fetchWithTimeout(
          'https://hacker-news.firebaseio.com/v0/topstories.json'
        )
        if (!idsRes.ok) throw new Error(`HN top: HTTP ${idsRes.status}`)
        const ids: number[] = await idsRes.json()
        if (!Array.isArray(ids) || ids.length === 0) throw new Error('Empty ID list')

        const top = ids.slice(0, count)
        const items = await Promise.all(
          top.map(async (id) => {
            try {
              const r = await fetchWithTimeout(
                `https://hacker-news.firebaseio.com/v0/item/${id}.json`
              )
              if (!r.ok) return null
              return r.json()
            } catch {
              return null
            }
          })
        )

        if (cancelled) return

        const valid = items.filter((x): x is Story => x !== null && typeof x.title === 'string')
        if (valid.length === 0) throw new Error('No valid stories returned')

        setStories(valid)
        setLoading(false)
        try {
          localStorage.setItem('aura:news:cache', JSON.stringify(valid))
        } catch {
          /* ignore quota errors */
        }
      } catch (err) {
        if (cancelled) return
        console.warn('[Aura] News fetch failed:', err)
        setError(true)
        setLoading(false)
      }
    }

    void load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [size])

  return (
    <WidgetCard
      title="Top Stories"
      subtitle="Hacker News"
      loading={loading && stories.length === 0}
      size={size}
      draggable
      {...dragHandlers}
    >
      <ul className="news-list">
        {stories.length > 0 ? (
          stories.map((s) => (
            <li key={s.id} className="news-item">
              <button
                className="news-link"
                onClick={() =>
                  onNavigate(s.url ?? `https://news.ycombinator.com/item?id=${s.id}`)
                }
                title={s.title}
              >
                <span className="news-title">{s.title}</span>
                <span className="news-meta">
                  {s.score ?? 0} pts &middot; {s.by ?? 'unknown'}
                </span>
              </button>
            </li>
          ))
        ) : error ? (
          <li className="news-empty">
            Couldn&apos;t reach Hacker News. Check your connection.
          </li>
        ) : !loading ? (
          <li className="news-empty">No stories available</li>
        ) : null}
      </ul>
    </WidgetCard>
  )
}

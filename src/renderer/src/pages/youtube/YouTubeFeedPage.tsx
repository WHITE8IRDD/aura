import React, { useEffect, useMemo, useRef, useState } from 'react'
import './youtube.css'
import { Icon } from './icons'
import { openInNewTab } from './openTab'
import { EmptyState, FiltersPanel, SubscriptionsPanel, WatchLaterPanel } from './Panels'
import { useYouTube } from './useYouTube'
import { VideoCard, VideoCardSkeleton } from './VideoCard'

type Tab = 'feed' | 'subscriptions' | 'later' | 'filters'

interface Props {
  onClose: () => void
}

export const YouTubeFeedPage: React.FC<Props> = ({ onClose }) => {
  const yt = useYouTube()
  const [tab, setTab] = useState<Tab>('feed')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { refresh } = yt

  // "/" focuses search, "r" refreshes (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement).closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey)
        return
      if (e.key === '/') {
        e.preventDefault()
        setTab('feed')
        searchRef.current?.focus()
      } else if (e.key.toLowerCase() === 'r') void refresh(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [refresh])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? yt.feed.filter(
          (v) => v.title.toLowerCase().includes(q) || v.channelTitle.toLowerCase().includes(q),
        )
      : yt.feed
  }, [yt.feed, query])

  const openVideo = (videoId: string): void => {
    openInNewTab(`https://www.youtube.com/watch?v=${videoId}`)
    void yt.markWatched(videoId, true)
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'feed', label: 'Feed', count: yt.feed.length },
    { id: 'subscriptions', label: 'Subscriptions', count: yt.subs.length },
    { id: 'later', label: 'Watch Later', count: yt.later.length },
    { id: 'filters', label: 'Filters' },
  ]

  const feedBody = (): React.ReactNode => {
    if (yt.loading) {
      return (
        <div className="ytf-grid" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )
    }
    if (yt.error) {
      return (
        <EmptyState
          tone="error"
          title="Couldn’t load your feed"
          body={yt.error}
          action={{ label: 'Try again', onClick: () => void yt.refresh(true) }}
        />
      )
    }
    if (yt.subs.length === 0) {
      return (
        <EmptyState
          title="Start your subscription feed"
          body="Add a channel by URL or @handle, import your Google Takeout subscriptions.csv, or press “Subscribe in Aura” on any YouTube channel page."
          action={{ label: 'Add channels', onClick: () => setTab('subscriptions') }}
        />
      )
    }
    if (visible.length === 0) {
      return query ? (
        <EmptyState
          title="No matches"
          body={`No videos match “${query}”.`}
          action={{ label: 'Clear search', onClick: () => setQuery('') }}
        />
      ) : (
        <EmptyState
          title="Nothing new right now"
          body="Your filters may be hiding everything, or your channels haven’t posted yet."
          action={{ label: 'Refresh', onClick: () => void yt.refresh(true) }}
        />
      )
    }
    return (
      <div className="ytf-grid">
        {visible.map((item) => (
          <VideoCard
            key={item.videoId}
            item={item}
            onOpen={(i) => openVideo(i.videoId)}
            onToggleLater={(i) => void yt.toggleLater(i)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="ytf">
      <header className="ytf-head">
        <div>
          <h1>YouTube Feed</h1>
          <p>Private subscriptions — no Google account, stored only on this device.</p>
        </div>
        <div className="ytf-tools">
          <button type="button" className="ytf-btn" onClick={onClose} title="Back to tabs">
            ← Back
          </button>
          {tab === 'feed' && (
            <label className="ytf-search">
              <Icon name="search" />
              <input
                ref={searchRef}
                className="ytf-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search feed  ( / )"
                aria-label="Search your feed"
              />
            </label>
          )}
          <button
            type="button"
            className={`ytf-btn ytf-btn--primary${yt.refreshing ? ' ytf-spin' : ''}`}
            onClick={() => void yt.refresh(true)}
            disabled={yt.refreshing}
          >
            <Icon name="refresh" /> {yt.refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="ytf-tabs" role="tablist" aria-label="YouTube feed sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="ytf-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <small>{t.count}</small>}
          </button>
        ))}
      </div>

      <main className="ytf-body" role="tabpanel">
        {tab === 'feed' && feedBody()}
        {tab === 'subscriptions' && <SubscriptionsPanel yt={yt} />}
        {tab === 'later' && (
          <WatchLaterPanel yt={yt} onOpen={(id) => openInNewTab(`https://www.youtube.com/watch?v=${id}`)} />
        )}
        {tab === 'filters' && <FiltersPanel yt={yt} />}
      </main>
    </div>
  )
}

export default YouTubeFeedPage

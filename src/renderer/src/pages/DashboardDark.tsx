import React, { useState } from 'react'
import { IconSearch, IconShield, IconLock, IconUser } from '../components/Icons'
import QuickLink from '../components/QuickLink'

interface Props {
  onNavigate: (url: string) => void
  onSwitchLayout: () => void
}

const FAVORITES = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'YouTube', url: 'https://youtube.com' },
  { label: 'Wikipedia', url: 'https://wikipedia.org' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
  { label: 'Reddit', url: 'https://reddit.com' },
  { label: 'Twitter', url: 'https://twitter.com' },
  { label: 'ChatGPT', url: 'https://chatgpt.com' },
  { label: 'Gmail', url: 'https://mail.google.com' }
]

const DOCK_APPS = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'YouTube', url: 'https://youtube.com' },
  { label: 'Wikipedia', url: 'https://wikipedia.org' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
  { label: 'Reddit', url: 'https://reddit.com' },
  { label: 'Twitter', url: 'https://twitter.com' }
]

// Stage 5.9: Health removed per user request
const CATEGORIES = [
  'Top Stories',
  'Weather',
  'Dining',
  'Entertainment',
  'Travel',
  'Sports'
]

const MOCK_STORIES = [
  { category: 'Top Stories', title: 'Markets close at record highs amid tech rally', source: 'Reuters' },
  { category: 'Weather', title: 'Cold front sweeps across the Pacific Northwest this weekend', source: 'AP' },
  { category: 'Entertainment', title: 'A24 announces three new releases for the spring slate', source: 'Variety' },
  { category: 'Travel', title: 'These five hidden European towns are trending for fall 2025', source: 'CN Traveler' },
  { category: 'Sports', title: 'Underdog team stuns the league with overtime comeback', source: 'ESPN' },
  { category: 'Dining', title: 'The James Beard Award winners changing American cuisine', source: 'Eater' }
]

export default function DashboardDark({
  onNavigate,
  onSwitchLayout
}: Props): React.ReactElement {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Top Stories')

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`)
  }

  const filteredStories =
    activeCategory === 'Top Stories'
      ? MOCK_STORIES
      : MOCK_STORIES.filter((s) => s.category === activeCategory)

  return (
    <div className="dash-dark">
      <aside className="app-dock">
        {DOCK_APPS.map((f) => (
          <button
            key={f.url}
            className="dock-app"
            onClick={() => onNavigate(f.url)}
            title={f.label}
          >
            <DockFavicon url={f.url} label={f.label} />
          </button>
        ))}
      </aside>

      <div className="dash-dark-main">
        <header className="dash-dark-header">
          <div className="dash-dark-top-actions">
            <button className="dash-dark-icon-btn" title="Privacy">
              <IconShield size={16} />
            </button>
            <button className="dash-dark-icon-btn" title="Profile">
              <IconUser size={16} />
            </button>
            <button className="layout-toggle" onClick={onSwitchLayout}>
              Switch layout
            </button>
          </div>
        </header>

        <div className="dash-dark-center">
          <div className="privacy-badges">
            <span className="badge"><IconLock size={11} /> Confidential Search</span>
            <span className="badge"><IconShield size={11} /> Tracker Blocking</span>
            <span className="badge"><IconLock size={11} /> Site Encryption</span>
          </div>

          <form className="dark-search" onSubmit={handleSearch}>
            <IconSearch size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search privately…"
              spellCheck={false}
            />
            <button type="submit" className="dark-search-btn">Search</button>
          </form>

          <div className="favorites-grid">
            {FAVORITES.map((f) => (
              <QuickLink key={f.url} label={f.label} url={f.url} onClick={onNavigate} />
            ))}
          </div>

          <div className="stories-section">
            <div className="category-pills">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`category-pill${c === activeCategory ? ' active' : ''}`}
                  onClick={() => setActiveCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="stories-list">
              {filteredStories.map((s, i) => (
                <article key={i} className="story-card">
                  <div className="story-thumb" />
                  <div className="story-meta">
                    <span className="story-category">{s.category}</span>
                    <h3 className="story-title">{s.title}</h3>
                    <span className="story-source">{s.source}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Tiny inline favicon for dock apps — fetches via Aura's local favicon
 * API. Falls back to a colored letter circle if the fetch fails.
 */
function DockFavicon({ url, label }: { url: string; label: string }): React.ReactElement {
  const [src, setSrc] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    window.aura.favicons
      .fetch(url)
      .then((data) => {
        if (cancelled) return
        if (data) setSrc(data)
        else setFailed(true)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => { cancelled = true }
  }, [url])

  if (failed || !src) {
    return <span className="dock-app-initial">{label[0]}</span>
  }
  return <img src={src} alt={label} />
}

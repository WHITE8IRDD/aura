import React, { useEffect, useRef, useState } from 'react'
import GlassyOrb from '../components/GlassyOrb'

interface Props {
  onNavigate: (url: string) => void
  onSwitchLayout: () => void
}

export default function DashboardDark({
  onNavigate,
  onSwitchLayout
}: Props): React.ReactElement {
  const [query, setQuery] = useState('')
  const [userName] = useState<string>(() => {
    try {
      return localStorage.getItem('aura:userName') || 'there'
    } catch {
      return 'there'
    }
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    const isUrl =
      /^https?:\/\//i.test(trimmed) ||
      (/^[^\s]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(' '))

    if (isUrl) {
      const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      onNavigate(url)
    } else {
      onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`)
    }
    setQuery('')
  }

  return (
    <div className="aurora-newtab">
      <div className="aurora-bg-glow" />
      <div className="aurora-bg-glow-secondary" />

      <button
        className="aurora-layout-toggle"
        onClick={onSwitchLayout}
        title="Switch layout"
      >
        Switch layout
      </button>

      <div className="aurora-center">
        <div className="aurora-orb-wrap">
          <GlassyOrb size={140} />
        </div>

        <div className="aurora-greeting">
          Happy to see you, {userName}
        </div>

        <h1 className="aurora-question">
          How can I help you?
        </h1>

        <form className="aurora-searchbar" onSubmit={handleSubmit}>
          <div className="aurora-cursor-bar" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search now"
            spellCheck={false}
            autoComplete="off"
          />

          <button
            type="button"
            className="aurora-scan-btn"
            title="Visual search (coming soon)"
            tabIndex={-1}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          </button>

          <button
            type="submit"
            className="aurora-mic-btn"
            title="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

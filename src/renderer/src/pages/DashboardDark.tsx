import React, { useEffect, useRef, useState } from 'react'
import { showNativeInputMenu } from '../lib/buildInputMenu'
import { useSettings } from '../hooks/useSettings'
import auraWordmark from '../assets/brand/aura-wordmark-colored.png'

interface Props {
  onNavigate: (url: string) => void
  onSwitchLayout: () => void
}

export default function DashboardDark({
  onNavigate,
  onSwitchLayout
}: Props): React.ReactElement {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { settings } = useSettings()
  const s = settings as Record<string, unknown> | null
  const ntpLayout = (s?.ntpLayout as string) ?? 'default'
  const searchPosition = (s?.ntpSearchBarPosition as string) ?? 'center'

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
      const engine = (s?.defaultSearchEngine as string) ?? 'duckduckgo'
      const q = encodeURIComponent(trimmed)
      const searchUrl = (() => {
        switch (engine) {
          case 'google': return `https://www.google.com/search?q=${q}`
          case 'brave': return `https://search.brave.com/search?q=${q}`
          case 'startpage': return `https://www.startpage.com/sp/search?query=${q}`
          case 'duckduckgo':
          default: return `https://duckduckgo.com/?q=${q}`
        }
      })()
      onNavigate(searchUrl)
    }
    setQuery('')
  }

  if (ntpLayout === 'off') {
    return <div className="ntp-blank" />
  }

  return (
    <div className={`aurora-newtab ntp-layout-${ntpLayout} ntp-search-${searchPosition}`}>
      <div className="aurora-bg-glow" />
      <div className="aurora-bg-glow-secondary" />
      <button className="aurora-layout-toggle" onClick={onSwitchLayout} title="Switch layout">
        Switch layout
      </button>
      <div className="aurora-center">
        <div className="ntp-hero">
          <img src={auraWordmark} alt="Aura" className="ntp-hero-wordmark-img" draggable={false} />
        </div>
        <form className="aurora-searchbar" onSubmit={handleSubmit}>
          <div className="aurora-cursor-bar" />
          <input ref={inputRef} type="text" value={query}
            onChange={(e) => setQuery(e.target.value)} placeholder="Search now"
            spellCheck={false} autoComplete="off"
            onContextMenu={(e) => {
              e.preventDefault(); e.stopPropagation()
              showNativeInputMenu(e.currentTarget, { isAddressBar: true, navigateFn: onNavigate })
            }} />
          <button type="button" className="aurora-scan-btn" title="Visual search (coming soon)" tabIndex={-1}>...</button>
          <button type="submit" className="aurora-mic-btn" title="Search">...</button>
        </form>
      </div>
    </div>
  )
}

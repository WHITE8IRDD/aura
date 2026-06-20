import React, { useEffect, useRef, useState } from 'react'
import { IconSparkle, IconMic, IconPlus, IconMore } from '../components/Icons'
import WidgetGrid from '../widgets/WidgetGrid'
import { showNativeInputMenu } from '../lib/buildInputMenu'
import { useSettings } from '../hooks/useSettings'

interface Props {
  onNavigate: (url: string) => void
  onSwitchLayout: () => void
}

export default function DashboardLight({
  onNavigate,
  onSwitchLayout
}: Props): React.ReactElement {
  const [prompt, setPrompt] = useState('')
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { settings } = useSettings()
  const s = settings as Record<string, unknown> | null
  const ntpLayout = (s?.ntpLayout as string) ?? 'default'
  const searchPosition = (s?.ntpSearchBarPosition as string) ?? 'center'

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return
    const isUrl = /^https?:\/\//i.test(trimmed) ||
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
    setPrompt('')
  }

  if (ntpLayout === 'off') {
    return <div className="ntp-blank" />
  }

  return (
    <div className={`dash-light-v2 ntp-layout-${ntpLayout} ntp-search-${searchPosition}`}>
      <div className="dash-light-bg-glow" />
      <button className="layout-toggle-floating" onClick={onSwitchLayout}>Switch layout</button>
      <div className="dash-light-inner">
        <header className="dash-light-hero">
          <div className="dash-light-greeting-block">
            <h1 className="dash-light-title">What&apos;s on your mind?</h1>
          </div>
        </header>
        <form className="dash-light-prompt" onSubmit={handleSubmit}>
          <textarea ref={inputRef} value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showNativeInputMenu(e.currentTarget, { isAddressBar: true, navigateFn: onNavigate }) }}
            placeholder="Ask me anything, search the web, or type a URL&hellip;" rows={2} />
          <div className="dash-light-prompt-bar">
            <div className="dash-light-prompt-selectors">
              <select className="dash-light-select" defaultValue="balanced">
                <option>Balanced</option>
                <option>Creative</option>
                <option>Precise</option>
              </select>
              <select className="dash-light-select" defaultValue="auto">
                <option>Auto</option>
                <option>Web</option>
                <option>News</option>
              </select>
            </div>
            <div className="dash-light-prompt-buttons">
              <button type="button" className="dash-light-icon-btn" title="Attach"><IconPlus size={14} /></button>
              <button type="button" className="dash-light-icon-btn" title="Voice"><IconMic size={14} /></button>
              <button type="submit" className="dash-light-send"><IconSparkle size={12} /><span>Ask</span></button>
            </div>
          </div>
        </form>
        <div className="dash-light-widget-bar">
          <h2 className="dash-light-section-title">Your space</h2>
          <button className="dash-light-edit-btn" onClick={() => setEditing((v) => !v)}>
            <IconMore size={13} />{editing ? 'Done' : 'Edit widgets'}
          </button>
        </div>
        <WidgetGrid onNavigate={onNavigate} editing={editing} />
      </div>
    </div>
  )
}

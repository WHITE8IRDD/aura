import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { TabState, Suggestion } from '../types'
import Suggestions from './Suggestions'
import {
  IconBack,
  IconForward,
  IconReload,
  IconClose,
  IconLock,
  IconAlert,
  IconMic,
  IconSparkle,
  IconShield,
  IconDownload,
  IconMore
} from './Icons'

interface Props {
  tab: TabState | undefined
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onNavigate: (value: string) => void
  onAssistant: () => void
  focusSignal: number
}

function isSecure(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('aura://')
}

function looksLikeUrl(input: string): boolean {
  if (!input || input.includes(' ')) return false
  if (/^https?:\/\//i.test(input)) return true
  if (/^localhost(:\d+)?/.test(input)) return true
  if (/^\d{1,3}(\.\d{1,3}){3}/.test(input)) return true
  return /^[^\s]+\.[a-zA-Z]{2,}/.test(input)
}

function extractHostname(url: string): string | null {
  try { return new URL(url).hostname } catch { return null }
}

export default function Toolbar({
  tab,
  onBack,
  onForward,
  onReload,
  onNavigate,
  onAssistant,
  focusSignal
}: Props): React.ReactElement {
  const isLoading = tab?.loading ?? false
  const url = tab?.url ?? 'aura://newtab'
  const secure = isSecure(url)
  const hostname = extractHostname(url)
  const isWebPage = hostname && !url.startsWith('aura://')

  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [shieldsEnabled, setShieldsEnabled] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) setValue(url === 'aura://newtab' ? '' : url)
  }, [url, focused])

  useEffect(() => {
    if (focusSignal > 0) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [focusSignal])

  useEffect(() => {
    if (!hostname || !isWebPage) {
      setShieldsEnabled(true)
      return
    }
    window.aura.shields.isEnabled(hostname).then(setShieldsEnabled)
  }, [hostname, isWebPage])

  useEffect(() => {
    if (!focused) {
      setSuggestions([])
      return
    }
    const handle = setTimeout(() => {
      void buildSuggestions(value).then(setSuggestions)
    }, 80)
    return () => clearTimeout(handle)
  }, [value, focused])

  useEffect(() => { setSelectedIndex(0) }, [suggestions.length])

  const submitSuggestion = useCallback(
    (item: Suggestion) => {
      onNavigate(item.url)
      inputRef.current?.blur()
    },
    [onNavigate]
  )

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const chosen = suggestions[selectedIndex]
    if (chosen) submitSuggestion(chosen)
    else {
      onNavigate(value.trim())
      inputRef.current?.blur()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      inputRef.current?.blur()
    }
  }

  const suggestionsRef = useRef<Suggestion[]>([])
  useEffect(() => { suggestionsRef.current = suggestions }, [suggestions])

  const handleHover = useCallback((i: number) => {
    setSelectedIndex(i)
    const item = suggestionsRef.current[i]
    if (item) void window.aura.suggest.preconnect(item.url)
  }, [])

  const handleShieldClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hostname || !isWebPage) return
    const newState = await window.aura.shields.toggle(hostname)
    setShieldsEnabled(newState)
    setTimeout(() => onReload(), 100)
  }, [hostname, isWebPage, onReload])

  return (
    <div className="toolbar">
      <div className="nav-group">
        <button
          className="nav-btn"
          disabled={!tab?.canGoBack}
          onClick={(e) => { e.currentTarget.blur(); onBack() }}
          title="Back (Alt+←)"
        >
          <IconBack size={17} />
        </button>
        <button
          className="nav-btn"
          disabled={!tab?.canGoForward}
          onClick={(e) => { e.currentTarget.blur(); onForward() }}
          title="Forward (Alt+→)"
        >
          <IconForward size={17} />
        </button>
        <button
          className="nav-btn"
          onClick={(e) => { e.currentTarget.blur(); onReload() }}
          title={isLoading ? 'Stop' : 'Reload (Ctrl+R)'}
        >
          {isLoading ? <IconClose size={15} /> : <IconReload size={15} />}
        </button>
      </div>

      <div className="addressbar-wrap">
        <div className="addressbar-stack">
          <form className="addressbar" onSubmit={handleSubmit}>
            <span
              className={`lock-icon${secure ? '' : ' insecure'}`}
              title={secure ? 'Connection is secure' : 'Connection is not secure'}
            >
              {secure ? <IconLock size={12} /> : <IconAlert size={12} />}
            </span>

            <input
              ref={inputRef}
              type="text"
              value={value}
              placeholder="Ask Aura or type a URL"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => {
                setFocused(true)
                e.target.select()
              }}
              onBlur={() => {
                setFocused(false)
                setSuggestions([])
                setValue(url === 'aura://newtab' ? '' : url)
              }}
              aria-label="Address bar"
            />

            {isWebPage && (
              <button
                type="button"
                className={`ab-shield${shieldsEnabled ? ' active' : ' off'}`}
                title={
                  shieldsEnabled
                    ? `Aura Shields ON for ${hostname}\nClick to disable for this site`
                    : `Aura Shields OFF for ${hostname}\nClick to re-enable`
                }
                onClick={handleShieldClick}
                tabIndex={-1}
              >
                <IconShield size={13} />
              </button>
            )}

            <button
              type="button"
              className="ab-icon-btn"
              title="Voice input"
              tabIndex={-1}
            >
              <IconMic size={13} />
            </button>
          </form>

          {focused && suggestions.length > 0 && (
            <Suggestions
              items={suggestions}
              selectedIndex={selectedIndex}
              onHover={handleHover}
              onSelect={submitSuggestion}
            />
          )}
        </div>
      </div>

      <div className="toolbar-actions">
        <button className="nav-btn" title="Downloads" tabIndex={-1}
          onClick={(e) => e.currentTarget.blur()}>
          <IconDownload size={15} />
        </button>
        <button className="nav-btn" title="More" tabIndex={-1}
          onClick={(e) => e.currentTarget.blur()}>
          <IconMore size={15} />
        </button>
        <button
          className="assistant-btn"
          onClick={(e) => { e.currentTarget.blur(); onAssistant() }}
          title="Open Aura assistant"
        >
          <IconSparkle size={13} />
          <span>Assistant</span>
        </button>
      </div>
    </div>
  )
}

async function buildSuggestions(input: string): Promise<Suggestion[]> {
  const q = input.trim()
  const out: Suggestion[] = []

  if (q) {
    if (looksLikeUrl(q)) {
      const url = /^https?:\/\//i.test(q) ? q : `https://${q}`
      out.push({ type: 'url', label: `Go to ${q}`, hint: 'Enter', url })
    }
    out.push({
      type: 'search',
      label: `Search the web for "${q}"`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
    })
  }

  const history = await window.aura.suggest.query(q)
  for (const h of history) {
    let hn = h.url
    try { hn = new URL(h.url).hostname.replace(/^www\./, '') } catch { /* keep raw */ }
    out.push({
      type: 'history',
      label: h.title || h.url,
      hint: hn,
      url: h.url
    })
  }

  return out
}

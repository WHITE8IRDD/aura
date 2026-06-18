import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { TabState, Suggestion, Bookmark } from '../types'
import Suggestions from './Suggestions'
import BookmarkDialog from './BookmarkDialog'
import ZoomIndicator from './ZoomIndicator'
import UtilityCluster from './UtilityCluster'
import ReaderButton from './ReaderButton'
import {
  IconBack, IconForward, IconReload, IconClose, IconLock, IconAlert,
  IconMic, IconSparkle, IconShield, IconBookmark
} from './Icons'

interface Props {
  tab: TabState | undefined
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onNavigate: (value: string) => void
  onAssistant: () => void
  focusSignal: number
  onOpenBookmarks: () => void
  onOpenHistory: () => void
  onOpenDownloads: () => void
  onOpenPrivacy: () => void
  onOpenExtensions: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenNinja: () => void
  onToggleVerticalTabs: () => void
  bookmarkSignal: number
  onToggleReader: () => void
  readerActive: boolean
  onSaveToReadingList: () => void
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

export default function Toolbar(props: Props): React.ReactElement {
  const {
    tab, onBack, onForward, onReload, onNavigate, onAssistant, focusSignal,
    onOpenBookmarks, onOpenHistory, onOpenDownloads, onOpenPrivacy,
    onOpenExtensions, onOpenSettings, onOpenProfile, onOpenNinja,
    onToggleVerticalTabs, bookmarkSignal,
    onToggleReader, readerActive,
    onSaveToReadingList
  } = props

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
  const [existingBookmarkId, setExistingBookmarkId] = useState<number | null>(null)
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false)
  const [bookmarkAnchor, setBookmarkAnchor] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bookmarkBtnRef = useRef<HTMLButtonElement>(null)

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
    if (!isWebPage) {
      setShieldsEnabled(true)
      setExistingBookmarkId(null)
      return
    }
    if (hostname) window.aura.shields.isEnabled(hostname).then(setShieldsEnabled)
    void window.aura.bookmarks.list().then((list: Bookmark[]) => {
      const existing = list.find((b) => b.url === url)
      setExistingBookmarkId(existing ? existing.id : null)
    })
  }, [url, hostname, isWebPage])

  useEffect(() => {
    if (bookmarkSignal > 0 && isWebPage) {
      const rect = bookmarkBtnRef.current?.getBoundingClientRect() ?? null
      setBookmarkAnchor(rect)
      setBookmarkDialogOpen(true)
    }
  }, [bookmarkSignal, isWebPage])

  useEffect(() => {
    if (bookmarkDialogOpen) {
      void window.aura.layout.hideView()
    } else {
      void window.aura.layout.showView()
    }
  }, [bookmarkDialogOpen])

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

  const handleBookmarkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isWebPage) return
    const rect = bookmarkBtnRef.current?.getBoundingClientRect() ?? null
    setBookmarkAnchor(rect)
    setBookmarkDialogOpen(true)
  }, [isWebPage])

  const refreshBookmarkState = useCallback(() => {
    void window.aura.bookmarks.list().then((list: Bookmark[]) => {
      const existing = list.find((b) => b.url === url)
      setExistingBookmarkId(existing ? existing.id : null)
    })
  }, [url])

  return (
    <div className="toolbar">
      <div className="nav-group">
        <button className="nav-btn" disabled={!tab?.canGoBack}
          onClick={(e) => { e.currentTarget.blur(); onBack() }} title="Back (Alt+\u2190)">
          <IconBack size={17} />
        </button>
        <button className="nav-btn" disabled={!tab?.canGoForward}
          onClick={(e) => { e.currentTarget.blur(); onForward() }} title="Forward (Alt+\u2192)">
          <IconForward size={17} />
        </button>
        <button className="nav-btn"
          onClick={(e) => { e.currentTarget.blur(); onReload() }}
          title={isLoading ? 'Stop' : 'Reload (Ctrl+R)'}>
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
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => { setFocused(true); e.target.select() }}
              onBlur={() => {
                setFocused(false)
                setSuggestions([])
                setValue(url === 'aura://newtab' ? '' : url)
              }}
              aria-label="Address bar"
            />

            {isWebPage && (
              <ReaderButton active={readerActive} onClick={onToggleReader} />
            )}

            {isWebPage && (
              <button
                type="button"
                className="ab-reading-list"
                title="Save to reading list"
                onClick={(e) => { e.stopPropagation(); onSaveToReadingList() }}
                tabIndex={-1}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </button>
            )}

            {isWebPage && (
              <button
                ref={bookmarkBtnRef}
                type="button"
                className={`ab-bookmark${existingBookmarkId !== null ? ' active' : ''}`}
                title={existingBookmarkId !== null ? 'Edit bookmark (Ctrl+D)' : 'Bookmark this page (Ctrl+D)'}
                onClick={handleBookmarkClick}
                tabIndex={-1}
              >
                <IconBookmark size={13} />
              </button>
            )}

            {isWebPage && (
              <button
                type="button"
                className={`ab-shield${shieldsEnabled ? ' active' : ' off'}`}
                title={
                  shieldsEnabled
                    ? `Aura Shields ON for ${hostname}\nClick to disable`
                    : `Aura Shields OFF for ${hostname}\nClick to re-enable`
                }
                onClick={handleShieldClick}
                tabIndex={-1}
              >
                <IconShield size={13} />
              </button>
            )}

            <button type="button" className="ab-icon-btn" title="Voice input" tabIndex={-1}>
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
        {tab && !tab.internal && tab.zoomFactor !== 1.0 && (
          <ZoomIndicator
            factor={tab.zoomFactor ?? 1.0}
            onZoomIn={() => window.aura.tabs.zoomIn(tab.id)}
            onZoomOut={() => window.aura.tabs.zoomOut(tab.id)}
            onReset={() => window.aura.tabs.zoomReset(tab.id)}
          />
        )}

        <UtilityCluster
          onOpenBookmarks={onOpenBookmarks}
          onOpenHistory={onOpenHistory}
          onOpenDownloads={onOpenDownloads}
          onOpenPrivacy={onOpenPrivacy}
          onOpenExtensions={onOpenExtensions}
          onOpenSettings={onOpenSettings}
          onOpenProfile={onOpenProfile}
          onOpenNinja={onOpenNinja}
          onToggleVerticalTabs={onToggleVerticalTabs}
        />

        <button className="assistant-btn"
          onClick={(e) => { e.currentTarget.blur(); onAssistant() }}
          title="Open Aura assistant">
          <IconSparkle size={13} />
          <span>Assistant</span>
        </button>
      </div>

      {bookmarkDialogOpen && isWebPage && (
        <BookmarkDialog
          url={url}
          initialTitle={tab?.title || url}
          anchorRect={bookmarkAnchor}
          existingBookmarkId={existingBookmarkId}
          onSaved={refreshBookmarkState}
          onRemoved={refreshBookmarkState}
          onClose={() => setBookmarkDialogOpen(false)}
        />
      )}
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
    try { hn = new URL(h.url).hostname.replace(/^www\./, '') } catch {}
    out.push({ type: 'history', label: h.title || h.url, hint: hn, url: h.url })
  }
  return out
}

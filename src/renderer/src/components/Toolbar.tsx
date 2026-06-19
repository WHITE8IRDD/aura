import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { TabState, Suggestion, Bookmark } from '../types'
import Suggestions from './Suggestions'
import BookmarkDialog from './BookmarkDialog'
import ZoomIndicator from './ZoomIndicator'
import UtilityCluster from './UtilityCluster'
import ReaderButton from './ReaderButton'
import SearchEnginePicker from './SearchEnginePicker'
import { showNativeInputMenu } from '../lib/buildInputMenu'
import { showToolbarMenu } from '../lib/showToolbarMenu'
import { useSettings } from '../hooks/useSettings'
import {
  IconBack, IconForward, IconReload, IconClose, IconLock, IconAlert,
  IconSearch, IconMic, IconSparkle, IconShield, IconBookmark, IconHome
} from './Icons'

interface ToolbarMenuHandlers {
  bookmarksBarVisible: boolean
  sidebarVisible: boolean
  onToggleBookmarksBar: () => void
  onToggleSidebar: () => void
  onOpenSettings: () => void
}

interface Props {
  tab: TabState | undefined
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onNavigate: (value: string) => void
  onAssistant: () => void
  focusSignal: number
  onOpenHistory: () => void
  onOpenDownloads: () => void
  onOpenExtensions: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenNinja: () => void
  onOpenCommandPalette: () => void
  onToggleVerticalTabs: () => void
  verticalTabs: boolean
  bookmarkSignal: number
  onSaveToReadingList: () => void
  onOpenFindBar?: () => void
  onToggleReader?: () => void
  readerActive?: boolean
  toolbarMenuHandlers: ToolbarMenuHandlers
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

function buildSearchUrl(engine: string, query: string): string {
  const q = encodeURIComponent(query)
  switch (engine) {
    case 'duckduckgo': return `https://duckduckgo.com/?q=${q}`
    case 'brave':      return `https://search.brave.com/search?q=${q}`
    case 'startpage':  return `https://www.startpage.com/sp/search?query=${q}`
    case 'google':
    default:           return `https://www.google.com/search?q=${q}`
  }
}

function engineDisplayName(engine: string): string {
  switch (engine) {
    case 'duckduckgo': return 'DuckDuckGo'
    case 'brave':      return 'Brave Search'
    case 'startpage':  return 'Startpage'
    case 'google':
    default:           return 'Google'
  }
}

export default function Toolbar(props: Props): React.ReactElement {


  const {
    tab, onBack, onForward, onReload, onNavigate, onAssistant, focusSignal,
    onOpenHistory, onOpenDownloads,
    onOpenExtensions, onOpenSettings, onOpenProfile, onOpenNinja,
    onOpenCommandPalette,
    onToggleVerticalTabs, verticalTabs, bookmarkSignal, onSaveToReadingList,
    onOpenFindBar, onToggleReader, readerActive, toolbarMenuHandlers
  } = props

  const { settings, set } = useSettings()
  const currentEngine = settings?.defaultSearchEngine ?? 'google'

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

  const handleHome = useCallback(() => {
    const homeUrl = settings?.startupUrl || 'aura://newtab'
    onNavigate(homeUrl)
  }, [onNavigate, settings])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkSignal])

  useEffect(() => {
    if (bookmarkDialogOpen) void window.aura.layout.hideView()
    else void window.aura.layout.showView()
  }, [bookmarkDialogOpen])

  useEffect(() => {
    if (!focused) {
      setSuggestions([])
      return
    }
    if (!settings?.searchSuggestionsEnabled) {
      setSuggestions([])
      return
    }
    const handle = setTimeout(() => {
      void buildSuggestions(value, currentEngine, settings).then(setSuggestions)
    }, 80)
    return () => clearTimeout(handle)
  }, [value, focused, currentEngine, settings])

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
    if (chosen) {
      submitSuggestion(chosen)
    } else {
      const trimmed = value.trim()
      if (!trimmed) return
      if (looksLikeUrl(trimmed)) {
        onNavigate(trimmed)
      } else {
        onNavigate(buildSearchUrl(currentEngine, trimmed))
      }
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
    <div className="toolbar" onContextMenu={(e) => showToolbarMenu(e, toolbarMenuHandlers)}>
      <div className="nav-group">
        <button className="nav-btn toolbar-nav-btn" disabled={!tab?.canGoBack}
          onClick={(e) => { e.currentTarget.blur(); onBack() }} title="Back (Alt+\u2190)">
          <IconBack size={17} />
        </button>
        <button className="nav-btn toolbar-nav-btn" disabled={!tab?.canGoForward}
          onClick={(e) => { e.currentTarget.blur(); onForward() }} title="Forward (Alt+\u2192)">
          <IconForward size={17} />
        </button>
        <button className="nav-btn toolbar-nav-btn"
          onClick={(e) => { e.currentTarget.blur(); onReload() }}
          title={isLoading ? 'Stop' : 'Reload (Ctrl+R)'}>
          {isLoading ? <IconClose size={15} /> : <IconReload size={15} />}
        </button>
        <button className="nav-btn toolbar-nav-btn"
          onClick={(e) => { e.currentTarget.blur(); handleHome() }}
          title="Home (Alt+Home)">
          <IconHome size={16} />
        </button>
        <div className="nav-divider" />
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

            {settings?.searchPickerVisible && settings && (
              <SearchEnginePicker
                current={currentEngine}
                onChange={(engine) => {
                  void set('defaultSearchEngine', engine)
                }}
              />
            )}

            <input
              ref={inputRef}
              type="text"
              value={value}
              placeholder={`Search ${engineDisplayName(currentEngine)} or type a URL`}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => { setFocused(true); e.target.select() }}
              onBlur={() => {
                setFocused(false)
                setSuggestions([])
                setValue(url === 'aura://newtab' ? '' : url)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                showNativeInputMenu(e.currentTarget, {
                  isAddressBar: true,
                  navigateFn: onNavigate
                })
              }}
              aria-label="Address bar"
            />

            <button type="button" className="ab-icon-btn urlbar-icon-btn"
              title="Find in page (Ctrl+F)"
              onClick={(e) => { e.currentTarget.blur(); onOpenFindBar?.() }}
              tabIndex={-1}
            >
              <IconSearch size={13} />
            </button>

            {onToggleReader && (
              <ReaderButton active={!!readerActive} onClick={onToggleReader} />
            )}

            {isWebPage && (
              <button
                ref={bookmarkBtnRef}
                type="button"
                className={`ab-bookmark urlbar-icon-btn${existingBookmarkId !== null ? ' active' : ''}`}
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
                className={`ab-shield urlbar-icon-btn${shieldsEnabled ? ' active' : ' off'}`}
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

            <button type="button" className="ab-icon-btn urlbar-icon-btn" title="Voice input" tabIndex={-1}>
              <IconMic size={13} />
            </button>
          </form>

          {focused && settings?.searchSuggestionsEnabled && suggestions.length > 0 && (
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
          onOpenHistory={onOpenHistory}
          onOpenDownloads={onOpenDownloads}
          onOpenExtensions={onOpenExtensions}
          onOpenSettings={onOpenSettings}
          onOpenProfile={onOpenProfile}
          onOpenNinja={onOpenNinja}
          onOpenCommandPalette={onOpenCommandPalette}
          onToggleVerticalTabs={onToggleVerticalTabs}
          verticalTabs={verticalTabs}
        />

        <div className="toolbar-group-separator" />
        <button
          className="util-btn"
          onClick={() => {
            const next = settings?.tabsLayout === 'vertical' ? 'horizontal' : 'vertical'
            window.aura.settings.set('tabsLayout', next)
          }}
          title={settings?.tabsLayout === 'vertical'
            ? 'Switch to horizontal tabs'
            : 'Switch to vertical tabs'}
          aria-label="Toggle tab layout"
        >
          {settings?.tabsLayout === 'vertical' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="6" rx="1"/>
              <rect x="3" y="12" width="18" height="9" rx="1"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1"/>
              <rect x="13" y="3" width="8" height="18" rx="1"/>
            </svg>
          )}
        </button>
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

async function buildSuggestions(
  input: string,
  engine: string,
  s?: Record<string, unknown>
): Promise<Suggestion[]> {
  const q = input.trim()
  const out: Suggestion[] = []

  if (q) {
    if (looksLikeUrl(q)) {
      const url = /^https?:\/\//i.test(q) ? q : `https://${q}`
      out.push({ type: 'url', label: `Go to ${q}`, hint: 'Enter', url })
    }

    const engineName = engineDisplayName(engine)
    const searchUrl = (() => {
      const enc = encodeURIComponent(q)
      switch (engine) {
        case 'duckduckgo': return `https://duckduckgo.com/?q=${enc}`
        case 'brave':      return `https://search.brave.com/search?q=${enc}`
        case 'startpage':  return `https://www.startpage.com/sp/search?query=${enc}`
        case 'google':
        default:           return `https://www.google.com/search?q=${enc}`
      }
    })()

    out.push({
      type: 'search',
      label: `Search ${engineName} for "${q}"`,
      url: searchUrl
    })
  }

  const includeHistory = (s?.searchSuggestSourceHistory as boolean) ?? true
  const includeBookmarks = (s?.searchSuggestSourceBookmarks as boolean) ?? true
  const includeOpenTabs = (s?.searchSuggestSourceOpenTabs as boolean) ?? true
  const seen = new Set<string>()

  if (includeHistory && q) {
    const history = await window.aura.suggest.query(q)
    for (const h of history) {
      if (seen.has(h.url)) continue
      seen.add(h.url)
      let hn = h.url
      try { hn = new URL(h.url).hostname.replace(/^www\./, '') } catch {}
      out.push({
        type: 'history',
        label: h.title || h.url,
        hint: hn,
        url: h.url
      })
    }
  }

  if (includeBookmarks && q) {
    const ql = q.toLowerCase()
    const bookmarks = await window.aura.bookmarks.list()
    for (const b of bookmarks) {
      if (b.url && (b.title?.toLowerCase().includes(ql) || b.url.toLowerCase().includes(ql))) {
        if (seen.has(b.url)) continue
        seen.add(b.url)
        let hn = b.url
        try { hn = new URL(b.url).hostname.replace(/^www\./, '') } catch {}
        out.push({
          type: 'bookmark',
          label: b.title || b.url,
          hint: hn,
          url: b.url
        })
      }
    }
  }

  if (includeOpenTabs && q) {
    const ql = q.toLowerCase()
    const state = await window.aura.tabs.getState()
    if (state) {
      for (const tab of state.tabs) {
        const tabUrl = tab.url || ''
        const tabTitle = tab.title || ''
        if (tabTitle.toLowerCase().includes(ql) || tabUrl.toLowerCase().includes(ql)) {
          if (seen.has(tabUrl)) continue
          seen.add(tabUrl)
          let hn = tabUrl
          try { hn = new URL(tabUrl).hostname.replace(/^www\./, '') } catch {}
          out.push({
            type: 'open-tab',
            label: tabTitle || tabUrl,
            hint: hn ? `Switch to ${hn}` : 'Switch to tab',
            url: tabUrl
          })
        }
      }
    }
  }

  return out
}

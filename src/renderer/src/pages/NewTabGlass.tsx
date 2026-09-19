import React, { useEffect, useRef, useState } from 'react'
import './NewTabGlass.css'
import { useSettings } from '../hooks/useSettings'
import { showNativeInputMenu } from '../lib/buildInputMenu'
import type { QuickLink } from '../../../shared/aura-features'

interface Props {
  onNavigate: (url: string) => void
}

const MAX_LINKS = 8

function looksLikeUrl(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) ||
    (/^[^\s]+\.[a-zA-Z]{2,}/.test(value) && !value.includes(' '))
  )
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function searchUrlFor(query: string, engine: string): string {
  if (looksLikeUrl(query)) {
    return /^https?:\/\//i.test(query) ? query : `https://${query}`
  }
  const q = encodeURIComponent(query)
  switch (engine) {
    case 'google':
      return `https://www.google.com/search?q=${q}`
    case 'brave':
      return `https://search.brave.com/search?q=${q}`
    case 'startpage':
      return `https://www.startpage.com/sp/search?query=${q}`
    case 'duckduckgo':
    default:
      return `https://duckduckgo.com/?q=${q}`
  }
}

function hueOf(hostname: string): number {
  return Array.from(hostname).reduce((a, c) => a + c.charCodeAt(0), 0) % 360
}

/**
 * Aura wordmark — white ring open at the bottom with an inner A-peak.
 * Canonical asset: src/renderer/src/assets/aura-mark.svg (same paths,
 * stroke="currentColor" so CSS controls the tone). Inlined here to avoid
 * an asset-URL import (no vite/client declarations in this project).
 */
function AuraMark({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M33.0 75.1 A32 32 0 1 1 67.0 75.1" strokeWidth="8.5" strokeLinecap="butt" />
      <path
        d="M31 86 L50 36 L69 86"
        strokeWidth="10"
        strokeLinejoin="miter"
        strokeLinecap="butt"
        strokeMiterlimit="4"
      />
    </svg>
  )
}

function MoonIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

function ShieldIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.4 7 9 4.1-1.6 7-4.7 7-9V5.8L12 3Z" />
    </svg>
  )
}

/** Single quick-dial tile: cached favicon with monogram fallback. */
function QuickDialTile({
  link,
  onOpen,
  onEdit,
  onRemove
}: {
  link: QuickLink
  onOpen: () => void
  onEdit: () => void
  onRemove: () => void
}): React.ReactElement {
  const [favicon, setFavicon] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const hostname = (() => {
    try {
      return new URL(link.url).hostname
    } catch {
      return link.url
    }
  })()
  const hue = hueOf(hostname || link.title)

  useEffect(() => {
    let cancelled = false
    setFavicon(null)
    setFailed(false)
    window.aura.favicons
      .fetch(link.url)
      .then((data) => {
        if (cancelled) return
        if (data) setFavicon(data)
        else setFailed(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [link.url])

  return (
    <div className="nt-tile-wrap">
      <button
        className="nt-tile"
        onClick={onOpen}
        title={`${link.title} — ${link.url}`}
        aria-label={`Open ${link.title}`}
      >
        <span
          className="nt-tile-icon"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 45%, 55%), hsl(${(hue + 40) % 360}, 45%, 42%))`
          }}
        >
          {favicon && !failed ? (
            <img src={favicon} alt="" draggable={false} onError={() => setFailed(true)} />
          ) : (
            <span className="nt-tile-initial">
              {(link.title[0] ?? '?').toUpperCase()}
            </span>
          )}
        </span>
        <span className="nt-tile-label">{link.title}</span>
      </button>
      <span className="nt-tile-actions">
        <button
          className="nt-tile-mini"
          onClick={onEdit}
          title={`Edit ${link.title}`}
          aria-label={`Edit ${link.title}`}
        >
          ✎
        </button>
        <button
          className="nt-tile-mini"
          onClick={onRemove}
          title={`Remove ${link.title}`}
          aria-label={`Remove ${link.title}`}
        >
          ×
        </button>
      </span>
    </div>
  )
}

/** Add / edit modal for a quick link. */
function LinkModal({
  initial,
  onSave,
  onDelete,
  onClose
}: {
  initial: QuickLink | null
  onSave: (title: string, url: string) => void
  onDelete: (() => void) | null
  onClose: () => void
}): React.ReactElement {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 60)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Give the site a title.')
      return
    }
    if (!normalizeUrl(url)) {
      setError('That URL does not look valid.')
      return
    }
    onSave(title.trim().slice(0, 40), url.trim())
  }

  return (
    <div className="nt-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="nt-modal"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Edit quick link' : 'Add quick link'}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="nt-modal-title">{initial ? 'Edit quick link' : 'Add quick link'}</h2>
        <form onSubmit={submit}>
          <label className="nt-field">
            <span>Title</span>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Netflix"
              maxLength={40}
              autoComplete="off"
            />
          </label>
          <label className="nt-field">
            <span>URL</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://netflix.com"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {error && <p className="nt-form-error">{error}</p>}
          <div className="nt-modal-actions">
            {onDelete && (
              <button type="button" className="nt-btn danger" onClick={onDelete}>
                Delete
              </button>
            )}
            <span className="nt-modal-spacer" />
            <button type="button" className="nt-btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="nt-btn primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewTabGlass({ onNavigate }: Props): React.ReactElement {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [query, setQuery] = useState('')
  const [links, setLinks] = useState<QuickLink[]>([])
  const [modal, setModal] = useState<{ editingId: string | null } | null>(null)
  const [snooze, setSnooze] = useState({ snoozedCount: 0, approxFreedMB: 0 })
  const [blocked, setBlocked] = useState({ ads: 0, trackers: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const { settings } = useSettings()
  const s = settings as Record<string, unknown> | null
  const ntpLayout = (s?.ntpLayout as string) ?? 'default'
  const engine = (s?.defaultSearchEngine as string) ?? 'duckduckgo'

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 20)
    return () => window.clearTimeout(t)
  }, [])

  // Quiet clock — tick every second, locale-respecting format.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [])

  // Quick links — persisted in SQLite via main-process IPC.
  useEffect(() => {
    let cancelled = false
    window.auraFeatures.newtab
      .getLinks()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setLinks(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Live Aura stats — snooze (RAM) + Shields (ads/trackers).
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      window.auraFeatures.snooze
        .stats()
        .then((st) => {
          if (!cancelled && st) {
            setSnooze({
              snoozedCount: st.snoozedCount ?? 0,
              approxFreedMB: st.approxFreedMB ?? 0
            })
          }
        })
        .catch(() => {})
      window.aura.privacy
        .stats()
        .then((p) => {
          if (!cancelled && p) {
            setBlocked({ ads: p.adsBlocked ?? 0, trackers: p.trackersBlocked ?? 0 })
          }
        })
        .catch(() => {})
    }
    load()
    const timer = window.setInterval(load, 30000)
    const unsub = window.auraFeatures.snooze.onTabState(() => load())
    return () => {
      cancelled = true
      window.clearInterval(timer)
      unsub()
    }
  }, [])

  if (ntpLayout === 'off') {
    return <div className="ntp-blank" />
  }
  const minimal = ntpLayout === 'minimal'

  const hours = now.getHours()
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening'
  const clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    onNavigate(searchUrlFor(trimmed, engine))
    setQuery('')
  }

  const persist = (next: QuickLink[]): void => {
    setLinks(next)
    window.auraFeatures.newtab.setLinks(next).catch(() => {})
  }

  const handleSaveLink = (title: string, url: string): void => {
    const clean = normalizeUrl(url)
    if (!clean) return
    if (modal?.editingId) {
      persist(links.map((l) => (l.id === modal.editingId ? { ...l, title, url: clean } : l)))
    } else {
      persist([...links, { id: `${Date.now()}`, title, url: clean }].slice(0, MAX_LINKS))
    }
    setModal(null)
  }

  const handleDeleteLink = (): void => {
    if (modal?.editingId) {
      persist(links.filter((l) => l.id !== modal.editingId))
    }
    setModal(null)
  }

  const editingLink = modal?.editingId
    ? (links.find((l) => l.id === modal.editingId) ?? null)
    : null
  const totalBlocked = blocked.ads + blocked.trackers

  return (
    <div className={`nt${mounted ? ' nt-mounted' : ''}`}>
      <div className="nt-inner">
        <div className="nt-brand">
          <AuraMark className="nt-logo" />
          <div className="nt-wordmark">aura</div>
        </div>

        <header className="nt-hero">
          <div className="nt-clock">{clock}</div>
          <div className="nt-greeting">{greeting}</div>
        </header>

        <form className="nt-search" onSubmit={handleSearch} role="search">
          <svg
            className="nt-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or enter address"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search or enter address"
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              showNativeInputMenu(e.currentTarget, { isAddressBar: true, navigateFn: onNavigate })
            }}
          />
          {query && (
            <button
              type="button"
              className="nt-search-clear"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </form>

        {!minimal && (
          <section className="nt-dials" aria-label="Quick links">
            {links.map((link) => (
              <QuickDialTile
                key={link.id}
                link={link}
                onOpen={() => onNavigate(link.url)}
                onEdit={() => setModal({ editingId: link.id })}
                onRemove={() => persist(links.filter((l) => l.id !== link.id))}
              />
            ))}
            {links.length < MAX_LINKS && (
              <div className="nt-tile-wrap">
                <button
                  className="nt-tile nt-add"
                  onClick={() => setModal({ editingId: null })}
                  title="Add a quick link"
                  aria-label="Add a quick link"
                >
                  <span className="nt-tile-icon nt-add-icon">+</span>
                  <span className="nt-tile-label">Add</span>
                </button>
              </div>
            )}
          </section>
        )}

        {!minimal && (
          <footer className="nt-footer" aria-label="Aura stats">
            <span className="nt-stat">
              <MoonIcon />
              {snooze.approxFreedMB} MB RAM saved
            </span>
            <span className="nt-stat-sep" aria-hidden="true">
              ·
            </span>
            <span className="nt-stat">
              <ShieldIcon />
              {totalBlocked} ads &amp; trackers blocked
            </span>
          </footer>
        )}
      </div>

      {modal && (
        <LinkModal
          initial={editingLink}
          onSave={handleSaveLink}
          onDelete={modal.editingId ? handleDeleteLink : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

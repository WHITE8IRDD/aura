import React, { useEffect, useRef, useState } from 'react'
import type { TabState } from '../types'
import { IconSearch } from './Icons'

interface Props {
  open: boolean
  tabs: TabState[]
  onClose: () => void
  onSelect: (id: number) => void
  onClose_: (id: number) => void
}

export default function TabSearchPalette({
  open, tabs, onClose, onSelect, onClose_
}: Props): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  if (!open) return null

  const q = query.trim().toLowerCase()
  const filtered = q
    ? tabs.filter((t) =>
        t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
      )
    : tabs

  const handleKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = filtered[selectedIndex]
      if (chosen) {
        onSelect(chosen.id)
        onClose()
      }
    }
  }

  return (
    <div className="tabsearch-overlay" onClick={onClose}>
      <div className="tabsearch" onClick={(e) => e.stopPropagation()}>
        <div className="tabsearch-input-row">
          <IconSearch size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKey}
            placeholder={`Search ${tabs.length} open tabs\u2026`}
            spellCheck={false}
          />
          <kbd>esc</kbd>
        </div>
        <div className="tabsearch-list">
          {filtered.length === 0 ? (
            <div className="tabsearch-empty">No matching tabs</div>
          ) : (
            filtered.map((t, i) => (
              <div
                key={t.id}
                className={`tabsearch-row${i === selectedIndex ? ' selected' : ''}`}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => { onSelect(t.id); onClose() }}
              >
                {t.favicon ? (
                  <img src={t.favicon} alt="" className="tabsearch-favicon"
                    onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <span className="tabsearch-favicon-placeholder" />
                )}
                <div className="tabsearch-info">
                  <div className="tabsearch-title">{t.title || 'New Tab'}</div>
                  <div className="tabsearch-url">{t.url}</div>
                </div>
                <button
                  className="tabsearch-close"
                  onClick={(e) => { e.stopPropagation(); onClose_(t.id) }}
                  title="Close tab"
                >&times;</button>
              </div>
            ))
          )}
        </div>
        <div className="tabsearch-footer">
          <span>&uarr;&darr; navigate</span>
          <span>&crarr; switch</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import {
  IconSearch, IconPlus, IconHistory, IconBookmark,
  IconSettings, IconDownload, IconSidebar, IconUser
} from './Icons'

interface Command {
  id: string
  label: string
  hint: string
  icon: React.ReactElement
  run: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (url: string) => void
  onNewTab: () => void
  onNinja: () => void
  onOpenPage: (page: string) => void
  onToggleSidebar: () => void
  onToggleBookmarksBar: () => void
  onQuit: () => void
}

export default function CommandPalette({
  open, onClose, onNavigate, onNewTab, onNinja,
  onOpenPage, onToggleSidebar, onToggleBookmarksBar, onQuit
}: Props): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  const act = (fn: () => void) => () => { fn(); onClose() }

  const baseCommands: Command[] = [
    {
      id: 'new-tab',
      label: 'New Tab',
      hint: 'Ctrl+T',
      icon: <IconPlus size={16} />,
      run: act(onNewTab)
    },
    {
      id: 'ninja',
      label: 'New Ninja Window',
      hint: 'Ctrl+Shift+N',
      icon: <IconUser size={16} />,
      run: act(onNinja)
    },
    {
      id: 'history',
      label: 'Open History',
      hint: 'Ctrl+H',
      icon: <IconHistory size={16} />,
      run: act(() => onOpenPage('history'))
    },
    {
      id: 'bookmarks',
      label: 'Open Bookmarks',
      hint: 'Ctrl+Shift+O',
      icon: <IconBookmark size={16} />,
      run: act(() => onOpenPage('bookmarks'))
    },
    {
      id: 'downloads',
      label: 'Open Downloads',
      hint: 'Ctrl+J',
      icon: <IconDownload size={16} />,
      run: act(() => onOpenPage('downloads'))
    },
    {
      id: 'reading-list',
      label: 'Open Reading List',
      hint: '',
      icon: <span style={{ fontSize: 16, lineHeight: 1 }}>📖</span>,
      run: act(() => onOpenPage('readingList'))
    },
    {
      id: 'privacy',
      label: 'Open Privacy Dashboard',
      hint: '',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>,
      run: act(() => onOpenPage('privacy'))
    },
    {
      id: 'settings',
      label: 'Open Settings',
      hint: 'Ctrl+,',
      icon: <IconSettings size={16} />,
      run: act(() => onOpenPage('settings'))
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      hint: 'Ctrl+\\',
      icon: <IconSidebar size={16} />,
      run: act(onToggleSidebar)
    },
    {
      id: 'toggle-bookmarks-bar',
      label: 'Toggle Bookmarks Bar',
      hint: 'Ctrl+Shift+B',
      icon: <IconBookmark size={16} />,
      run: act(onToggleBookmarksBar)
    },
    {
      id: 'quit',
      label: 'Quit Aura',
      hint: 'Ctrl+Q',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>,
      run: act(onQuit)
    }
  ]

  const trimmed = query.trim()
  const filtered = trimmed
    ? baseCommands.filter((c) => c.label.toLowerCase().includes(trimmed.toLowerCase()))
    : baseCommands

  const showGoTo = trimmed.length > 0

  const handleKey = (e: React.KeyboardEvent): void => {
    const total = filtered.length + (showGoTo ? 1 : 0)
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => (s + 1) % total)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => (s - 1 + total) % total)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showGoTo && selected === 0) {
        onNavigate(trimmed)
        onClose()
      } else {
        const cmd = filtered[selected - (showGoTo ? 1 : 0)]
        cmd?.run()
      }
    }
  }

  if (!open) return null

  return (
    <div className="cmdp-overlay" onClick={onClose}>
      <div className="cmdp" onClick={(e) => e.stopPropagation()}>
        <div className="cmdp-input-row">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            onKeyDown={handleKey}
            placeholder="Search or jump to…"
            spellCheck={false}
            autoComplete="off"
          />
          <kbd>esc</kbd>
        </div>

        <div className="cmdp-list">
          {showGoTo && (
            <div
              className={`cmdp-item${selected === 0 ? ' selected' : ''}`}
              onMouseEnter={() => setSelected(0)}
              onClick={() => {
                onNavigate(trimmed)
                onClose()
              }}
            >
              <IconSearch size={16} />
              <span className="cmdp-label">Go to &ldquo;{trimmed}&rdquo;</span>
              <kbd>↵</kbd>
            </div>
          )}

          {filtered.map((cmd, i) => {
            const idx = i + (showGoTo ? 1 : 0)
            return (
              <div
                key={cmd.id}
                className={`cmdp-item${selected === idx ? ' selected' : ''}`}
                onMouseEnter={() => setSelected(idx)}
                onClick={cmd.run}
              >
                {cmd.icon}
                <span className="cmdp-label">{cmd.label}</span>
                <span className="cmdp-hint">{cmd.hint}</span>
              </div>
            )
          })}

          {!filtered.length && !showGoTo && (
            <div className="cmdp-empty">No results</div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { IconSearch, IconPlus, IconHistory, IconBookmark, IconSettings } from './Icons'

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
}

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  onNewTab,
  onNinja
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

  const baseCommands: Command[] = [
    {
      id: 'new-tab',
      label: 'New Tab',
      hint: 'Ctrl+T',
      icon: <IconPlus size={16} />,
      run: () => {
        onNewTab()
        onClose()
      }
    },
    {
      id: 'ninja',
      label: 'New Ninja Window',
      hint: 'Ctrl+Shift+N',
      icon: <span style={{ fontSize: 16, lineHeight: 1 }}>🥷</span>,
      run: () => {
        onNinja()
        onClose()
      }
    },
    {
      id: 'history',
      label: 'Open History',
      hint: 'Coming Stage 6',
      icon: <IconHistory size={16} />,
      run: onClose
    },
    {
      id: 'bookmarks',
      label: 'Open Bookmarks',
      hint: 'Coming Stage 6',
      icon: <IconBookmark size={16} />,
      run: onClose
    },
    {
      id: 'settings',
      label: 'Open Settings',
      hint: 'Coming Stage 8',
      icon: <IconSettings size={16} />,
      run: onClose
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

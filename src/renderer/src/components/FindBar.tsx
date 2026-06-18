import React, { useEffect, useRef, useState } from 'react'
import { IconClose, IconBack, IconForward } from './Icons'

interface Props {
  visible: boolean
  matches: { current: number; total: number } | null
  onSearch: (query: string, forward: boolean) => void
  onNext: (forward: boolean) => void
  onClose: () => void
}

export default function FindBar({
  visible, matches, onSearch, onNext, onClose
}: Props): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 20)
    } else {
      setQuery('')
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => onSearch(query, true), 100)
    return () => clearTimeout(t)
  }, [query, visible, onSearch])

  if (!visible) return null

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (query) onNext(!e.shiftKey)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="findbar">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in page"
        spellCheck={false}
      />
      <span className="findbar-count">
        {matches && query
          ? matches.total > 0
            ? `${matches.current} / ${matches.total}`
            : 'No matches'
          : ''}
      </span>
      <button
        className="findbar-btn"
        onClick={() => onNext(false)}
        disabled={!query || !matches?.total}
        title="Previous (Shift+Enter)"
      >
        <IconBack size={13} />
      </button>
      <button
        className="findbar-btn"
        onClick={() => onNext(true)}
        disabled={!query || !matches?.total}
        title="Next (Enter)"
      >
        <IconForward size={13} />
      </button>
      <button
        className="findbar-btn"
        onClick={onClose}
        title="Close (Esc)"
      >
        <IconClose size={13} />
      </button>
    </div>
  )
}

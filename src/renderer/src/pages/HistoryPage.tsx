import React, { useEffect, useState } from 'react'
import { IconHistory, IconClose, IconSearch } from '../components/Icons'
import type { HistoryEntry } from '../types'

interface Props {
  onNavigate: (url: string) => void
}

export default function HistoryPage({ onNavigate }: Props): React.ReactElement {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [query, setQuery] = useState('')

  const load = (): void => {
    const fn = query.trim()
      ? window.aura.history.search(query.trim())
      : window.aura.history.all(500)
    fn.then(setEntries)
  }

  useEffect(load, [query])

  const handleDelete = async (url: string): Promise<void> => {
    await window.aura.history.delete(url)
    load()
  }

  const handleClearAll = async (): Promise<void> => {
    if (!confirm('Clear all browsing history? This cannot be undone.')) return
    await window.aura.history.clear()
    load()
  }

  return (
    <div className="data-page">
      <header className="data-header">
        <div className="data-header-title">
          <IconHistory size={24} />
          <div>
            <h1>History</h1>
            <p>{entries.length} entries</p>
          </div>
        </div>
        <div className="data-header-actions">
          <div className="data-search">
            <IconSearch size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history…"
              spellCheck={false}
            />
          </div>
          <button className="data-danger-btn" onClick={handleClearAll}>
            Clear all
          </button>
        </div>
      </header>

      <div className="data-list">
        {entries.length === 0 ? (
          <div className="data-empty">No history entries yet. Start browsing to see your history.</div>
        ) : (
          entries.map((entry) => (
            <HistoryRow key={entry.url} entry={entry} onNavigate={onNavigate} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  )
}

function HistoryRow({
  entry,
  onNavigate,
  onDelete
}: {
  entry: HistoryEntry
  onNavigate: (url: string) => void
  onDelete: (url: string) => void
}): React.ReactElement {
  const date = new Date(entry.visitedAt)
  const dateStr = date.toLocaleString()
  let hostname = entry.url
  try { hostname = new URL(entry.url).hostname.replace(/^www\./, '') } catch {}

  return (
    <div className="data-row">
      <button className="data-row-main" onClick={() => onNavigate(entry.url)}>
        <div className="data-row-title">{entry.title || entry.url}</div>
        <div className="data-row-meta">
          <span>{hostname}</span>
          <span className="data-row-sep">·</span>
          <span>{dateStr}</span>
          {entry.visitCount > 1 && (
            <>
              <span className="data-row-sep">·</span>
              <span>{entry.visitCount} visits</span>
            </>
          )}
        </div>
      </button>
      <button className="data-row-delete" onClick={() => onDelete(entry.url)} title="Delete">
        <IconClose size={14} />
      </button>
    </div>
  )
}

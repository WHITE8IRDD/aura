import React, { useEffect, useState } from 'react'
import type { ReadingItem } from '../types'
import { IconClose } from '../components/Icons'

interface Props {
  onNavigate: (url: string) => void
}

export default function ReadingListPage({ onNavigate }: Props): React.ReactElement {
  const [items, setItems] = useState<ReadingItem[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const load = (): void => {
    window.aura.readingList.list(filter).then(setItems)
  }

  useEffect(() => {
    load()
    return window.aura.readingList.onUpdate(load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  return (
    <div className="data-page">
      <header className="data-header">
        <div className="data-header-title">
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <div>
            <h1>Reading List</h1>
            <p>{items.length} {filter}</p>
          </div>
        </div>
        <div className="data-header-actions">
          <div className="folder-pills">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button key={f}
                className={`folder-pill${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="data-btn" onClick={() => window.aura.readingList.clearRead()}>
            Clear read
          </button>
        </div>
      </header>

      <div className="data-list">
        {items.length === 0 ? (
          <div className="data-empty">
            Your reading list is empty. Click the reading-list icon in the address bar to save pages for later.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={`data-row reading-row${item.readAt ? ' read' : ''}`}>
              <input
                type="checkbox"
                className="reading-check"
                checked={!!item.readAt}
                onChange={(e) => window.aura.readingList.markRead(item.id, e.target.checked)}
                title={item.readAt ? 'Mark unread' : 'Mark read'}
              />
              <button className="data-row-main" onClick={() => onNavigate(item.url)}>
                <div className="data-row-title">{item.title}</div>
                {item.excerpt && (
                  <div className="reading-excerpt">{item.excerpt}</div>
                )}
                <div className="data-row-meta">
                  <span>{item.url}</span>
                  <span className="data-row-sep">&middot;</span>
                  <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                </div>
              </button>
              <button
                className="data-row-delete"
                onClick={() => window.aura.readingList.delete(item.id)}
                title="Remove"
              >
                <IconClose size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

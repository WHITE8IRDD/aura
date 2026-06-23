import React, { useState } from 'react'
import { TabState } from '../types'

interface VerticalTabSearchProps {
  tabs: TabState[]
  onSelectTab: (id: number) => void
}

export function VerticalTabSearch({ tabs, onSelectTab }: VerticalTabSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filtered = query.trim()
    ? tabs.filter(t =>
        (t.title || '').toLowerCase().includes(query.toLowerCase()) ||
        (t.url || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : []

  const handleSelect = (id: number) => {
    onSelectTab(id)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="v-tab-search">
      <input
        className="v-tab-search-input"
        type="text"
        placeholder="Search tabs..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {isOpen && filtered.length > 0 && (
        <div className="v-tab-search-results">
          {filtered.map(tab => (
            <button
              key={tab.id}
              className="v-tab-search-result-item"
              onClick={() => handleSelect(tab.id)}
            >
              {tab.favicon && (
                <img src={tab.favicon} alt="" width="14" height="14" />
              )}
              <span>{tab.title || tab.url}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

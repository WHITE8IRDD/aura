import React from 'react'
import type { TabState } from '../types'
import { IconClose, IconPlus } from './Icons'

interface Props {
  tabs: TabState[]
  activeId: number | null
  onSelect: (id: number) => void
  onClose: (id: number) => void
  onNew: () => void
  isPrivate?: boolean
}

export default function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  isPrivate
}: Props): React.ReactElement {
  return (
    <div className="tabstrip">
      {isPrivate && (
        <div className="ninja-pill" title="This is a Ninja (private) window">
          <span className="ninja-pill-icon">🥷</span>
          <span className="ninja-pill-label">Ninja</span>
        </div>
      )}
      <div className="tabs-scroll">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            onSelect={onSelect}
            onClose={onClose}
          />
        ))}
        <button className="newtab-btn" onClick={onNew} title="New tab (Ctrl+T)">
          <IconPlus size={14} />
        </button>
      </div>
    </div>
  )
}

interface TabProps {
  tab: TabState
  isActive: boolean
  onSelect: (id: number) => void
  onClose: (id: number) => void
}

function Tab({ tab, isActive, onSelect, onClose }: TabProps): React.ReactElement {
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button === 1) {
      e.preventDefault()
      onClose(tab.id)
    }
  }

  return (
    <div
      className={`tab${isActive ? ' active' : ''}`}
      onClick={() => onSelect(tab.id)}
      onMouseDown={handleMouseDown}
      role="tab"
      aria-selected={isActive}
      title={tab.title || tab.url}
    >
      {tab.loading ? (
        <span className="spinner" aria-label="Loading" />
      ) : tab.favicon ? (
        <img
          className="tab-favicon"
          src={tab.favicon}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <span className="tab-favicon-placeholder" aria-hidden="true" />
      )}

      <span className="tab-title">{tab.title || 'New Tab'}</span>

      <button
        className="tab-close"
        title="Close tab"
        aria-label={`Close ${tab.title || 'tab'}`}
        onClick={(e) => {
          e.stopPropagation()
          onClose(tab.id)
        }}
      >
        <IconClose size={12} />
      </button>
    </div>
  )
}

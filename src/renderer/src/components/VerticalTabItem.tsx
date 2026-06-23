import React, { useState } from 'react'
import { TabState } from '../types'

interface VerticalTabItemProps {
  tab: TabState
  isActive: boolean
  isCollapsed: boolean
  onSelect: () => void
  onClose: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export function VerticalTabItem({
  tab,
  isActive,
  isCollapsed,
  onSelect,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop
}: VerticalTabItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  const displayTitle = tab.title || tab.url || 'New Tab'

  return (
    <div
      className={`v-tab ${isActive ? 'v-tab-active' : ''} ${isCollapsed ? 'v-tab-collapsed' : ''}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title={isCollapsed ? displayTitle : ''}
    >
      <div className="v-tab-favicon">
        {tab.loading ? (
          <div className="v-tab-spinner" />
        ) : tab.favicon ? (
          <img src={tab.favicon} alt="" width="16" height="16" />
        ) : (
          <div className="v-tab-fallback-icon">
            {displayTitle[0]?.toUpperCase() ?? '·'}
          </div>
        )}

        {tab.hasAudio && !tab.muted && (
          <div className="v-tab-audio-badge" />
        )}
      </div>

      {!isCollapsed && (
        <div className="v-tab-title">{displayTitle}</div>
      )}

      {!isCollapsed && isHovered && (
        <button
          className="v-tab-close-btn"
          onClick={handleClose}
          title="Close tab"
        >
          ×
        </button>
      )}
    </div>
  )
}

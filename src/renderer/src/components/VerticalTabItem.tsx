import React, { useState, memo } from 'react'
import { TabState } from '../types'

interface VerticalTabItemProps {
  tab: TabState
  isActive: boolean
  isCollapsed: boolean
  onSelect: (id: number) => void
  onClose: (id: number) => void
  onContextMenu: (e: React.MouseEvent, tab: TabState) => void
  onDragStart?: (e: React.DragEvent, id: number) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, id: number) => void
}

export const VerticalTabItem = memo(function VerticalTabItem({
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

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose(tab.id)
  }

  const handleNativeDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(tab.id))
    e.dataTransfer.setData('application/x-aura-tab-id', String(tab.id))
    if (onDragStart) onDragStart(e, tab.id)
  }

  const displayTitle = tab.title || tab.url || 'New Tab'

  return (
    <div
      className={`v-tab ${isActive ? 'v-tab-active' : ''} ${isCollapsed ? 'v-tab-collapsed' : ''}`}
      onClick={() => onSelect(tab.id)}
      onContextMenu={(e) => onContextMenu(e, tab)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={handleNativeDragStart}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, tab.id)}
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
          onClick={handleCloseClick}
          title="Close tab"
        >
          ×
        </button>
      )}
    </div>
  )
})

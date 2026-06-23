import React, { useState, useRef } from 'react'
import { VerticalTabItem } from './VerticalTabItem'
import { TabState } from '../types'

interface VerticalTabBarProps {
  tabs: TabState[]
  activeId: number | null
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function VerticalTabBar({
  tabs,
  activeId,
  isCollapsed,
  onToggleCollapse
}: VerticalTabBarProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const pinnedTabs = tabs.filter(t => t.pinned)
  const regularTabs = tabs.filter(t => !t.pinned)

  const handleSelect = (id: number) => window.aura.tabs.activate(id)
  const handleClose = (id: number) => window.aura.tabs.close(id)
  const handleNewTab = () => window.aura.tabs.create()

  const handleContextMenu = async (e: React.MouseEvent, tab: TabState): Promise<void> => {
    e.preventDefault()
    const canReopenClosed = await window.aura.tabs.hasClosedTabs()
    const action = await window.aura.tabContextMenu.show({
      tabId: tab.id,
      muted: !!tab.muted,
      pinned: !!tab.pinned,
      inGroup: tab.groupId != null,
      isActive: tab.id === activeId,
      canCloseOthers: tabs.length >= 2,
      canReopenClosed
    })
    if (!action) return
    switch (action.type) {
      case 'new-tab':
        window.aura.tabs.create('aura://newtab')
        break
      case 'reload':
        window.aura.tabs.reload(tab.id)
        break
      case 'mute-toggle':
        window.aura.tabs.mute(tab.id)
        break
      case 'pin-toggle':
        if (tab.pinned) window.aura.tabs.unpin(tab.id)
        else window.aura.tabs.pin(tab.id)
        break
      case 'unload':
        window.aura.tabs.unload(tab.id)
        break
      case 'duplicate':
        window.aura.tabs.duplicate(tab.id)
        break
      case 'bookmark':
        window.aura.bookmarks.add(tab.url, tab.title).catch(() => {})
        break
      case 'close':
        if (tab.pinned) window.aura.tabs.unpin(tab.id)
        window.aura.tabs.close(tab.id)
        break
      case 'close-others':
        tabs.forEach(t => { if (t.id !== tab.id) window.aura.tabs.close(t.id) })
        break
      case 'close-right':
        const idx = tabs.findIndex(t => t.id === tab.id)
        if (idx >= 0) tabs.slice(idx + 1).forEach(t => window.aura.tabs.close(t.id))
        break
    }
  }

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    if (draggingId === null || draggingId === targetId) return
    const targetIndex = tabs.findIndex(t => t.id === targetId)
    if (targetIndex >= 0) {
      window.aura.tabs.reorder(draggingId, targetIndex)
    }
    setDraggingId(null)
  }

  return (
    <div className={`v-tabs-container ${isCollapsed ? 'v-tabs-collapsed' : ''}`}>
      <div className="v-tabs-header">
        <button
          className="v-tabs-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '›' : '‹'}
        </button>
      </div>

      {pinnedTabs.length > 0 && (
        <div className="v-tabs-pinned-section">
          {pinnedTabs.map(tab => (
            <VerticalTabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeId}
              isCollapsed={true}
              onSelect={() => handleSelect(tab.id)}
              onClose={() => handleClose(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
            />
          ))}
          <div className="v-tabs-divider" />
        </div>
      )}

      <div className="v-tabs-list" ref={listRef}>
        {regularTabs.map(tab => (
          <VerticalTabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            isCollapsed={isCollapsed}
            onSelect={() => handleSelect(tab.id)}
            onClose={() => handleClose(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab)}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
          />
        ))}
      </div>

      <div className="v-tabs-footer">
        <button
          className="v-tabs-new-btn"
          onClick={handleNewTab}
          title="New tab"
        >
          {isCollapsed ? '+' : '+ New Tab'}
        </button>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { VerticalTabItem } from './VerticalTabItem'
import { VerticalTabGroup, type TabGroupData } from './VerticalTabGroup'
import { TabOrganizerPanel } from './TabOrganizerPanel'
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
  const [groups, setGroups] = useState<TabGroupData[]>([])
  const [groupsPanelOpen, setGroupsPanelOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const loadGroups = useCallback(async () => {
    try {
      const list = await window.aura.groups.list()
      setGroups(list || [])
    } catch {
      setGroups([])
    }
  }, [])

  useEffect(() => {
    loadGroups()

    const unsubTabs = window.aura.tabs.onUpdate(() => {
      loadGroups()
    })

    const unsubGroups = window.aura.groups.onChanged(() => {
      loadGroups()
    })

    return () => {
      if (typeof unsubTabs === 'function') unsubTabs()
      if (typeof unsubGroups === 'function') unsubGroups()
    }
  }, [loadGroups])

  const pinnedTabs = tabs.filter(t => t.pinned)
  const regularTabs = tabs.filter(t => !t.pinned)

  const groupedTabIds = new Set(groups.flatMap(g => g.tabIds))
  const ungroupedTabs = regularTabs.filter(t => !groupedTabIds.has(t.id))

  const handleSelect = useCallback((id: number) => window.aura.tabs.activate(id), [])
  const handleClose = useCallback((id: number) => window.aura.tabs.close(id), [])
  const handleNewTab = useCallback(() => window.aura.tabs.create(), [])

  const handleContextMenu = useCallback(async (e: React.MouseEvent, tab: TabState): Promise<void> => {
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
      case 'add-to-new-group': {
        const name = prompt('Group name:')?.trim()
        if (!name) break
        const color = '#A6C0F1'
        const group = await window.aura.groups.create(name, color)
        await window.aura.groups.addTab(group.id, tab.id)
        break
      }
      case 'remove-from-group':
        await window.aura.groups.removeTab(tab.id)
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
      case 'close-duplicates':
        window.aura.tabs.closeDuplicates()
        break
      case 'reopen-closed':
        window.aura.tabs.reopenClosed()
        break
    }
  }, [tabs, activeId])

  const handleDragStart = useCallback((e: React.DragEvent, id: number) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    if (draggingId === null || draggingId === targetId) return
    const targetIndex = tabs.findIndex(t => t.id === targetId)
    if (targetIndex >= 0) {
      window.aura.tabs.reorder(draggingId, targetIndex)
    }
    setDraggingId(null)
  }, [draggingId, tabs])

  return (
    <div className={`v-tabs-container ${isCollapsed ? 'v-tabs-collapsed' : ''}`}>
      <div className="v-tabs-header">
        <button
          className="v-tabs-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2 V12 M6 7 L10 4 M6 7 L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {!isCollapsed && (
          <button
            className={`v-tabs-grid-btn ${groupsPanelOpen ? 'v-tabs-grid-btn-active' : ''}`}
            onClick={() => setGroupsPanelOpen(prev => !prev)}
            title="Tab overview"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="4" height="4" rx="1" fill="currentColor"/>
              <rect x="8" y="2" width="4" height="4" rx="1" fill="currentColor"/>
              <rect x="2" y="8" width="4" height="4" rx="1" fill="currentColor"/>
              <rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>

      {groupsPanelOpen ? (
        <TabOrganizerPanel
          groups={groups}
          tabs={tabs}
          onClose={() => setGroupsPanelOpen(false)}
          onCreateGroup={() => window.aura.groups.create('')}
          onRenameGroup={(id, name) => window.aura.groups.rename(id, name)}
          onChangeGroupColor={(id, color) => window.aura.groups.setColor(id, color)}
          onDeleteGroup={(id) => window.aura.groups.delete(id)}
          onRemoveTabFromGroup={(tabId) => window.aura.groups.removeTab(tabId)}
          onSelectTab={(tabId) => {
            window.aura.tabs.activate(tabId)
            setGroupsPanelOpen(false)
          }}
        />
      ) : (
        <>
          {pinnedTabs.length > 0 && (
            <div className="v-tabs-pinned-section">
              {pinnedTabs.map(tab => (
                <VerticalTabItem
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeId}
                  isCollapsed={true}
                  onSelect={handleSelect}
                  onClose={handleClose}
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
              <div className="v-tabs-divider" />
            </div>
          )}

          <div className="v-tabs-list" ref={listRef}>
            {groups.map(group => (
              <VerticalTabGroup
                key={group.id}
                group={group}
                tabs={tabs}
                activeId={activeId}
                onSelectTab={handleSelect}
                onCloseTab={handleClose}
                onTabContextMenu={handleContextMenu}
                onToggleCollapse={() => window.aura.groups.toggleCollapsed(group.id)}
                onRenameGroup={(name) => window.aura.groups.rename(group.id, name)}
                onChangeGroupColor={(color) => window.aura.groups.setColor(group.id, color)}
                onNewTabInGroup={() => {
                  window.aura.tabs.create().then(tabId => {
                    window.aura.groups.addTab(group.id, tabId)
                  })
                }}
                onCloseGroup={() => group.tabIds.forEach(id => window.aura.tabs.close(id))}
                onUngroup={() => group.tabIds.forEach(id => window.aura.groups.removeTab(id))}
                onDeleteGroup={() => window.aura.groups.delete(group.id)}
              />
            ))}

            {ungroupedTabs.map(tab => (
              <VerticalTabItem
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeId}
                isCollapsed={isCollapsed}
                onSelect={handleSelect}
                onClose={handleClose}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
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
        </>
      )}
    </div>
  )
}

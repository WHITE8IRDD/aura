import React, { useState, memo } from 'react'
import { VerticalTabItem } from './VerticalTabItem'
import { GroupContextMenu } from './GroupContextMenu'
import { TabState } from '../types'

export interface TabGroupData {
  id: string
  name: string
  color: string
  collapsed: boolean
  tabIds: number[]
}

interface VerticalTabGroupProps {
  group: TabGroupData
  tabs: TabState[]
  activeId: number | null
  isCollapsed?: boolean
  onSelectTab: (id: number) => void
  onCloseTab: (id: number) => void
  onTabContextMenu: (e: React.MouseEvent, tab: TabState) => void
  onToggleCollapse: () => void
  onRenameGroup: (name: string) => void
  onChangeGroupColor: (color: string) => void
  onNewTabInGroup: () => void
  onCloseGroup: () => void
  onUngroup: () => void
  onDeleteGroup: () => void
}

export const VerticalTabGroup = memo(function VerticalTabGroup({
  group,
  tabs,
  activeId,
  isCollapsed,
  onSelectTab,
  onCloseTab,
  onTabContextMenu,
  onToggleCollapse,
  onRenameGroup,
  onChangeGroupColor,
  onNewTabInGroup,
  onCloseGroup,
  onUngroup,
  onDeleteGroup
}: VerticalTabGroupProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const groupTabs = tabs.filter(t => group.tabIds.includes(t.id))
  const isActiveGroup = group.tabIds.includes(activeId ?? -1)

  const handlePillDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (!isDragOver) setIsDragOver(true)
  }

  const handlePillDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handlePillDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const tabIdStr = e.dataTransfer.getData('application/x-aura-tab-id')
      || e.dataTransfer.getData('text/plain')

    if (!tabIdStr) {
      console.warn('[VerticalTabGroup] No tab ID in drag data')
      return
    }

    const tabId = parseInt(tabIdStr, 10)
    if (isNaN(tabId)) return

    if (group.tabIds.includes(tabId)) return

    window.aura.groups.addTab(group.id, tabId)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ x: rect.right, y: e.clientY })
  }

  return (
    <>
      <div className="v-tab-group">
        <div
          className={`v-tab-group-pill ${isDragOver ? 'v-tab-group-pill-drag-over' : ''} ${isActiveGroup ? 'v-tab-group-pill-active' : ''}`}
          style={{ background: group.color }}
          onContextMenu={handleContextMenu}
          onDragOver={handlePillDragOver}
          onDragLeave={handlePillDragLeave}
          onDrop={handlePillDrop}
        >
          {!isCollapsed && (
            <button
              className="v-tab-group-pill-main"
              onClick={onToggleCollapse}
              title={group.name || 'Tab group'}
            >
              <span className="v-tab-group-pill-name">
                {group.name || ''}
              </span>
            </button>
          )}

          {!isCollapsed && (
            <button
              className="v-tab-group-pill-dots"
              onClick={(e) => {
                e.stopPropagation()
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: rect.left, y: rect.top })
              }}
              title="Group options"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
                <circle cx="7" cy="11" r="1.2" fill="currentColor"/>
              </svg>
            </button>
          )}

          <button
            className="v-tab-group-pill-collapse"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
            title={group.collapsed ? 'Expand group' : 'Collapse group'}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: group.collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease'
              }}
            >
              <path d="M3 7 L6 4 L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {!group.collapsed && (
          <div
            className="v-tab-group-body"
            style={{ '--group-color': group.color } as React.CSSProperties}
          >
            {groupTabs.map(tab => (
              <div key={tab.id} className="v-tab-grouped">
                <VerticalTabItem
                  tab={tab}
                  isActive={tab.id === activeId}
                  isCollapsed={false}
                  onSelect={onSelectTab}
                  onClose={onCloseTab}
                  onContextMenu={onTabContextMenu}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {menuPos && (
        <GroupContextMenu
          groupId={group.id}
          currentName={group.name}
          currentColor={group.color}
          position={menuPos}
          onClose={() => setMenuPos(null)}
          onRename={onRenameGroup}
          onChangeColor={onChangeGroupColor}
          onNewTabInGroup={onNewTabInGroup}
          onCloseGroup={onCloseGroup}
          onUngroup={onUngroup}
          onDeleteGroup={onDeleteGroup}
          onMoveToNewWindow={() => {
            if (window.aura.groups?.moveToNewWindow) {
              window.aura.groups.moveToNewWindow(group.id)
            }
          }}
        />
      )}
    </>
  )
})

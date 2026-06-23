import React, { useState } from 'react'
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

export function VerticalTabGroup({
  group,
  tabs,
  activeId,
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

  const groupTabs = tabs.filter(t => group.tabIds.includes(t.id))

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div className="v-tab-group">
        <div
          className="v-tab-group-header"
          style={{ background: group.color }}
          onContextMenu={handleContextMenu}
          onClick={onToggleCollapse}
        >
          <span className="v-tab-group-name">{group.name || ''}</span>
          <button
            className="v-tab-group-collapse"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
          >
            {group.collapsed ? '⌄' : '⌃'}
          </button>
        </div>

        {!group.collapsed && (
          <div className="v-tab-group-body">
            {groupTabs.map(tab => (
              <div key={tab.id} className="v-tab-grouped">
                <VerticalTabItem
                  tab={tab}
                  isActive={tab.id === activeId}
                  isCollapsed={false}
                  onSelect={() => onSelectTab(tab.id)}
                  onClose={() => onCloseTab(tab.id)}
                  onContextMenu={(e) => onTabContextMenu(e, tab)}
                  onDragStart={() => {}}
                  onDragOver={() => {}}
                  onDrop={() => {}}
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
        />
      )}
    </>
  )
}

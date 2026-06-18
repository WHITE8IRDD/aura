import React, { useEffect, useState } from 'react'
import type { TabState, TabGroup } from '../types'
import { IconClose, IconPlus } from './Icons'
import TabContextMenu, { type ContextMenuItem } from './TabContextMenu'

interface Props {
  tabs: TabState[]
  activeId: number | null
  onSelect: (id: number) => void
  onClose: (id: number) => void
  onNew: () => void
  isPrivate?: boolean
  vertical?: boolean
  onChangeGroup?: (tabId: number, groupId: string | null) => void
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

import NinjaAvatar from './NinjaAvatar'

export default function TabBar({
  tabs, activeId, onSelect, onClose, onNew, isPrivate, vertical, onChangeGroup
}: Props): React.ReactElement {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const handleContextMenu = (e: React.MouseEvent, tab: TabState): void => {
    e.preventDefault()
    e.stopPropagation()

    const items: ContextMenuItem[] = [
      { label: 'New Tab Below', onClick: onNew },
      { separator: true },
      { label: 'Reload Tab', onClick: () => window.aura.tabs.reload(tab.id) },
      {
        label: tab.muted ? 'Unmute Tab' : 'Mute Tab',
        onClick: () => window.aura.tabs.mute(tab.id)
      },
      {
        label: tab.pinned ? 'Unpin Tab' : 'Pin Tab',
        onClick: () => {
          if (tab.pinned) window.aura.tabs.unpin(tab.id)
          else window.aura.tabs.pin(tab.id)
        }
      },
      {
        label: 'Unload Tab',
        onClick: () => window.aura.tabs.unload(tab.id),
        disabled: tab.id === activeId
      },
      { label: 'Duplicate Tab', onClick: () => window.aura.tabs.duplicate(tab.id) },
      { separator: true },
      {
        label: 'Bookmark Tab\u2026',
        onClick: () => window.aura.bookmarks.add(tab.url, tab.title).catch(() => {})
      },
      {
        label: 'Add to New Group\u2026',
        onClick: async () => {
          const name = prompt('Group name:')?.trim()
          if (!name) return
          const color = '#A6C0F1'
          const group = await window.aura.groups.create(name, color)
          await window.aura.groups.addTab(group.id, tab.id)
        }
      },
      {
        label: 'Remove from Group',
        onClick: () => {
          if (onChangeGroup) onChangeGroup(tab.id, null)
          else void window.aura.groups.removeTab(tab.id)
        },
        disabled: !tab.groupId
      },
      { separator: true },
      {
        label: tab.pinned ? 'Unpin and Close' : 'Close Tab',
        onClick: () => {
          if (tab.pinned) window.aura.tabs.unpin(tab.id)
          onClose(tab.id)
        },
        danger: true
      },
      {
        label: 'Close Other Tabs',
        onClick: () => window.aura.tabs.closeOthers(tab.id),
        disabled: tabs.length < 2
      },
      {
        label: 'Close Tabs to the Right',
        onClick: () => window.aura.tabs.closeToRight(tab.id)
      },
      { label: 'Close Duplicate Tabs', onClick: () => window.aura.tabs.closeDuplicates() },
      { separator: true },
      { label: 'Reopen Closed Tab', onClick: () => window.aura.tabs.reopenClosed() }
    ]

    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  return (
    <div className={`tabstrip${vertical ? ' vertical' : ''}`}>
      {isPrivate && !vertical && (
        <div className="ninja-pill" title="This is a Ninja (private) window">
          <span className="ninja-pill-icon"><NinjaAvatar size={14} /></span>
          <span className="ninja-pill-label">Ninja</span>
        </div>
      )}
      <div className={`tabs-scroll${vertical ? ' vertical' : ''}`}>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            vertical={vertical}
            onSelect={onSelect}
            onClose={onClose}
            onContextMenu={handleContextMenu}
          />
        ))}
        <button
          className={`newtab-btn${vertical ? ' vertical' : ''}`}
          onClick={onNew}
          title="New tab (Ctrl+T)"
        >
          <IconPlus size={14} />
        </button>
      </div>

      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

interface TabProps {
  tab: TabState
  isActive: boolean
  vertical?: boolean
  onSelect: (id: number) => void
  onClose: (id: number) => void
  onContextMenu: (e: React.MouseEvent, tab: TabState) => void
}

function Tab({
  tab, isActive, vertical, onSelect, onClose, onContextMenu
}: TabProps): React.ReactElement {
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button === 0) {
      onSelect(tab.id)
    } else if (e.button === 1) {
      if (!tab.pinned) {
        e.preventDefault()
        onClose(tab.id)
      }
    }
  }

  const handleContextMenuLocal = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, tab)
  }

  const classNames = [
    'tab',
    isActive && 'active',
    tab.pinned && 'pinned',
    tab.muted && 'muted',
    tab.sleeping && 'sleeping',
    vertical && 'vertical'
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenuLocal}
      role="tab"
      aria-selected={isActive}
      title={tab.title || tab.url}
    >
      {tab.groupId && (
        <GroupStripe groupId={tab.groupId} />
      )}
      {tab.loading ? (
        <span className="spinner" aria-label="Loading" />
      ) : tab.favicon ? (
        <img className="tab-favicon" src={tab.favicon} alt=""
          onError={(e) => { e.currentTarget.style.display = 'none' }} />
      ) : (
        <span className="tab-favicon-placeholder" aria-hidden="true" />
      )}

      {tab.muted && <span className="tab-muted-indicator" title="Muted">🔇</span>}

      {!tab.pinned && (
        <span className="tab-title">{tab.title || 'New Tab'}</span>
      )}

      {!tab.pinned && (
        <button
          className="tab-close"
          title="Close tab"
          onMouseDown={(e) => {
            e.stopPropagation()
            if (e.button === 0) {
              e.preventDefault()
              onClose(tab.id)
            }
          }}
        >
          <IconClose size={12} />
        </button>
      )}
    </div>
  )
}

function GroupStripe({ groupId }: { groupId: string }): React.ReactElement {
  const [color, setColor] = useState<string>('var(--aura-secondary)')
  useEffect(() => {
    let cancelled = false
    window.aura.groups.list().then((groups: TabGroup[]) => {
      if (cancelled) return
      const g = groups.find((g: TabGroup) => g.id === groupId)
      if (g) setColor(g.color)
    })
    return () => { cancelled = true }
  }, [groupId])
  return <span className="tab-group-stripe" style={{ background: color }} />
}

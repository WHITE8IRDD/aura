import React, { useEffect, useState } from 'react'
import type { TabState, TabGroup } from '../types'
import { IconClose, IconPlus } from './Icons'
import auraFavicon from '../assets/brand/aura-mark-colored.png'

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

import NinjaAvatar from './NinjaAvatar'

export default function TabBar({
  tabs, activeId, onSelect, onClose, onNew, isPrivate, vertical, onChangeGroup
}: Props): React.ReactElement {

  const handleContextMenu = async (e: React.MouseEvent, tab: TabState): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()

    const canReopenClosed = await window.aura.tabs.hasClosedTabs()
    const isSplit = await window.aura.split.isSplit(tab.id)

    const action = await window.aura.tabContextMenu.show({
      tabId: tab.id,
      muted: !!tab.muted,
      pinned: !!tab.pinned,
      inGroup: tab.groupId != null,
      isActive: tab.id === activeId,
      canCloseOthers: tabs.length >= 2,
      canReopenClosed,
      isSplit
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
        if (onChangeGroup) onChangeGroup(tab.id, null)
        else void window.aura.groups.removeTab(tab.id)
        break
      case 'close':
        if (tab.pinned) window.aura.tabs.unpin(tab.id)
        onClose(tab.id)
        break
      case 'close-others':
        window.aura.tabs.closeOthers(tab.id)
        break
      case 'close-right':
        window.aura.tabs.closeToRight(tab.id)
        break
      case 'close-duplicates':
        window.aura.tabs.closeDuplicates()
        break
      case 'reopen-closed':
        window.aura.tabs.reopenClosed()
        break
      case 'open-in-split':
        window.aura.split.open(tab.id, tab.url || 'aura://newtab')
        break
      case 'close-split':
        window.aura.split.close(tab.id)
        break
      case 'swap-panes':
        window.aura.split.toggleFocusedPane(tab.id)
        break
    }
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
  const [hasSplit, setHasSplit] = useState(false)

  useEffect(() => {
    window.aura.split.isSplit(tab.id).then(setHasSplit)
  }, [tab.id])

  useEffect(() => {
    return window.aura.split.onSplitChanged(() => {
      window.aura.split.isSplit(tab.id).then(setHasSplit)
    })
  }, [tab.id])

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
      ) : tab.internal ? (
        <img className="tab-favicon" src={auraFavicon} alt="" />
      ) : (
        <span className="tab-favicon-placeholder" aria-hidden="true" />
      )}

      {hasSplit && (
        <span className="tab-split-badge" title="Split view active">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0" y="0" width="4" height="10" rx="1" fill="currentColor"/>
            <rect x="6" y="0" width="4" height="10" rx="1" fill="currentColor"/>
          </svg>
        </span>
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

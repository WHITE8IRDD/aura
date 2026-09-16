import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { TabState, TabGroup } from '../types'
import { IconClose, IconPlus } from './Icons'
import NinjaAvatar from './NinjaAvatar'
import auraFavicon from '../assets/brand/aura-mark-colored.png'

export default function TabBar(props: any): React.ReactElement {
  const { onSelect, onClose, onNew, isPrivate, vertical, onChangeGroup } = props
  const activeTabId = (props as any).activeTabId ?? (props as any).activeId

  // 1. Order override state — holds the new tab ID order immediately on drop
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null)

  // 2. Clear override once props.tabs catches up from main process
  useEffect(() => {
    if (orderOverride && props.tabs) {
      const propIds = props.tabs.map((t: any) => t.id).join(',')
      const overrideIds = orderOverride.join(',')
      if (propIds === overrideIds) {
        setOrderOverride(null) // Main process has caught up!
      }
    }
  }, [props.tabs, orderOverride])

  // 3. Compute display tabs: apply orderOverride to props.tabs if active
  const displayTabs = useMemo(() => {
    const base = props.tabs || []
    if (!orderOverride) return base

    const map = new Map(base.map((t: any) => [t.id, t]))
    const ordered: any[] = []

    for (const id of orderOverride) {
      const tab = map.get(id)
      if (tab) {
        ordered.push(tab)
        map.delete(id)
      }
    }
    // Append any tabs not in override
    for (const tab of map.values()) {
      ordered.push(tab)
    }
    return ordered
  }, [props.tabs, orderOverride])

  // 4. Derive pinned and unpinned tabs from displayTabs
  const pinnedTabs = useMemo(() => displayTabs.filter((t: any) => t.pinned), [displayTabs])
  const unpinnedTabs = useMemo(() => displayTabs.filter((t: any) => !t.pinned), [displayTabs])

  // 3. Simple, 60fps drag tracking ref
  const dragRef = useRef<{
    active: boolean
    tabId: string | null
    startX: number
    currentX: number
    width: number
    originIndex: number
    isPinned: boolean
    pointerId: number
  }>({
    active: false,
    tabId: null,
    startX: 0,
    currentX: 0,
    width: 36,
    originIndex: 0,
    isPinned: false,
    pointerId: -1,
  })

  // Force re-render during active drag only
  const [, forceRender] = useState(0)
  const bump = (): void => forceRender(n => n + 1)

  const handlePointerDown = useCallback((e: React.PointerEvent, tabId: string, indexInGroup: number, isPinned: boolean) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.tab-close, .tab-close-btn, .tab-audio')) return

    e.preventDefault()
    e.stopPropagation()

    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()

    dragRef.current = {
      active: false,
      tabId,
      startX: e.clientX,
      currentX: e.clientX,
      width: rect.width || 36,
      originIndex: indexInGroup,
      isPinned,
      pointerId: e.pointerId,
    }

    try { el.setPointerCapture(e.pointerId) } catch {}
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.tabId || d.pointerId !== e.pointerId) return

    d.currentX = e.clientX
    const delta = Math.abs(d.currentX - d.startX)

    if (!d.active && delta > 4) {
      d.active = true
    }

    if (d.active) {
      e.preventDefault()
      bump()
    }
  }, [])

  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.tabId) return

    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}

    if (d.active) {
      const deltaX = d.currentX - d.startX
      const shift = Math.round(deltaX / d.width)

      const pinned = displayTabs.filter((t: any) => t.pinned)
      const unpinned = displayTabs.filter((t: any) => !t.pinned)

      let nextTabs = [...displayTabs]

      if (d.isPinned) {
        const from = d.originIndex
        const to = Math.max(0, Math.min(pinned.length - 1, from + shift))
        if (to !== from) {
          const [moved] = pinned.splice(from, 1)
          pinned.splice(to, 0, moved)
          nextTabs = [...pinned, ...unpinned]
        }
      } else {
        const from = d.originIndex
        const to = Math.max(0, Math.min(unpinned.length - 1, from + shift))
        if (to !== from) {
          const [moved] = unpinned.splice(from, 1)
          unpinned.splice(to, 0, moved)
          nextTabs = [...pinned, ...unpinned]
        }
      }

      const nextIds = nextTabs.map((t: any) => t.id)

      // LOCK IN VISUAL ORDER IMMEDIATELY — CANNOT SNAP BACK!
      setOrderOverride(nextIds)

      // Notify parent component if callback exists
      if (typeof (props as any).onReorder === 'function') {
        ;(props as any).onReorder(nextTabs)
      } else if (typeof (props as any).setTabs === 'function') {
        ;(props as any).setTabs(nextTabs)
      }

      // Persist via IPC
      try {
        if ((window as any).aura?.tabs?.reorder) {
          await (window as any).aura.tabs.reorder(nextIds)
        }
      } catch (err) {
        console.error('[TabBar] IPC reorder error:', err)
      }
    } else {
      // Single click -> select tab
      const id = d.tabId
      if (typeof (props as any).onSelect === 'function') {
        ;(props as any).onSelect(id)
      } else if ((window as any).aura?.tabs?.activate) {
        ;(window as any).aura.tabs.activate(id)
      }
    }

    // Reset drag
    dragRef.current = {
      active: false, tabId: null, startX: 0, currentX: 0,
      width: 36, originIndex: 0, isPinned: false, pointerId: -1,
    }
    bump()
  }, [displayTabs, props])

  const getTransform = useCallback((tabId: string, indexInGroup: number, isPinned: boolean): React.CSSProperties => {
    const d = dragRef.current
    if (!d.active || !d.tabId) {
      return { transform: 'translateX(0px)', transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    }

    if (d.isPinned !== isPinned) {
      return { transform: 'translateX(0px)', transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    }

    const deltaX = d.currentX - d.startX

    if (tabId === d.tabId) {
      return {
        transform: 'translateX(' + deltaX + 'px)',
        transition: 'none',
        zIndex: 1000,
        opacity: 0.85,
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        position: 'relative' as const,
      }
    }

    const shift = Math.round(deltaX / d.width)
    if (shift === 0) {
      return { transform: 'translateX(0px)', transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    }

    const from = d.originIndex
    if (shift > 0 && indexInGroup > from && indexInGroup <= from + shift) {
      return {
        transform: 'translateX(-' + d.width + 'px)',
        transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }
    }
    if (shift < 0 && indexInGroup < from && indexInGroup >= from + shift) {
      return {
        transform: 'translateX(' + d.width + 'px)',
        transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }
    }

    return { transform: 'translateX(0px)', transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
  }, [])

  // === CONTEXT MENU HANDLER ===
  const handleContextMenu = useCallback((e: React.MouseEvent, tabId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    const targetId = tabId || dragRef.current.tabId
    if (!targetId) return
    if (typeof (window as any).aura?.tabs?.showContextMenu === 'function') {
      ;(window as any).aura.tabs.showContextMenu(targetId)
    }
  }, [])

  // === TAB BAR CONTAINER: Show grabbing cursor when dragging ===
  const handleBarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.active) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const isDraggingAny = dragRef.current.active

  return (
    <div
      className={'tab-bar-container ' + (isDraggingAny ? 'dragging-active' : '')}
      onPointerDown={handleBarPointerDown}
      style={{ cursor: isDraggingAny ? 'grabbing' : 'default', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {isPrivate && !vertical && (
        <div className="ninja-pill" title="This is a Ninja (private) window">
          <span className="ninja-pill-icon"><NinjaAvatar size={14} /></span>
          <span className="ninja-pill-label">Ninja</span>
        </div>
      )}
      <div className={'tabs-scroll' + (vertical ? ' vertical' : '')}>
        {/* ===== PINNED TABS ===== */}
        <div
          className="pinned-tabs-group"
          style={{
            display: 'flex',
            gap: 2,
            padding: '0 4px',
            alignItems: 'center',
            borderRight: pinnedTabs.length > 0 && unpinnedTabs.length > 0 ? '1px solid var(--aura-border-subtle, rgba(255,255,255,0.08))' : 'none',
            marginRight: pinnedTabs.length > 0 ? 4 : 0,
            WebkitAppRegion: 'no-drag' as any,
          }}
        >
          {pinnedTabs.map((tab: any, index: number) => {
            const dragStyle = getTransform(tab.id, index, true)
            const isDragging = dragRef.current.active && dragRef.current.tabId === tab.id

            return (
              <div
                key={tab.id}
                onPointerDown={(e) => handlePointerDown(e, tab.id, index, true)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if ((window as any).aura?.tabs?.showContextMenu) {
                    ;(window as any).aura.tabs.showContextMenu(tab.id)
                  }
                }}
                className={'tab pinned-tab' + (tab.id === activeTabId ? ' active' : '') + (isDragging ? ' dragging' : '')}
                title={tab.title || tab.url}
                style={{
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  cursor: isDragging ? 'grabbing' : 'default',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                  WebkitAppRegion: 'no-drag' as any,
                  background: tab.id === activeTabId
                    ? 'var(--aura-tab-active-bg, rgba(255,255,255,0.1))'
                    : 'var(--aura-tab-bg, transparent)',
                  ...dragStyle,
                } as React.CSSProperties}
              >
                {/* Show spinner ONLY if tab is genuinely loading, otherwise show Favicon */}
                {tab.loading && !tab.favicon ? (
                  <div className="tab-spinner" style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: '#648cff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                ) : tab.favicon ? (
                  <img
                    src={tab.favicon}
                    alt=""
                    draggable={false}
                    style={{ width: 16, height: 16, borderRadius: 2, pointerEvents: 'none' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: 2, background: 'var(--aura-text-muted, #71717a)', opacity: 0.4 }} />
                )}
              </div>
            )
          })}
        </div>
        {unpinnedTabs.map((tab: any) => {
          return (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              vertical={vertical}
              onSelect={onSelect}
              onClose={onClose}
              onContextMenu={handleContextMenu}
              isDragging={dragRef.current.active}
              dragTabId={dragRef.current.tabId ?? undefined}
            />
          )
        })}
        <button className={'newtab-btn' + (vertical ? ' vertical' : '')} onClick={onNew} title="New tab (Ctrl+T)">
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
  isDragging?: boolean
  dragTabId?: string
}

function Tab({
  tab, isActive, vertical, onSelect, onClose, onContextMenu,
  isDragging, dragTabId
}: TabProps): React.ReactElement {
  const [hasSplit, setHasSplit] = useState(false)

  useEffect(() => { window.aura.split.isSplit(tab.id).then(setHasSplit) }, [tab.id])

  useEffect(() => { return window.aura.split.onSplitChanged(() => { window.aura.split.isSplit(tab.id).then(setHasSplit) }) }, [tab.id])

  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button === 0) { onSelect(tab.id) }
    else if (e.button === 1) {
      if (!tab.pinned) { e.preventDefault(); onClose(tab.id) }
    }
  }

  const handleContextMenuLocal = (e: React.MouseEvent): void => {
    e.preventDefault(); e.stopPropagation(); onContextMenu(e, tab)
  }

  const dragClass = isDragging && dragTabId === tab.id ? ' dragging' : ''
  const baseClass = 'tab' + (isActive ? ' active' : '') + dragClass

  return (
    <div className={baseClass} onMouseDown={handleMouseDown} onContextMenu={handleContextMenuLocal}
      role="tab" aria-selected={isActive} title={tab.title || tab.url}>
      {tab.groupId && <GroupStripe groupId={tab.groupId} />}
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

      {!tab.pinned && <span className="tab-title">{tab.title || 'New Tab'}</span>}

      {!tab.pinned && (
        <button className="tab-close" title="Close tab" onMouseDown={(e) => {
          e.stopPropagation(); if (e.button === 0) { e.preventDefault(); onClose(tab.id) }
        }}>
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
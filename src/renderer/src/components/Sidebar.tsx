import React from 'react'
import Logo from './Logo'
import { IconSidebar } from './Icons'

interface Props {
  collapsed: boolean
  verticalTabsMode: boolean
  width: number
  resizing: boolean
  onToggle: () => void
  onAction: (action: SidebarAction) => void
  onResizeStart: (e: React.MouseEvent) => void
  children?: React.ReactNode
}

export type SidebarAction =
  | 'history'
  | 'bookmarks'
  | 'downloads'
  | 'privacy'
  | 'extensions'
  | 'settings'
  | 'profile'
  | 'verticalTabs'
  | 'readingList'
  | 'boosts'

/**
 * Sidebar — Stage 8.8.
 *
 * Horizontal mode (default, collapsed):
 *   - Aura orb at top (does nothing on click — pure brand)
 *   - "Switch to vertical tabs" icon at the bottom (discoverable toggle)
 *
 * Vertical-tabs mode:
 *   - Aura orb at top
 *   - Tab list in the middle
 *   - "Switch to horizontal tabs" labeled button at the bottom
 *   - Drag-to-resize handle on right edge
 */
export default function Sidebar({
  collapsed,
  verticalTabsMode,
  width,
  resizing,
  onToggle,
  onAction,
  onResizeStart,
  children
}: Props): React.ReactElement {
  const isExpanded = verticalTabsMode || !collapsed

  const style: React.CSSProperties = verticalTabsMode
    ? { width: `${width}px` }
    : {}

  return (
    <aside
      className={[
        'sidebar unified',
        !isExpanded && 'collapsed',
        verticalTabsMode && 'vertical-mode',
        resizing && 'resizing'
      ].filter(Boolean).join(' ')}
      style={style}
      aria-label="Navigation"
    >
      <div className="sidebar-top">
        <button
          className="sidebar-brand"
          onClick={onToggle}
          title={verticalTabsMode ? 'Aura' : 'Toggle expanded sidebar'}
          aria-label="Aura"
        >
          <Logo size={22} />
        </button>
      </div>

      {/* Tabs area only in vertical mode */}
      {verticalTabsMode && (
        <div className="sidebar-tabs-area">
          {children}
        </div>
      )}

      {/* STAGE 8.8: Bottom toggle — ALWAYS visible so users can switch modes */}
      <div className="sidebar-bottom">
        <button
          className="sidebar-item sidebar-vt-toggle"
          onClick={(e) => {
            e.currentTarget.blur()
            onAction('verticalTabs')
          }}
          title={
            verticalTabsMode
              ? 'Switch to horizontal tabs (Ctrl+Shift+E)'
              : 'Switch to vertical tabs (Ctrl+Shift+E)'
          }
          aria-label="Toggle tabs layout"
        >
          <span className="sidebar-icon"><IconSidebar size={16} /></span>
          {isExpanded && (
            <span className="sidebar-label">
              {verticalTabsMode ? 'Horizontal Tabs' : 'Vertical Tabs'}
            </span>
          )}
        </button>
      </div>

      {/* Drag-to-resize handle on the right edge — only in vertical mode */}
      {verticalTabsMode && (
        <div
          className="sidebar-resize-handle"
          onMouseDown={onResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          title="Drag to resize"
        />
      )}
    </aside>
  )
}

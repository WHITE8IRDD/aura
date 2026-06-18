import React from 'react'
import Logo from './Logo'
import {
  IconHistory,
  IconBookmark,
  IconDownload,
  IconShield,
  IconExtension,
  IconSettings,
  IconUser
} from './Icons'

interface Props {
  collapsed: boolean
  onToggle: () => void
  onAction: (action: SidebarAction) => void
}

export type SidebarAction =
  | 'history'
  | 'bookmarks'
  | 'downloads'
  | 'privacy'
  | 'extensions'
  | 'settings'
  | 'profile'
  | 'ninja'

interface NavItem {
  id: SidebarAction
  label: string
  icon: React.ReactElement
}

const TOP_ITEMS: NavItem[] = [
  { id: 'bookmarks', label: 'Bookmarks', icon: <IconBookmark size={17} /> },
  { id: 'history', label: 'History', icon: <IconHistory size={17} /> },
  { id: 'downloads', label: 'Downloads', icon: <IconDownload size={17} /> },
  { id: 'privacy', label: 'Privacy', icon: <IconShield size={17} /> },
  { id: 'ninja', label: 'Ninja Mode', icon: <span style={{ fontSize: 17, lineHeight: 1 }}>🥷</span> },
  { id: 'extensions', label: 'Extensions', icon: <IconExtension size={17} /> }
]

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: <IconSettings size={17} /> },
  { id: 'profile', label: 'Profile', icon: <IconUser size={17} /> }
]

export default function Sidebar({ collapsed, onToggle, onAction }: Props): React.ReactElement {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-top">
        <button
          className="sidebar-brand"
          onClick={onToggle}
          title="Toggle sidebar (Ctrl+B)"
          aria-label="Toggle sidebar"
        >
          <Logo size={24} />
        </button>

        <nav className="sidebar-nav">
          {TOP_ITEMS.map((item) => (
            <SidebarButton
              key={item.id}
              item={item}
              collapsed={collapsed}
              onAction={onAction}
            />
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        {BOTTOM_ITEMS.map((item) => (
          <SidebarButton
            key={item.id}
            item={item}
            collapsed={collapsed}
            onAction={onAction}
          />
        ))}
      </div>
    </aside>
  )
}

function SidebarButton({
  item,
  collapsed,
  onAction
}: {
  item: NavItem
  collapsed: boolean
  onAction: (a: SidebarAction) => void
}): React.ReactElement {
  return (
    <button
      className="sidebar-item"
      onClick={(e) => {
        e.currentTarget.blur()
        onAction(item.id)
      }}
      title={item.label}
      aria-label={item.label}
    >
      <span className="sidebar-icon">{item.icon}</span>
      {!collapsed && <span className="sidebar-label">{item.label}</span>}
    </button>
  )
}

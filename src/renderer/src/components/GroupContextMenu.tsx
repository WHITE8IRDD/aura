import React, { useState, useEffect, useRef } from 'react'

interface GroupContextMenuProps {
  groupId: string
  currentName: string
  currentColor: string
  position: { x: number; y: number }
  onClose: () => void
  onRename: (name: string) => void
  onChangeColor: (color: string) => void
  onNewTabInGroup: () => void
  onCloseGroup: () => void
  onUngroup: () => void
  onDeleteGroup: () => void
}

const GROUP_COLORS = [
  { name: 'grey', value: '#9ca3af' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'red', value: '#ef4444' },
  { name: 'yellow', value: '#eab308' },
  { name: 'green', value: '#10b981' },
  { name: 'pink', value: '#ec4899' },
  { name: 'purple', value: '#8b5cf6' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'orange', value: '#f97316' },
]

export function GroupContextMenu({
  groupId,
  currentName,
  currentColor,
  position,
  onClose,
  onRename,
  onChangeColor,
  onNewTabInGroup,
  onCloseGroup,
  onUngroup,
  onDeleteGroup
}: GroupContextMenuProps) {
  const [name, setName] = useState(currentName)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleNameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onRename(name)
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      className="group-context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 99999
      }}
    >
      <input
        className="group-name-input"
        type="text"
        placeholder="Name this group"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name !== currentName && onRename(name)}
        onKeyDown={handleNameSubmit}
        autoFocus
      />

      <div className="group-color-swatches">
        {GROUP_COLORS.map(color => (
          <button
            key={color.name}
            className={`group-color-swatch ${currentColor === color.value ? 'group-color-active' : ''}`}
            style={{ background: color.value }}
            onClick={() => onChangeColor(color.value)}
            title={color.name}
          />
        ))}
      </div>

      <div className="group-menu-divider" />

      <button
        className="group-menu-item"
        onClick={() => { onNewTabInGroup(); onClose() }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M7 4 V10 M4 7 H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span>New tab in group</span>
        <span className="group-menu-shortcut">Alt+Shift+C</span>
      </button>

      <button
        className="group-menu-item"
        onClick={() => { onCloseGroup(); onClose() }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 5 L9 9 M9 5 L5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span>Close group</span>
        <span className="group-menu-shortcut">Alt+Shift+W</span>
      </button>

      <div className="group-menu-divider" />

      <button
        className="group-menu-item"
        onClick={() => { onUngroup(); onClose() }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7 H11 M3 4 H11 M3 10 H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span>Ungroup</span>
      </button>

      <button
        className="group-menu-item group-menu-item-danger"
        onClick={() => { onDeleteGroup(); onClose() }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 4 H11 M5 4 V11 M9 4 V11 M4 4 V2 H10 V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Delete group</span>
      </button>
    </div>
  )
}

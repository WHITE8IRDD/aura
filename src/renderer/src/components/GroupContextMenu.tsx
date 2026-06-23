import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

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
  onMoveToNewWindow?: () => void
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
  onDeleteGroup,
  onMoveToNewWindow
}: GroupContextMenuProps) {
  const [name, setName] = useState(currentName)
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState(position)

  useEffect(() => {
    setName(currentName)
  }, [currentName])

  useEffect(() => {
    if (!menuRef.current) return

    const raf = requestAnimationFrame(() => {
      if (!menuRef.current) return

      const rect = menuRef.current.getBoundingClientRect()
      const menuWidth = rect.width || 260
      const menuHeight = rect.height || 400
      const vw = window.innerWidth
      const vh = window.innerHeight

      let x = position.x - menuWidth - 8

      if (x < 8) {
        x = 8
      }

      let y = position.y
      if (y + menuHeight > vh - 8) {
        y = vh - menuHeight - 8
      }
      if (y < 8) y = 8

      setAdjustedPos({ x, y })
    })

    return () => cancelAnimationFrame(raf)
  }, [position])

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

  const handleNameBlur = () => {
    if (name !== currentName) {
      onRename(name)
    }
  }

  return createPortal(
    <div
      ref={menuRef}
      className="gcm-menu"
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 99999,
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto'
      }}
    >
      <input
        className="gcm-name-input"
        type="text"
        placeholder="Name this group"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleNameBlur}
        onKeyDown={handleNameSubmit}
        autoFocus
      />

      <div className="gcm-color-row">
        {GROUP_COLORS.map(color => (
          <button
            key={color.name}
            className={`gcm-color-dot ${currentColor === color.value ? 'gcm-color-dot-active' : ''}`}
            style={{ background: color.value }}
            onClick={() => onChangeColor(color.value)}
            title={color.name}
            aria-label={color.name}
          />
        ))}
      </div>

      <div className="gcm-divider" />

      <button
        className="gcm-item"
        onClick={() => { onNewTabInGroup(); onClose() }}
      >
        <span className="gcm-item-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 5 V11 M5 8 H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="gcm-item-label">New tab in group</span>
        <span className="gcm-item-shortcut">Alt+Shift+C</span>
      </button>

      {onMoveToNewWindow && (
        <button
          className="gcm-item"
          onClick={() => { onMoveToNewWindow(); onClose() }}
        >
          <span className="gcm-item-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10 6 L13 6 V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M12 12 L10 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="gcm-item-label">Move group to new window</span>
        </button>
      )}

      <button
        className="gcm-item"
        onClick={() => { onCloseGroup(); onClose() }}
      >
        <span className="gcm-item-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M6 6 L10 10 M10 6 L6 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="gcm-item-label">Close group</span>
        <span className="gcm-item-shortcut">Alt+Shift+W</span>
      </button>

      <div className="gcm-divider" />

      <button
        className="gcm-item"
        onClick={() => { onUngroup(); onClose() }}
      >
        <span className="gcm-item-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 5 L7 5 M3 8 L9 8 M3 11 L7 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M11 4 L14 7 L11 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="gcm-item-label">Ungroup</span>
      </button>

      <button
        className="gcm-item gcm-item-danger"
        onClick={() => { onDeleteGroup(); onClose() }}
      >
        <span className="gcm-item-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4 H13 M5.5 4 V12 M10.5 4 V12 M5 4 V2 H11 V4 M4 4 V13 H12 V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="gcm-item-label">Delete group</span>
      </button>
    </div>,
    document.body
  )
}

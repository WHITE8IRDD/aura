import React, { useEffect, useRef, useState } from 'react'

interface MenuItem {
  label: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  separator?: false
  submenu?: SubmenuItem[]
  checked?: boolean
}

interface Separator { separator: true }

interface SubmenuItem {
  label: string
  onClick: () => void
  checked?: boolean
}

export type BookmarkMenuItem = MenuItem | Separator

interface Props {
  x: number
  y: number
  items: BookmarkMenuItem[]
  onClose: () => void
}

export default function BookmarkContextMenu({
  x, y, items, onClose
}: Props): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null)

  useEffect(() => {
    void window.aura.layout.hideView()
    return () => {
      void window.aura.layout.showView()
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const MENU_WIDTH = 240
  const ITEM_HEIGHT = 30
  const SEP_HEIGHT = 9
  const estHeight =
    items.reduce((acc, it) => acc + ('separator' in it ? SEP_HEIGHT : ITEM_HEIGHT), 0) + 8

  const adjustedX = Math.min(x, window.innerWidth - MENU_WIDTH - 10)
  const adjustedY = Math.min(y, window.innerHeight - estHeight - 10)

  return (
    <div
      ref={ref}
      className="bm-ctx"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if ('separator' in item) {
          return <div key={i} className="bm-ctx-sep" />
        }
        const hasSubmenu = !!item.submenu && item.submenu.length > 0
        return (
          <div
            key={i}
            className="bm-ctx-row"
            onMouseEnter={() => hasSubmenu && setOpenSubmenu(i)}
            onMouseLeave={() => hasSubmenu && setOpenSubmenu(null)}
          >
            <button
              className={[
                'bm-ctx-item',
                item.danger && 'danger',
                item.disabled && 'disabled',
                hasSubmenu && 'has-submenu'
              ].filter(Boolean).join(' ')}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled || hasSubmenu) return
                item.onClick?.()
                onClose()
              }}
            >
              <span className="bm-ctx-check">
                {item.checked ? '\u2713' : ''}
              </span>
              <span className="bm-ctx-label">{item.label}</span>
              {hasSubmenu && <span className="bm-ctx-arrow">{'\u203A'}</span>}
            </button>

            {hasSubmenu && openSubmenu === i && (
              <div className="bm-ctx-submenu">
                {item.submenu!.map((sub, j) => (
                  <button
                    key={j}
                    className="bm-ctx-item"
                    onClick={() => {
                      sub.onClick()
                      onClose()
                    }}
                  >
                    <span className="bm-ctx-check">{sub.checked ? '\u2713' : ''}</span>
                    <span className="bm-ctx-label">{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

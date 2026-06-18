import React, { useEffect, useRef } from 'react'

interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  separator?: false
}

interface Separator {
  separator: true
}

export type ContextMenuItem = MenuItem | Separator

interface Props {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function TabContextMenu({
  x, y, items, onClose
}: Props): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

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

  const MENU_WIDTH = 220
  const ITEM_HEIGHT = 30
  const SEP_HEIGHT = 9
  const estHeight =
    items.reduce((acc, it) => acc + ('separator' in it ? SEP_HEIGHT : ITEM_HEIGHT), 0) + 8

  const adjustedX = Math.min(x, window.innerWidth - MENU_WIDTH - 10)
  const adjustedY = Math.min(y, window.innerHeight - estHeight - 10)

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if ('separator' in item) {
          return <div key={i} className="ctx-menu-sep" />
        }
        return (
          <button
            key={i}
            className={[
              'ctx-menu-item',
              item.danger && 'danger',
              item.disabled && 'disabled'
            ].filter(Boolean).join(' ')}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              item.onClick()
              onClose()
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

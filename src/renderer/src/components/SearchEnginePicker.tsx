import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getEngineIcon } from './SearchEngineIcons'

type EngineId = 'google' | 'duckduckgo' | 'brave' | 'startpage'

interface Engine {
  id: EngineId
  name: string
  hostname: string
}

const ENGINES: Engine[] = [
  { id: 'google',     name: 'Google',       hostname: 'google.com'     },
  { id: 'duckduckgo', name: 'DuckDuckGo',   hostname: 'duckduckgo.com' },
  { id: 'brave',      name: 'Brave Search', hostname: 'search.brave.com' },
  { id: 'startpage',  name: 'Startpage',    hostname: 'startpage.com'  }
]

interface Props {
  current: EngineId
  onChange: (engine: EngineId) => void
}

export default function SearchEnginePicker({
  current, onChange
}: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const currentEngine = ENGINES.find((e) => e.id === current) ?? ENGINES[0]

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPopoverPos({
      left: Math.round(rect.left),
      top: Math.round(rect.bottom + 4)
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      const target = e.target as Node
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="search-engine-btn"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title={`Search with ${currentEngine.name} — click to switch`}
        tabIndex={-1}
      >
        {getEngineIcon(currentEngine.id, 16)}
      </button>

      {open && popoverPos && (
        <div
          ref={popoverRef}
          className="search-engine-popover-compact"
          style={{ left: popoverPos.left, top: popoverPos.top }}
        >
          {ENGINES.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`search-engine-compact-btn${e.id === current ? ' active' : ''}`}
              onClick={(ev) => {
                ev.stopPropagation()
                onChange(e.id)
                setOpen(false)
              }}
              title={e.name}
            >
              {getEngineIcon(e.id, 18)}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

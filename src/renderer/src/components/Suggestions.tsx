import React, { useEffect, useState } from 'react'
import { IconHistory, IconSearch, IconForward } from './Icons'
import type { Suggestion } from '../types'

interface Props {
  items: Suggestion[]
  selectedIndex: number
  onHover: (index: number) => void
  onSelect: (item: Suggestion) => void
}

export default function Suggestions({
  items,
  selectedIndex,
  onHover,
  onSelect
}: Props): React.ReactElement | null {
  if (!items.length) return null

  return (
    <div className="suggestions" role="listbox">
      {items.map((item, i) => (
        <SuggestionRow
          key={`${item.type}-${item.url}-${i}`}
          item={item}
          active={i === selectedIndex}
          onMouseEnter={() => onHover(i)}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  )
}

interface RowProps {
  item: Suggestion
  active: boolean
  onMouseEnter: () => void
  onClick: () => void
}

function SuggestionRow({ item, active, onMouseEnter, onClick }: RowProps): React.ReactElement {
  const [localFavicon, setLocalFavicon] = useState<string | null>(null)

  useEffect(() => {
    if (item.type !== 'history') return
    let cancelled = false
    window.aura.favicons.fetch(item.url).then((data) => {
      if (!cancelled && data) setLocalFavicon(data)
    })
    return () => {
      cancelled = true
    }
  }, [item.url, item.type])

  const fallbackIcon = (() => {
    if (item.type === 'history') return <IconHistory size={14} />
    if (item.type === 'search') return <IconSearch size={14} />
    return <IconForward size={14} />
  })()

  const leadingIcon = localFavicon ? (
    <img
      className="suggestion-favicon"
      src={localFavicon}
      alt=""
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  ) : (
    <span className="suggestion-icon">{fallbackIcon}</span>
  )

  return (
    <div
      className={`suggestion${active ? ' active' : ''}`}
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {leadingIcon}
      <span className="suggestion-label">{item.label}</span>
      {item.hint && <span className="suggestion-hint">{item.hint}</span>}
    </div>
  )
}

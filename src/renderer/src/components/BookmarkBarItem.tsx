import React, { useEffect, useState } from 'react'
import type { Bookmark } from '../types'

interface Props {
  bookmark: Bookmark
  isDropTarget: boolean
  isDragging: boolean
  onNavigate: (url: string) => void
  onContextMenu: (e: React.MouseEvent, bookmark: Bookmark) => void
  onDragStart: (e: React.DragEvent, bookmark: Bookmark) => void
  onDragOver: (e: React.DragEvent, bookmark: Bookmark) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, bookmark: Bookmark) => void
  onDragEnd: () => void
}

const SEPARATOR_URL = 'aura://separator'

export default function BookmarkBarItem({
  bookmark, isDropTarget, isDragging,
  onNavigate, onContextMenu,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd
}: Props): React.ReactElement {
  const [favicon, setFavicon] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const isSeparator = bookmark.url === SEPARATOR_URL

  useEffect(() => {
    if (isSeparator) return
    let cancelled = false
    window.aura.favicons.fetch(bookmark.url)
      .then((data) => {
        if (cancelled) return
        if (data) setFavicon(data)
        else setFailed(true)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => { cancelled = true }
  }, [bookmark.url, isSeparator])

  if (isSeparator) {
    return (
      <div
        className={`bm-separator${isDropTarget ? ' drop-target' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, bookmark)}
        onDragOver={(e) => onDragOver(e, bookmark)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, bookmark)}
        onDragEnd={onDragEnd}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(e, bookmark)
        }}
      />
    )
  }

  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button === 0) {
      onNavigate(bookmark.url)
    } else if (e.button === 1) {
      e.preventDefault()
      window.aura.tabs.create(bookmark.url)
    }
  }

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, bookmark)
  }

  const className = [
    'bm-item',
    isDragging && 'dragging',
    isDropTarget && 'drop-target'
  ].filter(Boolean).join(' ')

  return (
    <button
      className={className}
      draggable
      onDragStart={(e) => onDragStart(e, bookmark)}
      onDragOver={(e) => onDragOver(e, bookmark)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, bookmark)}
      onDragEnd={onDragEnd}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      title={`${bookmark.title}\n${bookmark.url}`}
    >
      {favicon && !failed ? (
        <img className="bm-favicon" src={favicon} alt=""
          onError={() => setFailed(true)} />
      ) : (
        <span className="bm-favicon-placeholder" aria-hidden="true" />
      )}
      <span className="bm-label">{bookmark.title}</span>
    </button>
  )
}

import React, { useEffect, useState, useRef } from 'react'
import './MediaHub.css'

interface MediaTab {
  id: number
  title: string
  url: string
  audible: boolean
  muted: boolean
  playing: boolean
}

export const MediaHub: React.FC = () => {
  const [tabs, setTabs] = useState<MediaTab[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)

  const refresh = async () => {
    try {
      const list = await window.aura.media.getActiveTabs()
      setTabs(list)
    } catch {
      setTabs([])
    }
  }

  useEffect(() => {
    refresh()
    const unsub = window.aura.media.onStateChanged(() => refresh())
    const interval = setInterval(refresh, 5000)
    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [])

  const handleClick = async () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    await window.aura.media.openPopoverWindow({
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    })
  }

  if (tabs.length === 0) return null

  const playingCount = tabs.filter(t => t.playing).length

  return (
    <button
      ref={buttonRef}
      className={`util-btn media-hub-btn ${playingCount > 0 ? 'active' : ''}`}
      onClick={handleClick}
      title={playingCount > 0
        ? `${playingCount} tab${playingCount === 1 ? '' : 's'} playing audio`
        : 'Media controls'}
      aria-label="Media controls"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round"
           strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
      {tabs.length > 1 && (
        <span className="media-hub-badge">{tabs.length}</span>
      )}
    </button>
  )
}

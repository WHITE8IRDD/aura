// src/renderer/src/components/SplitOverlay.tsx
// V2 — Fixes: X button, favicon, pane border

import React, { useCallback, useEffect, useRef, useState } from 'react'
import '../styles/split-view.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SplitState {
  ratio: number
  focusedPane: 'primary' | 'split'
  splitUrl: string
}

interface SplitOverlayProps {
  tabId: number
  primaryUrl: string
  splitState: SplitState
  onRatioChange?: (ratio: number) => void
  onFocusChange?: (pane: 'primary' | 'split') => void
  onClose?: (pane: 'primary' | 'split') => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIVIDER_W  = 8
const PANE_INSET = 2
const MIN_RATIO  = 0.2
const MAX_RATIO  = 0.8

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Google favicon service — far more reliable than fetching /favicon.ico directly
function faviconSrc(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ─── PillBadge ────────────────────────────────────────────────────────────────

interface PillBadgeProps {
  url: string
  pane: 'primary' | 'split'
  onClose: (pane: 'primary' | 'split') => void
}

const PillBadge: React.FC<PillBadgeProps> = ({ url, pane, onClose }) => {
  const [faviconError, setFaviconError] = useState(false)
  const domain = domainFromUrl(url)
  const favicon = faviconSrc(url)

  // FIX BUG 1: onMouseDown fires before parent pane click, stopPropagation prevents pane focus
  const handleCloseMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onClose(pane)
    },
    [pane, onClose]
  )

  return (
    <div className="sv-pill">
      {/* FIX BUG 2: Google favicon service instead of /favicon.ico */}
      {!faviconError && favicon ? (
        <img
          src={favicon}
          alt=""
          className="sv-pill-favicon"
          onError={() => setFaviconError(true)}
          draggable={false}
        />
      ) : (
        <div className="sv-pill-favicon-fallback" />
      )}

      <span className="sv-pill-domain">{domain}</span>

      <button
        className="sv-pill-close"
        onMouseDown={handleCloseMouseDown}
        aria-label={`Close ${pane === 'primary' ? 'left' : 'right'} pane`}
        title="Close pane"
        type="button"
      >
        ×
      </button>
    </div>
  )
}

// ─── SplitOverlay ─────────────────────────────────────────────────────────────

const SplitOverlay: React.FC<SplitOverlayProps> = ({
  tabId,
  primaryUrl,
  splitState,
  onRatioChange,
  onFocusChange,
  onClose,
}) => {
  const containerRef   = useRef<HTMLDivElement>(null)
  const isDragging     = useRef(false)
  const dragStartX     = useRef(0)
  const dragStartRatio = useRef(splitState.ratio)

  const [ratio,    setRatio]    = useState(splitState.ratio)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setRatio(splitState.ratio)
  }, [splitState.ratio])

  // ── Divider drag ───────────────────────────────────────────────────────────

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current     = true
      dragStartX.current     = e.clientX
      dragStartRatio.current = ratio
      setDragging(true)
    },
    [ratio]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect       = containerRef.current.getBoundingClientRect()
      const totalWidth = rect.width - DIVIDER_W - PANE_INSET * 2
      const dx         = e.clientX - dragStartX.current
      const dRatio     = dx / totalWidth
      const newRatio   = Math.min(MAX_RATIO, Math.max(MIN_RATIO, dragStartRatio.current + dRatio))
      setRatio(newRatio)
      onRatioChange?.(newRatio)
      window.aura?.split?.setRatio(tabId, newRatio)
    }
    const onMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setDragging(false)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [tabId, onRatioChange])

  // ── Pane focus ─────────────────────────────────────────────────────────────

  const handlePaneMouseDown = useCallback(
    (pane: 'primary' | 'split') => {
      onFocusChange?.(pane)
      window.aura?.split?.setFocusedPane(tabId, pane)
    },
    [tabId, onFocusChange]
  )

  // ── Close pane ─────────────────────────────────────────────────────────────

  // FIX BUG 1: typeof guard so we don't crash if closeLeftView/closeRightView
  // don't exist — falls back to window.aura.split.close(tabId)
  const handleClose = useCallback(
    (pane: 'primary' | 'split') => {
      onClose?.(pane)
      if (pane === 'primary') {
        if (typeof window.aura?.split?.closeLeftView === 'function') {
          window.aura.split.closeLeftView(tabId)
        } else {
          window.aura.split.close(tabId)
        }
      } else {
        if (typeof window.aura?.split?.closeRightView === 'function') {
          window.aura.split.closeRightView(tabId)
        } else {
          window.aura.split.close(tabId)
        }
      }
    },
    [tabId, onClose]
  )

  const leftIsActive  = splitState.focusedPane === 'primary'
  const rightIsActive = splitState.focusedPane === 'split'

  return (
    <div
      ref={containerRef}
      className="sv-root"
      style={{ '--sv-ratio': ratio } as React.CSSProperties}
    >
      {/* LEFT PANE FRAME */}
      <div
        className={`sv-pane sv-pane-left${leftIsActive ? ' sv-pane-active' : ' sv-pane-inactive'}`}
        onMouseDown={() => handlePaneMouseDown('primary')}
      >
        <div className="sv-badge-strip">
          <PillBadge url={primaryUrl} pane="primary" onClose={handleClose} />
        </div>
      </div>

      {/* DIVIDER */}
      <div
        className={`sv-divider${dragging ? ' sv-divider-dragging' : ''}`}
        onMouseDown={handleDividerMouseDown}
        aria-hidden="true"
      />

      {/* RIGHT PANE FRAME */}
      <div
        className={`sv-pane sv-pane-right${rightIsActive ? ' sv-pane-active' : ' sv-pane-inactive'}`}
        onMouseDown={() => handlePaneMouseDown('split')}
      >
        <div className="sv-badge-strip">
          <PillBadge url={splitState.splitUrl} pane="split" onClose={handleClose} />
        </div>
      </div>
    </div>
  )
}

export default SplitOverlay

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  tabId: number | null
}

export function SplitOverlay({ tabId }: Props) {
  const [ratio, setRatio] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const [focusedPane, setFocusedPane] = useState<'primary' | 'split'>('primary')
  const [primaryUrl, setPrimaryUrl] = useState('')
  const [splitUrl, setSplitUrl] = useState('')
  const [leftInput, setLeftInput] = useState('')
  const [rightInput, setRightInput] = useState('')
  const [isSplit, setIsSplit] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (tabId === null) { setIsSplit(false); return }
    window.aura.split.getState(tabId).then((state) => {
      if (!state) { setIsSplit(false); return }
      setIsSplit(true)
      setRatio(state.ratio)
      setFocusedPane(state.focusedPane)
      setSplitUrl(state.splitUrl)
      setRightInput(state.splitUrl)
    })
  }, [tabId])

  useEffect(() => {
    if (tabId === null) return
    return window.aura.split.onSplitChanged(() => {
      window.aura.split.getState(tabId).then((state) => {
        if (!state) { setIsSplit(false); return }
        setRatio(state.ratio)
        setFocusedPane(state.focusedPane)
        setSplitUrl(state.splitUrl)
      })
    })
  }, [tabId])

  useEffect(() => {
    window.aura.tabs.getState().then((s) => {
      const tab = s.tabs.find((t: any) => t.id === tabId)
      if (tab) {
        setPrimaryUrl(tab.url || '')
        setLeftInput(tab.url || '')
      }
    })
  }, [tabId])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    if (tabId === null) return
    e.preventDefault()
    setIsDragging(true)

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect()
        const newRatio = (moveEvent.clientX - rect.left) / rect.width
        const clamped = Math.min(0.85, Math.max(0.15, newRatio))
        setRatio(clamped)
        window.aura.split.setRatio(tabId, clamped)
      })
    }

    const onMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [tabId])

  const handlePaneClick = (pane: 'primary' | 'split') => {
    if (tabId === null) return
    setFocusedPane(pane)
    window.aura.split.setFocusedPane(tabId, pane)
  }

  const handleLeftNavigate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (tabId === null || e.key !== 'Enter') return
    window.aura.split.navigateNonFocused(tabId, leftInput)
  }

  const handleRightNavigate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (tabId === null || e.key !== 'Enter') return
    window.aura.split.navigateFocused(tabId, rightInput)
  }

  if (!isSplit || tabId === null) return null

  return (
    <div
      ref={containerRef}
      className={`split-overlay${isDragging ? ' is-dragging' : ''}`}
    >
      {/* LEFT PANE */}
      <div
        className={`split-pane split-pane-primary${focusedPane === 'primary' ? ' split-pane-focused' : ''}`}
        style={{ width: `${ratio * 100}%` }}
        onClick={() => handlePaneClick('primary')}
      >
        <div className="split-pane-toolbar">
          <button
            className="split-nav-btn"
            onClick={() => window.aura.tabs.goBack(tabId)}
          >←</button>
          <button
            className="split-nav-btn"
            onClick={() => window.aura.tabs.goForward(tabId)}
          >→</button>
          <input
            className="split-address-input"
            value={leftInput}
            onChange={(e) => setLeftInput(e.target.value)}
            onKeyDown={handleLeftNavigate}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* DIVIDER */}
      <div
        className={`split-divider${isDragging ? ' split-divider-dragging' : ''}`}
        onMouseDown={handleDividerMouseDown}
      >
        <div className="split-divider-handle" />
      </div>

      {/* RIGHT PANE */}
      <div
        className={`split-pane split-pane-split${focusedPane === 'split' ? ' split-pane-focused' : ''}`}
        style={{ flex: 1 }}
        onClick={() => handlePaneClick('split')}
      >
        <div className="split-pane-toolbar">
          <button
            className="split-nav-btn"
            onClick={(e) => {
              e.stopPropagation()
              window.aura.split.navigateFocused(tabId, 'back')
            }}
          >←</button>
          <button
            className="split-nav-btn"
            onClick={(e) => {
              e.stopPropagation()
              window.aura.split.navigateFocused(tabId, 'forward')
            }}
          >→</button>
          <input
            className="split-address-input"
            value={rightInput}
            onChange={(e) => setRightInput(e.target.value)}
            onKeyDown={handleRightNavigate}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  )
}

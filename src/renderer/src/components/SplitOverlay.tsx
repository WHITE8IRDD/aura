import React, { useCallback, useEffect, useRef, useState } from 'react'

interface SplitInfo {
  tabId: number
  splitUrl: string
  focusedPane: 'primary' | 'split'
  ratio: number
}

interface Props {
  activeId: number | null
}

const CHROME_HEIGHT = 80
const DIVIDER_W = 8
const PANE_GAP = 6
const PANE_RADIUS = 10
const PANE_INSET = 2

export default function SplitOverlay({ activeId }: Props): React.ReactElement {
  const [split, setSplit] = useState<SplitInfo | null>(null)
  const [dragging, setDragging] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef(false)

  useEffect(() => {
    if (activeId === null) { setSplit(null); return }
    window.aura.split.getState(activeId).then((s) => setSplit(s as SplitInfo | null))
  }, [activeId])

  useEffect(() => {
    return window.aura.split.onSplitChanged(() => {
      if (activeId === null) { setSplit(null); return }
      window.aura.split.getState(activeId).then((s) => setSplit(s as SplitInfo | null))
    })
  }, [activeId])

  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      if (!dragRef.current || !overlayRef.current || !activeId) return
      const rect = overlayRef.current.getBoundingClientRect()
      const sidebar = document.querySelector('.sidebar')
      const sidebarWidth = sidebar?.getBoundingClientRect().width ?? 0
      const relX = e.clientX - rect.left - sidebarWidth
      const avail = rect.width - sidebarWidth
      if (avail <= 0) return
      let ratio = relX / avail
      ratio = Math.max(0.15, Math.min(0.85, ratio))
      window.aura.split.setRatio(activeId, ratio)
    }
    const onUp = (): void => {
      if (dragRef.current) {
        dragRef.current = false
        setDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [activeId])

  const startDrag = useCallback((e: React.MouseEvent): void => {
    e.preventDefault()
    dragRef.current = true
    setDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const resetRatio = useCallback((): void => {
    if (!activeId) return
    window.aura.split.setRatio(activeId, 0.5)
  }, [activeId])

  const focusLeft = useCallback((): void => {
    if (!activeId) return
    window.aura.split.setFocusedPane(activeId, 'primary')
  }, [activeId])

  const focusRight = useCallback((): void => {
    if (!activeId) return
    window.aura.split.setFocusedPane(activeId, 'split')
  }, [activeId])

  const closeSplit = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation()
    if (!activeId) return
    window.aura.split.close(activeId)
    setSplit(null)
  }, [activeId])

  if (!split) return null

  const ratio = split.ratio
  const focusedLeft = split.focusedPane === 'primary'
  const focusedRight = split.focusedPane === 'split'

  return (
    <div
      ref={overlayRef}
      className={`split-overlay ${dragging ? 'is-dragging' : ''}`}
      style={{ top: CHROME_HEIGHT }}
    >
      {/* LEFT pane frame */}
      <div
        className={`split-pane left-pane ${focusedLeft ? 'focused' : ''}`}
        style={{
          width: `calc(${ratio * 100}% - ${DIVIDER_W / 2}px)`,
          padding: `${PANE_GAP}px 0 ${PANE_GAP}px ${PANE_GAP}px`
        }}
        onMouseDown={focusLeft}
      >
        <div
          className="split-pane-inner"
          style={{ borderRadius: PANE_RADIUS }}
        />
        <div className="split-pane-controls">
          <button
            className="split-control-btn split-control-close"
            title="Close split view"
            onClick={closeSplit}
          >
            ✕
          </button>
        </div>
      </div>

      {/* DIVIDER */}
      <div
        className="split-divider"
        style={{ width: DIVIDER_W }}
        onMouseDown={startDrag}
        onDoubleClick={resetRatio}
        title="Drag to resize  ·  Double-click to reset"
      >
        <div className="split-divider-track" />
        <div className="split-divider-grip">
          <span /><span /><span />
        </div>
      </div>

      {/* RIGHT pane frame */}
      <div
        className={`split-pane right-pane ${focusedRight ? 'focused' : ''}`}
        style={{
          width: `calc(${(1 - ratio) * 100}% - ${DIVIDER_W / 2}px)`,
          padding: `${PANE_GAP}px ${PANE_GAP}px ${PANE_GAP}px 0`
        }}
        onMouseDown={focusRight}
      >
        <div
          className="split-pane-inner"
          style={{ borderRadius: PANE_RADIUS }}
        />
        <div className="split-pane-controls">
          <button
            className="split-control-btn split-control-close"
            title="Close split view"
            onClick={closeSplit}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

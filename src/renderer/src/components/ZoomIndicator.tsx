import React from 'react'

interface Props {
  factor: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export default function ZoomIndicator({
  factor, onZoomIn, onZoomOut, onReset
}: Props): React.ReactElement | null {
  if (factor === 1.0 || !Number.isFinite(factor)) return null

  const pct = Math.round(factor * 100)

  return (
    <div className="zoom-indicator" role="group" aria-label="Zoom controls">
      <button className="zoom-btn" onClick={onZoomOut} title="Zoom out (Ctrl+-)">−</button>
      <button
        className="zoom-pct"
        onClick={onReset}
        title="Reset to 100% (Ctrl+0)"
      >
        {pct}%
      </button>
      <button className="zoom-btn" onClick={onZoomIn} title="Zoom in (Ctrl+=)">+</button>
    </div>
  )
}

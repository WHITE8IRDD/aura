import React, { useCallback, useRef, useState } from 'react'
import NewsWidget from './NewsWidget'
import StickyNoteWidget from './StickyNoteWidget'
import StockTickerWidget from './StockTickerWidget'
import PrivacyStatsWidget from './PrivacyStatsWidget'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { DEFAULT_WIDGETS, type WidgetConfig } from './types'

interface Props {
  onNavigate: (url: string) => void
  editing: boolean
}

export default function WidgetGrid({ onNavigate, editing }: Props): React.ReactElement {
  const [widgets, setWidgets] = useLocalStorage<WidgetConfig[]>(
    'aura:widgets:v1',
    DEFAULT_WIDGETS
  )
  const [dragId, setDragId] = useState<string | null>(null)
  const dragOverRef = useRef<string | null>(null)

  const handleDragStart = useCallback(
    (id: string) => (e: React.DragEvent) => {
      if (!editing) {
        e.preventDefault()
        return
      }
      setDragId(id)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    },
    [editing]
  )

  const handleDragOver = useCallback(
    (id: string) => (e: React.DragEvent) => {
      if (!dragId || !editing) return
      e.preventDefault()
      dragOverRef.current = id
    },
    [dragId, editing]
  )

  const handleDrop = useCallback(
    (id: string) => (e: React.DragEvent) => {
      e.preventDefault()
      if (!dragId || dragId === id) return
      setWidgets((prev) => {
        const fromIdx = prev.findIndex((w) => w.id === dragId)
        const toIdx = prev.findIndex((w) => w.id === id)
        if (fromIdx === -1 || toIdx === -1) return prev
        const copy = [...prev]
        const [moved] = copy.splice(fromIdx, 1)
        copy.splice(toIdx, 0, moved)
        return copy
      })
      setDragId(null)
    },
    [dragId, setWidgets]
  )

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    dragOverRef.current = null
  }, [])

  const renderWidget = (w: WidgetConfig): React.ReactElement => {
    const handlers = {
      onDragStart: handleDragStart(w.id),
      onDragOver: handleDragOver(w.id),
      onDrop: handleDrop(w.id),
      onDragEnd: handleDragEnd
    }

    switch (w.type) {
      case 'news':
        return (
          <NewsWidget
            key={w.id}
            size={w.size}
            onNavigate={onNavigate}
            dragHandlers={handlers}
          />
        )
      case 'sticky':
        return (
          <StickyNoteWidget key={w.id} id={w.id} size={w.size} dragHandlers={handlers} />
        )
      case 'stocks':
        return <StockTickerWidget key={w.id} size={w.size} dragHandlers={handlers} />
      case 'privacy':
        return <PrivacyStatsWidget key={w.id} size={w.size} dragHandlers={handlers} />
    }
  }

  return (
    <div className={`widget-grid${editing ? ' editing' : ''}${dragId ? ' dragging' : ''}`}>
      {widgets.map(renderWidget)}
    </div>
  )
}

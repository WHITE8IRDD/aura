import React from 'react'
import WidgetCard from './WidgetCard'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  id: string
  size: 1 | 2 | 3
  dragHandlers?: {
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
}

export default function StickyNoteWidget({
  id,
  size,
  dragHandlers
}: Props): React.ReactElement {
  const [text, setText] = useLocalStorage<string>(`sticky:${id}`, '')

  return (
    <WidgetCard
      title="Sticky Note"
      subtitle="Saved automatically"
      size={size}
      draggable
      {...dragHandlers}
    >
      <textarea
        className="sticky-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot something down&hellip;"
        spellCheck
      />
    </WidgetCard>
  )
}

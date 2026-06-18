import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  initial: number
  min: number
  max: number
  onChange?: (width: number) => void
  onCommit?: (width: number) => void
}

interface Result {
  width: number
  setWidth: (w: number) => void
  startDrag: (e: React.MouseEvent) => void
  isDragging: boolean
}

export function useResize({ initial, min, max, onChange, onCommit }: Options): Result {
  const [width, setWidthState] = useState(initial)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startWRef = useRef(initial)
  const currentRef = useRef(initial)

  useEffect(() => { currentRef.current = width }, [width])

  const setWidth = useCallback((w: number) => {
    const clamped = Math.max(min, Math.min(max, w))
    setWidthState(clamped)
    currentRef.current = clamped
    onChange?.(clamped)
  }, [min, max, onChange])

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    startWRef.current = currentRef.current
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent): void => {
      const delta = e.clientX - startXRef.current
      const next = Math.max(min, Math.min(max, startWRef.current + delta))
      setWidthState(next)
      currentRef.current = next
      onChange?.(next)
    }

    const handleUp = (): void => {
      setIsDragging(false)
      onCommit?.(currentRef.current)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, min, max, onChange, onCommit])

  return { width, setWidth, startDrag, isDragging }
}

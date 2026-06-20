import React, { useEffect, useRef, useState, useCallback } from 'react'

interface SelectionData {
  text: string
  x: number
  y: number
}

interface Props {
  onClose: () => void
}

export default function TranslatorPopover({ onClose }: Props): React.ReactElement {
  const [data, setData] = useState<SelectionData | null>(null)
  const [result, setResult] = useState<{
    translatedText: string
    detectedLang?: string
    engine: string
    error?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = window.aura.translator.onSelectionRequest((d) => {
      setData(d)
      setResult(null)
      setLoading(true)
      setVisible(true)

      window.aura.translator.translate(d.text).then((res) => {
        setResult(res)
        setLoading(false)
      })
    })
    return cleanup
  }, [])

  const handleCopy = useCallback(() => {
    if (result?.translatedText) {
      navigator.clipboard.writeText(result.translatedText)
    }
  }, [result])

  const handleClose = useCallback(() => {
    setVisible(false)
    setData(null)
    setResult(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!visible) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKey)
    setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('click', handleClick)
    }
  }, [visible, handleClose])

  if (!visible || !data) return <></>

  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(data.x, window.innerWidth - 340),
    top: data.y + 12,
    zIndex: 99999
  }

  return (
    <div ref={popoverRef} className="translator-popover" style={popoverStyle}>
      <div className="translator-header">
        <span className="translator-lang-badge">
          {result?.detectedLang ? result.detectedLang.toUpperCase() : '...'}
          {' \u2192 '}
          EN
        </span>
        <button className="translator-close" onClick={handleClose} title="Close">
          &times;
        </button>
      </div>
      <div className="translator-body">
        {loading && <div className="translator-spinner" />}
        {!loading && result && (
          <p className="translator-text">{result.translatedText}</p>
        )}
        {!loading && result?.error && (
          <p className="translator-error">{result.error}</p>
        )}
      </div>
      <div className="translator-footer">
        <button className="translator-btn" onClick={handleCopy} disabled={!result?.translatedText}>
          Copy
        </button>
      </div>
    </div>
  )
}

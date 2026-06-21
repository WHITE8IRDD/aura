import React, { useEffect, useState, useCallback } from 'react'
import './TranslatorPopover.css'

export const TranslatorPopoverContent: React.FC = () => {
  const [text, setText] = useState<string | null>(null)
  const [result, setResult] = useState<{
    translatedText: string
    detectedLang?: string
    engine: string
    error?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsub = window.aura.popover.onSetText((t: string) => {
      setText(t)
      setResult(null)
      setLoading(true)
      setCopied(false)

      window.aura.translator.translate(t).then((res) => {
        setResult(res)
        setLoading(false)
      }).catch((err) => {
        console.error('[TranslatorPopover] translate error', err)
        setLoading(false)
      })
    })
    return unsub
  }, [])

  const handleCopy = useCallback(() => {
    if (result?.translatedText) {
      navigator.clipboard.writeText(result.translatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result])

  const handleClose = useCallback(() => {
    window.aura.popover.close()
  }, [])

  return (
    <div className="tx-popover">
      <header className="tx-header">
        <div className="tx-lang-badge">
          <span className="tx-lang-from">
            {result?.detectedLang ? result.detectedLang.toUpperCase() : '...'}
          </span>
          <svg className="tx-lang-arrow" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span className="tx-lang-to">EN</span>
        </div>
        <button className="tx-close" onClick={handleClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <div className="tx-body">
        {loading && (
          <div className="tx-loading">
            <div className="tx-spinner" />
            <span>Translating...</span>
          </div>
        )}
        {!loading && result?.error && (
          <div className="tx-error">{result.error}</div>
        )}
        {!loading && result && !result.error && (
          <p className="tx-text">{result.translatedText}</p>
        )}
      </div>

      {!loading && !result?.error && result && (
        <button className="tx-copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy translation
            </>
          )}
        </button>
      )}
    </div>
  )
}

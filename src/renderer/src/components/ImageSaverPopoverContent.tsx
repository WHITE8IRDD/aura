import React, { useEffect, useState, useCallback } from 'react'
import './ImageSaverPopover.css'

type Format = 'png' | 'jpg'

interface PopoverData {
  srcURL?: string
  batchMode: boolean
  sourceWcId?: number
}

export const ImageSaverPopoverContent: React.FC = () => {
  const [data, setData] = useState<PopoverData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsub = window.aura.popover.onSetData((d: PopoverData) => {
      setData(d)
      setError(null)
    })
    return unsub
  }, [])

  const handleClose = useCallback(() => {
    window.aura.popover.close()
  }, [])

  const handleSave = useCallback(
    async (format: Format, quality: number) => {
      if (!data) return
      setSaving(true)
      setError(null)
      try {
        if (data.batchMode) {
          const result = await window.aura.imageSaver.batchSavePage(format, quality)
          if (result.success) {
            window.aura.popover.close()
          } else if (result.error) {
            setError(result.error)
          }
        } else if (data.srcURL) {
          const result = await window.aura.imageSaver.saveWithFormat(
            data.srcURL,
            format,
            quality,
            data.sourceWcId
          )
          if (result.success) {
            window.aura.popover.close()
          } else if (result.error) {
            setError(result.error)
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Save failed')
      } finally {
        setSaving(false)
      }
    },
    [data]
  )

  const handleCopy = useCallback(async () => {
    if (!data?.srcURL) return
    setSaving(true)
    setError(null)
    try {
      const ok = await window.aura.imageSaver.copyToClipboard(data.srcURL, data.sourceWcId)
      if (ok) {
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
          window.aura.popover.close()
        }, 800)
      }
    } catch (err: any) {
      setError(err?.message || 'Copy failed')
    } finally {
      setSaving(false)
    }
  }, [data])

  if (!data) {
    return (
      <div className="is-popover">
        <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
          Waiting...
        </p>
      </div>
    )
  }

  return (
    <div className="is-popover">
      <header className="is-header">
        <h2 className="is-title">{data.batchMode ? 'Save all images' : 'Save image'}</h2>
        <button className="is-close" onClick={handleClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      {error && <div className="is-error">{error}</div>}


      <div className="is-section">
        <div className="is-section-title">Format</div>
        <button
          className="is-format-btn"
          onClick={() => handleSave('png', 100)}
          disabled={saving}
        >
          <span className="is-format-label">PNG</span>
          <span className="is-format-sub">Lossless</span>
        </button>
      </div>

      <div className="is-section">
        <div className="is-section-title">JPG Quality</div>
        <div className="is-quality-grid">
          {[100, 92, 85, 80, 75].map(q => (
            <button
              key={q}
              className="is-quality-btn"
              onClick={() => handleSave('jpg', q)}
              disabled={saving}
            >
              {q}%
            </button>
          ))}
        </div>
      </div>

      <div className="is-divider" />

      <button
        className="is-copy-btn"
        onClick={handleCopy}
        disabled={saving || !data.srcURL}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        {copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      </button>

      {saving && (
        <div className="is-saving-overlay">
          <div className="is-spinner" />
          <span>Saving...</span>
        </div>
      )}
    </div>
  )
}

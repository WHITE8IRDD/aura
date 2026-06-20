import React, { useEffect, useRef, useState, useCallback } from 'react'

type Format = 'png' | 'jpg'

interface SingleData {
  srcURL: string
  x: number
  y: number
}

interface Props {
  onClose: () => void
}

const FORMATS: { label: string; format: Format; quality: number }[] = [
  { label: 'PNG', format: 'png', quality: 100 },
  { label: 'JPG 100%', format: 'jpg', quality: 100 },
  { label: 'JPG 92%', format: 'jpg', quality: 92 },
  { label: 'JPG 85%', format: 'jpg', quality: 85 },
  { label: 'JPG 80%', format: 'jpg', quality: 80 },
  { label: 'JPG 75%', format: 'jpg', quality: 75 },
]

export default function ImageSaverPopover({ onClose }: Props): React.ReactElement {
  const [singleData, setSingleData] = useState<SingleData | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanupOpen = window.aura.imageSaver.onOpen((d) => {
      setSingleData(d)
      setBatchMode(false)
      setVisible(true)
      setStatus(null)
    })
    const cleanupBatch = window.aura.imageSaver.onOpenBatch(() => {
      setSingleData(null)
      setBatchMode(true)
      setVisible(true)
      setStatus(null)
    })
    return () => {
      cleanupOpen()
      cleanupBatch()
    }
  }, [])

  const handleSave = useCallback(
    async (format: Format, quality: number) => {
      if (batchMode) {
        setSaving(true)
        setStatus('Saving all images...')
        const result = await window.aura.imageSaver.batchSavePage(format, quality)
        setSaving(false)
        if (result.success) {
          setStatus(`Saved ${result.count} images to ${result.folder}`)
        } else {
          setStatus(result.error || 'Failed')
        }
      } else if (singleData) {
        setSaving(true)
        setStatus('Saving...')
        const result = await window.aura.imageSaver.saveWithFormat(singleData.srcURL, format, quality)
        setSaving(false)
        if (result.success) {
          handleClose()
        } else {
          setStatus(result.error || 'Failed')
        }
      }
    },
    [batchMode, singleData]
  )

  const handleCopy = useCallback(async () => {
    if (!singleData) return
    const ok = await window.aura.imageSaver.copyToClipboard(singleData.srcURL)
    if (ok) {
      handleClose()
    } else {
      setStatus('Copy failed')
    }
  }, [singleData])

  const handleClose = useCallback(() => {
    setVisible(false)
    setSingleData(null)
    setBatchMode(false)
    setStatus(null)
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

  if (!visible) return <></>

  const popoverStyle: React.CSSProperties = singleData
    ? {
        position: 'fixed',
        left: Math.min(singleData.x, window.innerWidth - 280),
        top: singleData.y + 12,
        zIndex: 99999
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 99999
      }

  return (
    <div ref={popoverRef} className="image-saver-popover" style={popoverStyle}>
      <div className="imgfmt-header">
        <strong>{batchMode ? 'Save all images' : 'Save image with options'}</strong>
        <button className="translator-close" onClick={handleClose} title="Close">
          &times;
        </button>
      </div>
      <div className="imgfmt-grid">
        {FORMATS.map((f) => (
          <button
            key={f.label}
            className="imgfmt-btn"
            onClick={() => handleSave(f.format, f.quality)}
            disabled={saving}
          >
            {f.label}
          </button>
        ))}
      </div>
      {!batchMode && singleData && (
        <div className="imgfmt-footer">
          <button className="imgfmt-btn imgfmt-copy" onClick={handleCopy} disabled={saving}>
            Copy
          </button>
        </div>
      )}
      {status && <p className="imgfmt-status">{status}</p>}
    </div>
  )
}

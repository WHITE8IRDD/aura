import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './ResetConfirmModal.css'

interface Props {
  open: boolean
  title: string
  description: string
  confirmWord?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export const ResetConfirmModal: React.FC<Props> = ({
  open,
  title,
  description,
  confirmWord = 'RESET',
  confirmLabel = 'Reset',
  danger = true,
  onConfirm,
  onCancel
}) => {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTyped('')
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  const canConfirm = typed.trim().toUpperCase() === confirmWord.toUpperCase()

  const handleConfirm = async () => {
    if (!canConfirm || busy) return
    setBusy(true)
    await onConfirm()
    setBusy(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="reset-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
          />
          <motion.div
            className="reset-modal"
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          >
            <div className={`reset-modal-icon ${danger ? 'danger' : ''}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <h2 className="reset-modal-title">{title}</h2>
            <p className="reset-modal-description">{description}</p>

            <div className="reset-modal-confirm">
              <label className="reset-modal-label">
                Type <span className="reset-modal-word">{confirmWord}</span> to confirm
              </label>
              <input
                ref={inputRef}
                type="text"
                className="reset-modal-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canConfirm) handleConfirm()
                }}
                placeholder={confirmWord}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="reset-modal-actions">
              <button className="reset-modal-btn" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button
                className={`reset-modal-btn ${danger ? 'danger' : 'primary'}`}
                onClick={handleConfirm}
                disabled={!canConfirm || busy}
              >
                {busy ? 'Resetting\u2026' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

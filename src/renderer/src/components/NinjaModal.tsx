import React, { useEffect } from 'react'
import NinjaAvatar from './NinjaAvatar'

interface Props {
  open: boolean
  onClose: () => void
  onLaunch: () => void
}

export default function NinjaModal({
  open, onClose, onLaunch
}: Props): React.ReactElement | null {
  useEffect(() => {
    if (!open) return
    void window.aura.layout.hideView()
    return () => { void window.aura.layout.showView() }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="ninja-modal-backdrop" onClick={onClose} />
      <div className="ninja-modal-v2" role="dialog" aria-labelledby="ninja-title">
        <button
          className="ninja-modal-close"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="ninja-modal-avatar">
          <NinjaAvatar size={48} />
        </div>

        <h2 id="ninja-title" className="ninja-modal-h2">Ninja Mode</h2>

        <div className="ninja-modal-body">
          <p>
            Your privacy is important to us. When using &ldquo;Ninja&rdquo; mode, you
            can be sure that your browsing history, cookies, and site data, as
            well as any information entered into forms, will not be saved. This
            ensures that other users of this device will not be able to view
            your actions.
          </p>
          <p>
            However, please note that your online activity may still be visible
            to the websites you visit, your organization, or your internet
            provider.
          </p>
          <p>
            <strong>Please note:</strong> While your browsing remains private, all bookmarks
            you create will be saved.
          </p>
        </div>

        <div className="ninja-modal-buttons">
          <button
            className="ninja-modal-btn-secondary"
            onClick={() => { onLaunch() }}
            autoFocus={false}
          >
            Enable
          </button>
          <button
            className="ninja-modal-btn-primary"
            onClick={onClose}
            autoFocus
          >
            Disable
          </button>
        </div>
      </div>
    </>
  )
}

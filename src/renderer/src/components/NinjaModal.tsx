import React from 'react'

interface Props {
  open: boolean
  onEnable: () => void
  onCancel: () => void
}

export default function NinjaModal({
  open,
  onEnable,
  onCancel
}: Props): React.ReactElement | null {
  if (!open) return null

  return (
    <div className="ninja-modal-overlay" onClick={onCancel}>
      <div className="ninja-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ninja-modal-icon">🥷</div>
        <h2 className="ninja-modal-title">Ninja Mode</h2>
        <p className="ninja-modal-desc">
          Browse without saving anything — Aura won&apos;t remember your activity.
        </p>

        <div className="ninja-modal-cols">
          <div className="ninja-modal-col saved">
            <div className="ninja-modal-col-title">What IS saved</div>
            <ul className="ninja-modal-list">
              <li>Downloads you keep</li>
              <li>Bookmarks you create</li>
            </ul>
          </div>
          <div className="ninja-modal-col notsaved">
            <div className="ninja-modal-col-title">What is NOT saved</div>
            <ul className="ninja-modal-list">
              <li>Browsing history</li>
              <li>Cookies &amp; site data</li>
              <li>Form &amp; search entries</li>
              <li>Session state</li>
            </ul>
          </div>
        </div>

        <div className="ninja-modal-actions">
          <button className="ninja-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="ninja-modal-launch" onClick={onEnable}>
            Enable Ninja Mode
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import './DefaultBrowserSection.css'

export const DefaultBrowserSection: React.FC = () => {
  const [status, setStatus] = useState<{
    isFullDefault: boolean
    platform: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  const loadStatus = async () => {
    const s = await window.aura.defaultBrowser.getStatus()
    setStatus(s)
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleSetDefault = async () => {
    setBusy(true)
    setMessage(null)

    const result = await window.aura.defaultBrowser.setAsDefault()
    await loadStatus()

    if (result.success) {
      const newStatus = await window.aura.defaultBrowser.getStatus()
      if (newStatus.isFullDefault) {
        setMessage({ type: 'success', text: 'Aura is now your default browser ✓' })
      } else {
        setMessage({
          type: 'info',
          text:
            'Windows needs you to confirm. Click "Open Windows Settings" below, then select Aura under Web browser.'
        })
      }
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Could not set Aura as default'
      })
    }

    setBusy(false)
    setTimeout(() => setMessage(null), 10000)
  }

  const handleOpenSettings = async () => {
    await window.aura.defaultBrowser.openSystemSettings()
  }

  const handleRecheck = async () => {
    setBusy(true)
    await loadStatus()
    setBusy(false)
  }

  if (!status) {
    return (
      <div className="settings-section-content">
        <h2>Default browser</h2>
      </div>
    )
  }

  return (
    <div className="settings-section-content">
      <h2>Default browser</h2>

      <div className="setting-card">
        <h3 className="setting-card-title">DEFAULT BROWSER STATUS</h3>

        <div className="dfb-status-block">
          <div
            className={`dfb-status-badge ${status.isFullDefault ? 'is-default' : 'not-default'}`}
          >
            {status.isFullDefault ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Aura is your default browser</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Aura is not your default browser</span>
              </>
            )}
          </div>

          <p className="dfb-description">
            {status.isFullDefault
              ? 'Links from other apps (email, chat, documents) will open in Aura.'
              : 'When you click a link in another app, it currently opens in a different browser. Make Aura your default to open all web links here.'}
          </p>
        </div>

        <div className="dfb-actions">
          {!status.isFullDefault && (
            <button className="dfb-btn primary" onClick={handleSetDefault} disabled={busy}>
              {busy ? 'Setting\u2026' : 'Make Aura my default browser'}
            </button>
          )}

          {status.platform === 'win32' && (
            <button className="dfb-btn" onClick={handleOpenSettings} disabled={busy}>
              Open Windows Settings
            </button>
          )}

          <button className="dfb-btn secondary" onClick={handleRecheck} disabled={busy}>
            {busy ? 'Checking\u2026' : 'Re-check status'}
          </button>
        </div>

        {message && (
          <div className={`dfb-message dfb-${message.type}`}>
            {message.text}
          </div>
        )}
      </div>

      {status.platform === 'win32' && (
        <div className="setting-card">
          <h3 className="setting-card-title">ABOUT WINDOWS DEFAULTS</h3>
          <p className="dfb-info">
            Since Windows 10, Microsoft requires you to confirm default browser
            changes manually in System Settings. Aura will request the change,
            but you'll need to click "Switch anyway" or select Aura yourself
            in the dialog that appears.
          </p>
        </div>
      )}
    </div>
  )
}

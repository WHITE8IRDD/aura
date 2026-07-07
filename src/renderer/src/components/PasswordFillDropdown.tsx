import React, { useState, useEffect, useCallback } from 'react'

interface FillAvailableData {
  origin: string
  count: number
}

interface CredentialRecord {
  id: number
  origin: string
  username: string
}

interface Props {
  activeTabId: number | null
}

const PasswordFillDropdown: React.FC<Props> = ({ activeTabId }) => {
  const [fillData, setFillData] = useState<FillAvailableData | null>(null)
  const [credentials, setCredentials] = useState<CredentialRecord[]>([])
  const [open, setOpen] = useState(false)
  const [filling, setFilling] = useState(false)

  useEffect(() => {
    return window.aura.passwords.onFillAvailable(async (data) => {
      setFillData(data)
      const creds = await window.aura.passwords.getForOrigin(data.origin)
      setCredentials(creds)
      setOpen(true)
    })
  }, [])

  useEffect(() => {
    setOpen(false)
    setFillData(null)
  }, [activeTabId])

  const handleFill = useCallback(async (credId: number) => {
    if (!activeTabId) return
    setFilling(true)
    try {
      const result = await window.aura.passwords.fillIntoPage(activeTabId, credId)
      if (!result.ok) {
        console.warn('Fill rejected:', result.reason)
      }
    } finally {
      setFilling(false)
      setOpen(false)
    }
  }, [activeTabId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
  }, [])

  if (!open || !fillData || credentials.length === 0) return null

  return (
    <div
      className="pwd-fill-dropdown"
      role="dialog"
      aria-label="Saved passwords"
      onKeyDown={handleKeyDown}
    >
      <div className="pwd-fill-header">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M12 1a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3zm0 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
        </svg>
        <span>Saved passwords</span>
        <button className="pwd-fill-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
      </div>
      <div className="pwd-fill-list" role="listbox">
        {credentials.map((cred, idx) => (
          <button
            key={cred.id}
            className="pwd-fill-item"
            role="option"
            tabIndex={idx === 0 ? 0 : -1}
            onClick={() => handleFill(cred.id)}
            disabled={filling}
            aria-label={`Fill credentials for ${cred.username}`}
          >
            <span className="pwd-fill-username">{cred.username}</span>
            <span className="pwd-fill-dots">••••••••</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PasswordFillDropdown

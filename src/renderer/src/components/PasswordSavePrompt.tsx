import React, { useState, useEffect, useCallback } from 'react'

interface SavePromptData {
  origin: string
  username: string
  password: string
  title: string
  isDuplicate: boolean
}

const PasswordSavePrompt: React.FC = () => {
  const [prompt, setPrompt] = useState<SavePromptData | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return window.aura.passwords.onSavePrompt((data) => {
      setPrompt(data)
      setEditUsername(data.username)
      setEditPassword(data.password)
      setShowPassword(false)
      setError(null)
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!prompt) return
    setSaving(true)
    setError(null)
    try {
      const result = await window.aura.passwords.save(
        prompt.origin,
        editUsername,
        editPassword,
        prompt.title
      )
      if (!result.ok) {
        if (result.reason === 'encryption-unavailable') {
          setError('Password encryption is not available on this system.')
        } else {
          setError('Could not save password. Please try again.')
        }
        return
      }
      setPrompt(null)
    } finally {
      setSaving(false)
    }
  }, [prompt, editUsername, editPassword])

  const handleNeverSave = useCallback(async () => {
    if (!prompt) return
    await window.aura.passwords.addToBlocklist(prompt.origin)
    setPrompt(null)
  }, [prompt])

  const handleDismiss = useCallback(() => setPrompt(null), [])

  if (!prompt) return null

  return (
    <div className="pwd-save-prompt" role="dialog" aria-label="Save password">
      <div className="pwd-save-header">
        <svg className="pwd-save-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12 1a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3zm0 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
        </svg>
        <span className="pwd-save-title">
          {prompt.isDuplicate ? 'Update saved password?' : 'Save password?'}
        </span>
        <button className="pwd-save-close" onClick={handleDismiss} aria-label="Dismiss">✕</button>
      </div>

      <div className="pwd-save-origin">{prompt.origin}</div>

      {error && <div className="pwd-save-error">{error}</div>}

      <div className="pwd-save-fields">
        <div className="pwd-save-field">
          <label className="pwd-save-label">Username</label>
          <input
            className="pwd-save-input"
            type="text"
            value={editUsername}
            onChange={e => setEditUsername(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="pwd-save-field">
          <label className="pwd-save-label">Password</label>
          <div className="pwd-save-input-row">
            <input
              className="pwd-save-input"
              type={showPassword ? 'text' : 'password'}
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              className="pwd-save-reveal"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>
      </div>

      <div className="pwd-save-actions">
        <button className="pwd-save-btn pwd-save-btn-ghost" onClick={handleNeverSave}>
          Never for this site
        </button>
        <button className="pwd-save-btn pwd-save-btn-ghost" onClick={handleDismiss}>
          Not now
        </button>
        <button
          className="pwd-save-btn pwd-save-btn-primary"
          onClick={handleSave}
          disabled={saving || !editUsername || !editPassword}
        >
          {saving ? 'Saving…' : prompt.isDuplicate ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default PasswordSavePrompt

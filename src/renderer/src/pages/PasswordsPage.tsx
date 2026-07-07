import React, { useState, useEffect, useCallback, useRef } from 'react'

interface CredentialRecord {
  id: number
  origin: string
  username: string
  password: string
  title: string
  created_at: number
  updated_at: number
  last_used: number | null
}

interface PasswordHealth {
  id: number
  origin: string
  username: string
  issue: 'reused' | 'weak' | 'stale'
}

const CLIPBOARD_CLEAR_MS = 20_000

const PasswordsPage: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [credentials, setCredentials] = useState<CredentialRecord[]>([])
  const [health, setHealth] = useState<PasswordHealth[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showGenerator, setShowGenerator] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const clipboardTimer = useRef<NodeJS.Timeout | null>(null)
  const copiedText = useRef<string>('')

  const handleUnlock = useCallback(async () => {
    setUnlocking(true)
    try {
      const ok = await window.aura.passwords.unlockVault()
      if (ok) {
        setUnlocked(true)
      }
    } finally {
      setUnlocking(false)
    }
  }, [])

  const load = useCallback(async () => {
    if (!unlocked) return
    if (search.trim()) {
      setCredentials(await window.aura.passwords.search(search))
    } else {
      setCredentials(await window.aura.passwords.getAll())
    }
    setHealth(await window.aura.passwords.health())
  }, [search, unlocked])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this saved password?')) return
    await window.aura.passwords.delete(id)
    load()
  }

  const handleEdit = (cred: CredentialRecord) => {
    setEditingId(cred.id)
    setEditUsername(cred.username)
    setEditPassword(cred.password)
  }

  const handleSaveEdit = async () => {
    if (editingId === null) return
    await window.aura.passwords.update(editingId, editUsername, editPassword)
    setEditingId(null)
    load()
  }

  const handleGenerate = async () => {
    const pwd = await window.aura.passwords.generate()
    setGeneratedPassword(pwd)
    setShowGenerator(true)
  }

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text)
    copiedText.current = text
    setCopiedId(id)

    if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    clipboardTimer.current = setTimeout(async () => {
      setCopiedId(cur => (cur === id ? null : cur))
      try {
        const current = await navigator.clipboard.readText()
        if (current === copiedText.current) {
          await navigator.clipboard.writeText('')
        }
      } catch { }
    }, CLIPBOARD_CLEAR_MS)
  }

  const toggleShowPassword = (id: number) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getIssuesForCredential = (id: number): PasswordHealth[] =>
    health.filter(h => h.id === id)

  const grouped = credentials.reduce<Record<string, CredentialRecord[]>>((acc, cred) => {
    if (!acc[cred.origin]) acc[cred.origin] = []
    acc[cred.origin].push(cred)
    return acc
  }, {})

  const healthSummary = {
    reused: health.filter(h => h.issue === 'reused').length,
    weak: health.filter(h => h.issue === 'weak').length,
    stale: health.filter(h => h.issue === 'stale').length,
  }

  if (!unlocked) {
    return (
      <div className="pwd-page">
        <div className="pwd-locked">
          <div className="pwd-locked-icon">🔐</div>
          <div className="pwd-locked-title">Passwords are locked</div>
          <div className="pwd-locked-sub">
            Verify your identity to view saved passwords
          </div>
          <button
            className="pwd-page-btn pwd-page-btn-primary"
            onClick={handleUnlock}
            disabled={unlocking}
          >
            {unlocking ? 'Verifying…' : 'Unlock Passwords'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pwd-page">
      <div className="pwd-page-header">
        <h1 className="pwd-page-title">Saved Passwords</h1>
        <div className="pwd-page-actions">
          <button className="pwd-page-btn pwd-page-btn-ghost" onClick={handleGenerate}>
            Generate Password
          </button>
          <button
            className="pwd-page-btn pwd-page-btn-ghost"
            onClick={() => setUnlocked(false)}
            title="Lock passwords"
          >
            🔒 Lock
          </button>
        </div>
      </div>

      {health.length > 0 && (
        <div className="pwd-health">
          <div className="pwd-health-title">Password Health</div>
          <div className="pwd-health-cards">
            {healthSummary.reused > 0 && (
              <div className="pwd-health-card pwd-health-reused">
                <span className="pwd-health-count">{healthSummary.reused}</span>
                <span className="pwd-health-label">Reused</span>
              </div>
            )}
            {healthSummary.weak > 0 && (
              <div className="pwd-health-card pwd-health-weak">
                <span className="pwd-health-count">{healthSummary.weak}</span>
                <span className="pwd-health-label">Weak</span>
              </div>
            )}
            {healthSummary.stale > 0 && (
              <div className="pwd-health-card pwd-health-stale">
                <span className="pwd-health-count">{healthSummary.stale}</span>
                <span className="pwd-health-label">Outdated</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showGenerator && (
        <div className="pwd-generator">
          <div className="pwd-generator-label">Generated password (auto-clears clipboard in 20s):</div>
          <div className="pwd-generator-value">
            <code>{generatedPassword}</code>
            <button
              className="pwd-generator-copy"
              onClick={() => handleCopy(generatedPassword, -1)}
            >
              {copiedId === -1 ? '✓ Copied' : 'Copy'}
            </button>
            <button className="pwd-generator-refresh" onClick={handleGenerate} title="Generate new">
              ↻
            </button>
          </div>
        </div>
      )}

      <div className="pwd-search-row">
        <input
          className="pwd-search"
          type="text"
          placeholder="Search passwords…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="pwd-count">{credentials.length} saved</span>
      </div>

      {credentials.length === 0 ? (
        <div className="pwd-empty">
          <div className="pwd-empty-icon">🔐</div>
          <div className="pwd-empty-text">No saved passwords yet</div>
          <div className="pwd-empty-sub">
            Aura will offer to save passwords when you sign in to websites
          </div>
        </div>
      ) : (
        <div className="pwd-groups">
          {Object.entries(grouped).map(([origin, creds]) => (
            <div key={origin} className="pwd-group">
              <div className="pwd-group-origin">{origin}</div>
              {creds.map(cred => {
                const issues = getIssuesForCredential(cred.id)
                return (
                  <div key={cred.id} className="pwd-row">
                    {editingId === cred.id ? (
                      <div className="pwd-edit-form">
                        <input
                          className="pwd-edit-input"
                          type="text"
                          value={editUsername}
                          onChange={e => setEditUsername(e.target.value)}
                          placeholder="Username"
                          autoComplete="off"
                        />
                        <input
                          className="pwd-edit-input"
                          type="text"
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                          placeholder="Password"
                          autoComplete="off"
                        />
                        <div className="pwd-edit-actions">
                          <button className="pwd-btn pwd-btn-primary" onClick={handleSaveEdit}>
                            Save
                          </button>
                          <button className="pwd-btn pwd-btn-ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="pwd-row-info">
                          <div className="pwd-row-username">{cred.username}</div>
                          <div className="pwd-row-password">
                            {showPasswords[cred.id]
                              ? cred.password
                              : '•'.repeat(Math.min(cred.password.length, 16))}
                          </div>
                          {issues.length > 0 && (
                            <div className="pwd-row-issues">
                              {issues.map(issue => (
                                <span
                                  key={issue.issue}
                                  className={`pwd-issue-badge pwd-issue-${issue.issue}`}
                                >
                                  {issue.issue === 'reused' ? '⚠ Reused' :
                                   issue.issue === 'weak'   ? '⚠ Weak' :
                                                              '⚠ Outdated'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="pwd-row-actions">
                          <button
                            className="pwd-btn-icon"
                            onClick={() => toggleShowPassword(cred.id)}
                            title={showPasswords[cred.id] ? 'Hide' : 'Show'}
                          >
                            {showPasswords[cred.id] ? '🙈' : '👁'}
                          </button>
                          <button
                            className="pwd-btn-icon"
                            onClick={() => handleCopy(cred.password, cred.id)}
                            title="Copy password (clears in 20s)"
                          >
                            {copiedId === cred.id ? '✓' : '📋'}
                          </button>
                          <button
                            className="pwd-btn-icon"
                            onClick={() => handleEdit(cred)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="pwd-btn-icon pwd-btn-danger"
                            onClick={() => handleDelete(cred.id)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PasswordsPage

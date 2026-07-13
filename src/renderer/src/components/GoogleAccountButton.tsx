import React, { useState, useEffect, useCallback } from 'react'

interface GoogleAccount {
  id: string
  email: string
  name: string
  picture: string
  signed_in_at: number
  last_refreshed: number
}

const GoogleAccountButton: React.FC = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const load = useCallback(async () => {
    const list = await window.aura.google.listAccounts()
    setAccounts(list)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const off1 = window.aura.google.onSignedIn(() => { setSigningIn(false); load() })
    const off2 = window.aura.google.onSignedOut(() => load())
    return () => { off1(); off2() }
  }, [load])

  const handleSignIn = async () => {
    setSigningIn(true)
    await window.aura.google.signIn()
    setTimeout(() => setSigningIn(false), 5 * 60 * 1000)
  }

  const handleCancelSignIn = async () => {
    await window.aura.google.cancelSignIn()
    setSigningIn(false)
  }

  const handleSignOut = async (id: string) => {
    if (!confirm('Sign out of this Google account?')) return
    await window.aura.google.signOut(id)
  }

  const primary = accounts[0] || null

  return (
    <div className="google-account-container">
      {primary ? (
        <>
          <button
            className="google-account-btn"
            onClick={() => setMenuOpen(v => !v)}
            title={primary.email}
          >
            {primary.picture ? (
              <img src={primary.picture} alt="" className="google-account-avatar" />
            ) : (
              <div className="google-account-avatar google-account-avatar-fallback">
                {primary.name.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          {menuOpen && (
            <div className="google-account-menu" onMouseLeave={() => setMenuOpen(false)}>
              <div className="google-account-menu-header">
                <img src={primary.picture} alt="" className="google-account-menu-avatar" />
                <div className="google-account-menu-info">
                  <div className="google-account-menu-name">{primary.name}</div>
                  <div className="google-account-menu-email">{primary.email}</div>
                </div>
              </div>
              {accounts.length > 1 && (
                <div className="google-account-list">
                  <div className="google-account-list-label">Other accounts</div>
                  {accounts.slice(1).map(a => (
                    <div key={a.id} className="google-account-list-item">
                      <img src={a.picture} alt="" className="google-account-mini-avatar" />
                      <span className="google-account-mini-email">{a.email}</span>
                      <button
                        className="google-account-mini-signout"
                        onClick={() => handleSignOut(a.id)}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="google-account-menu-actions">
                <button
                  className="google-account-menu-btn"
                  onClick={handleSignIn}
                  disabled={signingIn}
                >
                  {signingIn ? 'Waiting for browser\u2026' : '+ Add another account'}
                </button>
                <button
                  className="google-account-menu-btn google-account-menu-btn-danger"
                  onClick={() => handleSignOut(primary.id)}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {signingIn ? (
            <div className="google-signin-pending">
              <span className="google-signin-spinner" />
              <span className="google-signin-text">Waiting for browser\u2026</span>
              <button className="google-signin-cancel" onClick={handleCancelSignIn}>Cancel</button>
            </div>
          ) : (
            <button className="google-signin-btn" onClick={handleSignIn}>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default GoogleAccountButton

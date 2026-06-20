import React, { useState, useRef } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { AURA_AVATARS, getAvatarById, isAuraAvatarId } from '../../lib/auraAvatars'
import './YouAndAuraSection.css'

const MAX_AVATAR_BYTES = 200 * 1024

function isDataUrl(s: string): boolean {
  return typeof s === 'string' && s.startsWith('data:image/')
}

export const YouAndAuraSection: React.FC = () => {
  const { settings } = useSettings()
  const [nameLocal, setNameLocal] = useState(settings?.profileName || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (key: string, value: any) =>
    window.aura.settings.set(key, value)

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 6000)
  }

  const handleNameBlur = () => {
    if (nameLocal.trim() !== ((settings?.profileName || '').trim())) {
      set('profileName', nameLocal.trim())
    }
  }

  const handleClearAvatar = () => {
    set('profileAvatar', '')
  }

  const handleUploadAvatar = () => {
    fileInputRef.current?.click()
  }

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please pick an image file')
      return
    }

    if (file.size > MAX_AVATAR_BYTES) {
      showMessage('error', 'Image too large (max 200 KB)')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      if (result) {
        set('profileAvatar', result)
        showMessage('success', 'Avatar updated')
      }
    }
    reader.onerror = () => showMessage('error', 'Failed to read image')
    reader.readAsDataURL(file)

    e.target.value = ''
  }

  const handleExport = async () => {
    setBusy(true)
    const result = await window.aura.profile.exportData()
    setBusy(false)

    if (result.success) {
      showMessage('success', `Exported to ${result.path}`)
    } else if (result.error !== 'Cancelled') {
      showMessage('error', result.error || 'Export failed')
    }
  }

  const handleImport = async () => {
    setBusy(true)
    const result = await window.aura.profile.importData()
    setBusy(false)

    if (result.success) {
      showMessage('success',
        `Imported ${result.bookmarksImported} bookmarks, ` +
        `${result.historyImported} history entries, ` +
        `${result.settingsImported} settings`)
    } else if (result.error !== 'Cancelled') {
      showMessage('error', result.error || 'Import failed')
    }
  }

  const currentAvatar = settings?.profileAvatar || ''
  const hasAvatar = !!currentAvatar
  const isCustomImage = isDataUrl(currentAvatar)
  const auraAvatar = isAuraAvatarId(currentAvatar) ? getAvatarById(currentAvatar) : null
  const displayName = (settings?.profileName || '').trim() || 'there'

  return (
    <div className="settings-section-content">
      <h2>You and Aura</h2>

      <div className="setting-card">
        <h3 className="setting-card-title">YOUR PROFILE</h3>

        <div className="yua-profile-preview">
          <div className="yua-avatar">
            {hasAvatar ? (
              isCustomImage ? (
                <img src={currentAvatar} alt="" />
              ) : auraAvatar ? (
                <div className="yua-avatar-svg">{auraAvatar.svg}</div>
              ) : (
                <span className="yua-avatar-emoji">{currentAvatar}</span>
              )
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                   strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>
          <div className="yua-profile-info">
            <span className="yua-preview-greeting">Happy to see you,</span>
            <span className="yua-preview-name">{displayName}</span>
          </div>
        </div>

        <div className="setting-row vertical">
          <div className="setting-info">
            <span className="setting-label">Display name</span>
            <span className="setting-description">
              Appears in your new tab page greeting. Leave empty to use the default.
            </span>
          </div>
          <input
            type="text"
            className="yua-input"
            value={nameLocal}
            onChange={(e) => setNameLocal(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
            placeholder="Your name"
            maxLength={40}
          />
        </div>

        <div className="setting-row vertical">
          <div className="setting-info">
            <span className="setting-label">Avatar</span>
            <span className="setting-description">
              Pick an Aura avatar or upload your own image (max 200 KB)
            </span>
          </div>

          <div className="yua-avatar-grid">
            {AURA_AVATARS.map(avatar => (
              <button
                key={avatar.id}
                className={`yua-avatar-btn ${currentAvatar === avatar.id ? 'active' : ''}`}
                onClick={() => set('profileAvatar', avatar.id)}
                title={avatar.name}
                type="button"
              >
                <div className="yua-avatar-svg-wrapper">{avatar.svg}</div>
              </button>
            ))}
          </div>

          <div className="yua-avatar-actions">
            <button className="yua-btn" onClick={handleUploadAvatar}>
              Upload image&hellip;
            </button>
            {hasAvatar && (
              <button className="yua-btn secondary" onClick={handleClearAvatar}>
                Remove avatar
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onFileSelected}
          />
        </div>
      </div>

      <div className="setting-card">
        <h3 className="setting-card-title">YOUR DATA</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Export browser data</span>
            <span className="setting-description">
              Save all your bookmarks, browsing history, and settings to a JSON file
              you can back up or move to another device.
            </span>
          </div>
          <button className="yua-btn" onClick={handleExport} disabled={busy}>
            {busy ? 'Working\u2026' : 'Export to file\u2026'}
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Import browser data</span>
            <span className="setting-description">
              Load a previously exported Aura JSON file. Bookmarks are merged
              (duplicates skipped). Settings are overwritten.
            </span>
          </div>
          <button className="yua-btn" onClick={handleImport} disabled={busy}>
            {busy ? 'Working\u2026' : 'Import from file\u2026'}
          </button>
        </div>
      </div>

      <div className="setting-card yua-stub-card">
        <h3 className="setting-card-title">
          SYNC
          <span className="yua-stub-badge">Coming v1.1</span>
        </h3>
        <p className="yua-stub-text">
          End-to-end encrypted sync across your devices. Bookmarks, history, tabs,
          and settings will stay in sync via your Aura account. We&apos;re building
          this with privacy first &mdash; your data will be encrypted on your device
          before leaving it.
        </p>
      </div>

      <div className="setting-card yua-stub-card">
        <h3 className="setting-card-title">
          AURA ACCOUNT
          <span className="yua-stub-badge">Coming v1.1</span>
        </h3>
        <p className="yua-stub-text">
          Sign in with an Aura account to enable sync, save your AI assistant
          conversations across devices, and unlock cloud-only features. No account
          is required to use Aura &mdash; everything works locally today.
        </p>
      </div>

      {message && (
        <div className={`yua-message yua-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}

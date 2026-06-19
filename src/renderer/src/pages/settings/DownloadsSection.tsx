import React, { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle, Select } from './SettingsControls'
import './DownloadsSection.css'

export function DownloadsSection(): React.ReactElement {
  const { settings } = useSettings()
  const s = settings as Record<string, unknown>
  const [currentFolder, setCurrentFolder] = useState('')
  const [clearConfirm, setClearConfirm] = useState(false)

  useEffect(() => {
    window.aura.downloads.getCurrentFolder().then(setCurrentFolder).catch(() => {})
  }, [s.downloadPath])

  if (!settings) return <div className="sett-card">Loading…</div>

  const set = (key: string, value: unknown) => window.aura.settings.set(key, value)

  const pickFolder = async () => {
    const picked = await window.aura.downloads.pickFolder()
    if (picked) {
      await set('downloadPath', picked)
    }
  }

  const handleClearHistory = async () => {
    if (!clearConfirm) {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 3000)
      return
    }
    await window.aura.downloads.clearHistory()
    setClearConfirm(false)
  }

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Downloads</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">Location</h3>

        <div className="sett-field">
          <div className="sett-field-label">Download folder</div>
          <div className="sett-field-desc">
            Where files are saved when downloading
          </div>
          <div className="dl-folder-display">
            <span className="dl-folder-path">{currentFolder || 'Loading…'}</span>
            <div className="dl-folder-actions">
              <button className="dl-btn" onClick={pickFolder}>Change…</button>
              {s.downloadPath && (
                <button className="dl-btn secondary" onClick={() => set('downloadPath', '')}>
                  Reset to default
                </button>
              )}
              <button className="dl-btn secondary" onClick={() => window.aura.downloads.openFolder()}>
                Open folder
              </button>
            </div>
          </div>
        </div>

        <Toggle
          label="Ask where to save each file"
          description="Show a save dialog for every download instead of saving to the default folder"
          checked={s.downloadAskWhereToSave as boolean}
          onChange={(v) => set('downloadAskWhereToSave', v)}
        />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Behavior</h3>

        <Toggle
          label="Show progress while downloading"
          description="Display the downloads icon with active progress in the toolbar"
          checked={s.downloadShowPillWhileActive as boolean}
          onChange={(v) => set('downloadShowPillWhileActive', v)}
        />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">History</h3>

        <Select
          label="Keep download history for"
          description="How long completed downloads stay in your downloads list"
          value={s.downloadHistoryRetention as string}
          onChange={(v) => set('downloadHistoryRetention', v)}
          options={[
            { value: 'forever', label: 'Forever' },
            { value: '30days', label: 'Last 30 days' },
            { value: '7days', label: 'Last 7 days' },
            { value: '24hours', label: 'Last 24 hours' },
            { value: 'never', label: "Don't keep history" }
          ]}
        />

        <Toggle
          label="Clear history when Aura closes"
          description="Wipe the downloads list every time you quit. Downloaded files on disk are not affected."
          checked={s.downloadClearOnQuit as boolean}
          onChange={(v) => set('downloadClearOnQuit', v)}
        />

        <div className="sett-field">
          <div className="sett-field-label">Clear download history now</div>
          <div className="sett-field-desc">
            Remove all entries from your downloads list immediately. Files on disk are kept.
          </div>
          <button
            className={`dl-btn ${clearConfirm ? 'danger-confirm' : 'danger'}`}
            onClick={handleClearHistory}
          >
            {clearConfirm ? 'Click again to confirm' : 'Clear history'}
          </button>
        </div>
      </div>
    </div>
  )
}

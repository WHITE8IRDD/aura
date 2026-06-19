import React, { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle, Select } from './SettingsControls'

export const SystemSection: React.FC = () => {
  const { settings } = useSettings()
  const [pendingRestart, setPendingRestart] = useState(false)

  const set = (key: string, value: unknown): void => {
    window.aura.settings.set(key, value)
  }

  const setWithRestart = (key: string, value: unknown): void => {
    set(key, value)
    setPendingRestart(true)
  }

  return (
    <div className="settings-section-content">
      <h2>System</h2>

      <div className="setting-card">
        <h3 className="setting-card-title">PERFORMANCE</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">
              Hardware acceleration
              <span className="setting-badge-restart">Restart</span>
            </span>
            <span className="setting-description">
              Use your GPU to render pages and video. Disable if you see graphical glitches or want lower power usage.
            </span>
          </div>
          <Toggle
            label=""
            checked={settings?.hardwareAcceleration ?? true}
            onChange={(v) => setWithRestart('hardwareAcceleration', v)}
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Memory saver</span>
            <span className="setting-description">
              Put inactive tabs to sleep to free up memory. Sleeping tabs reload automatically when you click them again.
            </span>
          </div>
          <Select
            label=""
            value={settings?.systemMemorySaver ?? 'off'}
            onChange={(v) => set('systemMemorySaver', v)}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'balanced', label: 'Balanced (after 30 min)' },
              { value: 'aggressive', label: 'Aggressive (after 5 min)' }
            ]}
          />
        </div>
      </div>

      <div className="setting-card">
        <h3 className="setting-card-title">STARTUP</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Start Aura when Windows starts</span>
            <span className="setting-description">
              Aura will launch automatically when you sign in to Windows.
            </span>
          </div>
          <Toggle
            label=""
            checked={settings?.systemStartOnLogin ?? false}
            onChange={(v) => set('systemStartOnLogin', v)}
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Continue running when Aura closes</span>
            <span className="setting-description">
              Keep Aura running in the system tray when you close the window. Click the tray icon to reopen.
            </span>
          </div>
          <Toggle
            label=""
            checked={settings?.systemRunInBackground ?? false}
            onChange={(v) => set('systemRunInBackground', v)}
          />
        </div>
      </div>

      <div className="setting-card">
        <h3 className="setting-card-title">NETWORK</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Proxy settings</span>
            <span className="setting-description">
              Use your operating system's proxy configuration, or connect directly without a proxy.
            </span>
          </div>
          <Select
            label=""
            value={settings?.systemProxyMode ?? 'system'}
            onChange={(v) => set('systemProxyMode', v)}
            options={[
              { value: 'system', label: 'Use system proxy' },
              { value: 'direct', label: 'No proxy (direct)' }
            ]}
          />
        </div>
      </div>

      {pendingRestart && (
        <div className="settings-restart-banner">
          <span>Some changes require a restart to take effect</span>
          <button onClick={() => window.aura.app.relaunch()}>
            Restart now
          </button>
        </div>
      )}
    </div>
  )
}

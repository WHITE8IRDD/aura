import React, { useState } from 'react'
import type { AuraSettings } from '../../types'
import { Toggle, RadioGroup, Button } from './SettingsControls'
import { useSettings } from '../../hooks/useSettings'
import { ClearBrowsingDataDialog } from '../../components/ClearBrowsingDataDialog'

export function PrivacySection(): React.ReactElement {
  const { settings, set, loaded } = useSettings()
  const [clearOpen, setClearOpen] = useState(false)
  if (!loaded || !settings) return <div className="sett-card">Loading…</div>

  const shieldsOptions = [
    { value: 'standard' as const, label: 'Standard — blocks known trackers and ads' },
    { value: 'strict' as const, label: 'Strict — aggressive blocking, may break some sites' },
    { value: 'custom' as const, label: 'Custom — manual control for each category' }
  ]

  return (
    <div className="sett-section" id="sett-privacy">
      <h2 className="sett-section-title">Privacy & Security</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">YOUR DATA</h3>
        <div className="sett-field">
          <div className="sett-field-label">Clear browsing data</div>
          <div className="sett-field-desc">Delete your history, cookies, cache, and more</div>
          <button className="sett-btn" style={{ marginTop: 8, background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            onClick={() => setClearOpen(true)}>
            Clear data\u2026
          </button>
        </div>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Shields</h3>
        <RadioGroup label="Tracking protection" value={settings.shieldsLevel} options={shieldsOptions}
          onChange={(v) => set('shieldsLevel', v as AuraSettings['shieldsLevel'])} />
        {settings.shieldsLevel === 'custom' && (
          <>
            <Toggle label="Block trackers" checked={settings.blockTrackers}
              onChange={(v) => set('blockTrackers', v)} />
            <Toggle label="Block ads" checked={settings.blockAds}
              onChange={(v) => set('blockAds', v)} />
            <Toggle label="Block social media trackers" checked={settings.blockSocialTrackers}
              onChange={(v) => set('blockSocialTrackers', v)} />
            <Toggle label="Block fingerprinters" checked={settings.blockFingerprinters}
              onChange={(v) => set('blockFingerprinters', v)} />
          </>
        )}
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Security</h3>
        <Toggle label="HTTPS-Only mode" description="Always use secure HTTPS connections when available"
          checked={settings.httpsOnly} onChange={(v) => set('httpsOnly', v)} />
        <Toggle label="Send Do Not Track" description="Ask websites not to track your browsing"
          checked={settings.sendDoNotTrack} onChange={(v) => set('sendDoNotTrack', v)} />
        <Toggle label="Block dangerous sites" description="Warn about known phishing and malware sites"
          checked={settings.blockPhishing} onChange={(v) => set('blockPhishing', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Browsing data</h3>
        <Toggle label="Remember browsing history" checked={settings.rememberHistory}
          onChange={(v) => set('rememberHistory', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Suggestions</h3>
        <Toggle label="Suggest history in address bar" checked={settings.suggestHistory}
          onChange={(v) => set('suggestHistory', v)} />
        <Toggle label="Suggest bookmarks in address bar" checked={settings.suggestBookmarks}
          onChange={(v) => set('suggestBookmarks', v)} />
        <Toggle label="Suggest open tabs in address bar" checked={settings.suggestOpenTabs}
          onChange={(v) => set('suggestOpenTabs', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Default browser</h3>
        <Button label="Make Aura your default browser" description="Set Aura as the system default for http/https links"
          onClick={() => window.aura.browser.setDefault()} />
        <Button label="Check if Aura is default" variant="default"
          onClick={async () => {
            const ok = await window.aura.browser.isDefault()
            alert(ok ? 'Aura is your default browser' : 'Aura is not the default browser')
          }} />
      </div>

      <ClearBrowsingDataDialog open={clearOpen} onClose={() => setClearOpen(false)} />
    </div>
  )
}

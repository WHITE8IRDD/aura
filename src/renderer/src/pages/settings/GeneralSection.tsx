import React from 'react'
import type { AuraSettings } from '../../types'
import { Toggle, RadioGroup, Select, Slider } from './SettingsControls'
import { useSettings } from '../../hooks/useSettings'

export function GeneralSection(): React.ReactElement {
  const { settings, set, loaded } = useSettings()
  if (!loaded || !settings) return <div className="sett-card">Loading…</div>

  const startupOptions = [
    { value: 'newtab' as const, label: 'New tab page' },
    { value: 'restoreSession' as const, label: 'Restore previous session' },
    { value: 'specificUrl' as const, label: 'Open a specific URL' }
  ]

  const layoutOptions = [
    { value: 'horizontal' as const, label: 'Horizontal' },
    { value: 'vertical' as const, label: 'Vertical' }
  ]

  const fontSizeOptions = [
    { value: 'small' as const, label: 'Small' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'large' as const, label: 'Large' }
  ]

  const engineOptions = [
    { value: 'duckduckgo' as const, label: 'DuckDuckGo' },
    { value: 'google' as const, label: 'Google' },
    { value: 'bing' as const, label: 'Bing' },
    { value: 'brave' as const, label: 'Brave Search' },
    { value: 'startpage' as const, label: 'Startpage' }
  ]

  return (
    <div className="sett-section" id="sett-general">
      <h2 className="sett-section-title">General</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">Startup</h3>
        <Select
          label="On startup"
          value={settings.startupBehavior}
          options={startupOptions}
          onChange={(v) => set('startupBehavior', v as AuraSettings['startupBehavior'])}
        />
        {settings.startupBehavior === 'specificUrl' && (
          <div className="sett-field">
            <div className="sett-field-label">Startup URL</div>
            <input className="sett-text-input" type="text" value={settings.startupUrl}
              placeholder="https://example.com"
              onChange={(e) => set('startupUrl', e.target.value)}
              onBlur={(e) => {
                const val = e.target.value.trim()
                if (val && !/^https?:\/\//i.test(val)) {
                  set('startupUrl', 'https://' + val)
                }
              }} />
          </div>
        )}
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Tabs</h3>
        <Toggle label="Open links in new tab" description="Open external links from other apps in a new tab instead of a new window"
          checked={settings.openLinksInTabs} onChange={(v) => set('openLinksInTabs', v)} />
        <Toggle label="Switch to new tab automatically"
          checked={settings.switchToNewTab} onChange={(v) => set('switchToNewTab', v)} />
        <Toggle label="Ctrl+Tab cycles in most-recent order"
          checked={settings.ctrlTabRecentOrder} onChange={(v) => set('ctrlTabRecentOrder', v)} />
        <Toggle label="Ask before closing multiple tabs"
          checked={settings.askBeforeClosingMultipleTabs} onChange={(v) => set('askBeforeClosingMultipleTabs', v)} />
        <RadioGroup label="Tab layout" value={settings.tabsLayout} options={layoutOptions}
          onChange={(v) => set('tabsLayout', v as AuraSettings['tabsLayout'])} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Appearance</h3>
        <Toggle label="Show bookmarks bar" description="Display the bookmarks bar below the address bar"
          checked={settings.showBookmarksBar} onChange={(v) => set('showBookmarksBar', v)} />
        <Select label="Font size" value={settings.fontSize} options={fontSizeOptions}
          onChange={(v) => set('fontSize', v as AuraSettings['fontSize'])} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Downloads</h3>
        <div className="sett-field">
          <div className="sett-field-label">Downloads folder</div>
          <div className="sett-text-input-row">
            <input className="sett-text-input" type="text" value={settings.downloadsFolder} readOnly />
            <button className="sett-btn" onClick={() => window.aura.app.openUserDataFolder()}>Change</button>
          </div>
        </div>
        <Toggle label="Always ask where to save" description="Prompt for save location before each download"
          checked={settings.alwaysAskWhereToSave} onChange={(v) => set('alwaysAskWhereToSave', v)} />
        <Toggle label="Delete downloads after Ninja window closes"
          checked={settings.deleteDownloadsAfterPrivateClose} onChange={(v) => set('deleteDownloadsAfterPrivateClose', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Performance</h3>
        <Toggle label="Hardware acceleration" description="Use GPU to accelerate rendering (requires restart)"
          checked={settings.hardwareAcceleration} onChange={(v) => set('hardwareAcceleration', v)} />
        <Slider label="Sleeping tabs after" description="Move inactive tabs to sleep to free memory"
          value={settings.sleepingTabsMinutes} min={1} max={120} unit=" min"
          onChange={(v) => set('sleepingTabsMinutes', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Media</h3>
        <Toggle label="Allow autoplay" description="Let websites play audio and video automatically"
          checked={settings.autoplayAllowed} onChange={(v) => set('autoplayAllowed', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Browsing</h3>
        <Toggle label="Smooth scrolling" checked={settings.smoothScrolling}
          onChange={(v) => set('smoothScrolling', v)} />
        <Toggle label="Ctrl + Wheel to zoom" description="Hold Ctrl and scroll to zoom page content"
          checked={settings.ctrlWheelZoom} onChange={(v) => set('ctrlWheelZoom', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Updates</h3>
        <Toggle label="Automatically check for updates" checked={settings.autoCheckUpdates}
          onChange={(v) => set('autoCheckUpdates', v)} />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Search engine</h3>
        <Select label="Default search engine" value={settings.defaultSearchEngine} options={engineOptions}
          onChange={(v) => set('defaultSearchEngine', v as AuraSettings['defaultSearchEngine'])} />
      </div>
    </div>
  )
}

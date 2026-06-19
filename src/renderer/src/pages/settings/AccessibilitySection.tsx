import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle, Select } from './SettingsControls'

const ZOOM_LEVELS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200]
const FONT_SIZES = [
  { value: 0, label: 'No minimum' },
  { value: 10, label: '10 px (Tiny)' },
  { value: 12, label: '12 px (Small)' },
  { value: 14, label: '14 px (Medium)' },
  { value: 16, label: '16 px (Large)' },
  { value: 18, label: '18 px (Extra large)' }
]

export function AccessibilitySection(): React.ReactElement {
  const { settings } = useSettings()
  if (!settings) return <div className="sett-card">Loading\u2026</div>

  const s = settings as Record<string, unknown>
  const set = (key: string, value: unknown): void => {
    window.aura.settings.set(key, value)
  }

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Accessibility</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">Vision</h3>

        <Select
          label="Default page zoom"
          description="The starting zoom level for every webpage. Individual sites you've zoomed in/out manually keep their custom level."
          value={String(s.a11yDefaultZoom ?? 100)}
          onChange={(v) => set('a11yDefaultZoom', Number(v))}
          options={ZOOM_LEVELS.map((z) => ({
            value: String(z),
            label: `${z}%${z === 100 ? ' (Default)' : ''}`
          }))}
        />

        <Select
          label="Minimum font size"
          description="Force text smaller than this size to scale up. Helpful for sites with tiny text. Applies to new pages."
          value={String(s.a11yMinFontSize ?? 0)}
          onChange={(v) => set('a11yMinFontSize', Number(v))}
          options={FONT_SIZES.map((f) => ({ value: String(f.value), label: f.label }))}
        />

        <Toggle
          label="Larger cursor"
          description="Show a larger, higher-contrast cursor in Aura\u2019s interface"
          checked={!!s.a11yLargerCursor}
          onChange={(v) => set('a11yLargerCursor', v)}
        />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Motion & Animation</h3>

        <Toggle
          label="Reduce motion"
          description="Minimize animations and transitions across Aura\u2019s interface"
          checked={!!s.a11yReduceMotion}
          onChange={(v) => set('a11yReduceMotion', v)}
        />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Keyboard Navigation</h3>

        <Toggle
          label="Always show focus indicators"
          description="Display a visible outline around the focused element, even when navigating with the mouse"
          checked={!!s.a11yAlwaysShowFocus}
          onChange={(v) => set('a11yAlwaysShowFocus', v)}
        />

        <Toggle
          label="Caret browsing (Restart required)"
          description="Navigate webpage content using a movable keyboard cursor. Press F7 to toggle on demand, or enable here as default."
          checked={!!s.a11yCaretBrowsing}
          onChange={(v) => set('a11yCaretBrowsing', v)}
        />
      </div>
    </div>
  )
}

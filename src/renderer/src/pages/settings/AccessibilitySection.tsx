import React, { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle, Select } from './SettingsControls'

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200]
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
  const [customZoom, setCustomZoom] = useState('100')

  if (!settings) return <div className="sett-card">Loading\u2026</div>

  const s = settings as Record<string, unknown>
  const set = (key: string, value: unknown): void => {
    window.aura.settings.set(key, value)
  }

  const currentZoom = Number(s.a11yDefaultZoom ?? 100)

  const handleCustomZoom = () => {
    const v = Math.round(Math.max(25, Math.min(500, Number(customZoom) || 100)))
    set('a11yDefaultZoom', v)
    setCustomZoom(String(v))
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCustomZoom()
  }

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Accessibility</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">Vision</h3>

        <div className="sett-field">
          <div className="sett-field-label">Default page zoom</div>
          <div className="sett-field-desc">The starting zoom level for every webpage. Individual sites you've zoomed in/out manually keep their custom level.</div>
          <div className="zoom-presets">
            {ZOOM_PRESETS.map((z) => (
              <button
                key={z}
                className={`zoom-preset-btn${currentZoom === z ? ' active' : ''}`}
                onClick={() => { set('a11yDefaultZoom', z); setCustomZoom(String(z)) }}
              >
                {z}%
              </button>
            ))}
          </div>
          <div className="zoom-custom-row">
            <span className="zoom-custom-label">Custom</span>
            <input
              type="number"
              className="zoom-custom-input"
              min={25}
              max={500}
              value={customZoom}
              onChange={(e) => setCustomZoom(e.target.value)}
              onBlur={handleCustomZoom}
              onKeyDown={handleCustomKeyDown}
            />
            <span className="zoom-custom-unit">%</span>
          </div>
        </div>

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

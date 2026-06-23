import React, { useState, useEffect } from 'react'
import { THEME_PRESETS } from '../../lib/themePresets'
import './ThemePicker.css'

export function AppearanceSection(): React.ReactElement {
  const [mode, setMode] = useState<'light' | 'dark' | 'auto'>('dark')
  const [preset, setPreset] = useState('aura-dark')
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark')
  const [loaded, setLoaded] = useState(false)
  const [forceDark, setForceDark] = useState(false)
  const [showRestartBanner, setShowRestartBanner] = useState(false)
  const [useVerticalTabs, setUseVerticalTabs] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const m = await window.aura.settings.get('themeMode') as 'light' | 'dark' | 'auto'
      const p = await window.aura.settings.get('themePreset') as string
      const r = await window.aura.theme.getResolved() as 'light' | 'dark'
      const fd = await window.aura.settings.get('forceDarkOnWebsites') as boolean
      const vt = await window.aura.settings.get('tabsLayout') as string
      if (cancelled) return
      setMode(m)
      setPreset(p)
      setResolved(r)
      setForceDark(fd)
      setUseVerticalTabs(vt === 'vertical')
      setLoaded(true)
    }
    load()

    const unsub = window.aura.settings.onChanged((data: { key: string; value: unknown }) => {
      if (data.key === 'themeMode') setMode(data.value as 'light' | 'dark' | 'auto')
      if (data.key === 'themePreset') setPreset(data.value as string)
    })
    const unsubTheme = window.aura.theme.onChanged((r) => setResolved(r))

    return () => { cancelled = true; unsub(); unsubTheme() }
  }, [])

  if (!loaded) return <div className="sett-card">Loading…</div>

  const visiblePresets = THEME_PRESETS.filter(p => p.variant === resolved && p.id !== 'ninja-identity')

  return (
    <div className="sett-section" id="sett-appearance">
      <h2 className="sett-section-title">Appearance</h2>

      <div className="sett-card">
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Theme mode</span>
            <span className="setting-description">Choose how Aura adapts to your environment</span>
          </div>
          <div className="theme-mode-segmented">
            {(['light', 'dark', 'auto'] as const).map(m => (
              <button
                key={m}
                className={`theme-mode-btn${mode === m ? ' active' : ''}`}
                onClick={() => window.aura.settings.set('themeMode', m)}
              >
                {m === 'light' && '☀ Light'}
                {m === 'dark' && '☾ Dark'}
                {m === 'auto' && '⟳ Auto'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Theme Preset</h3>
        <p className="sett-card-desc">
          {resolved === 'light' ? 'Light-mode' : 'Dark-mode'} presets
        </p>
        <div className="theme-preset-grid">
          {visiblePresets.map(p => {
            const active = preset === p.id
            return (
              <button
                key={p.id}
                className={`theme-preset-card${active ? ' active' : ''}`}
                onClick={() => window.aura.settings.set('themePreset', p.id)}
              >
                <div
                  className="theme-preset-swatch"
                  style={{
                    background: p.colors.bgPrimary,
                    borderColor: p.colors.borderDefault
                  }}
                >
                  <div
                    className="theme-preset-swatch-bar"
                    style={{ background: p.colors.toolbarBg }}
                  />
                  <div
                    className="theme-preset-swatch-accent"
                    style={{ background: p.colors.accent }}
                  />
                  <div className="theme-preset-swatch-text" style={{ color: p.colors.textPrimary }}>
                    Aa
                  </div>
                </div>
                <div className="theme-preset-info">
                  <div className="theme-preset-name">{p.name}</div>
                  <div className="theme-preset-desc">{p.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Layout</h3>
        <label className="sett-toggle">
          <div className="sett-toggle-body">
            <div className="sett-toggle-label">
              Vertical tabs
            </div>
            <div className="sett-toggle-desc">
              Show tabs vertically on the left side instead of horizontally at the top.
            </div>
          </div>
          <div className={`sett-toggle-switch${useVerticalTabs ? ' on' : ''}`}>
            <input type="checkbox" checked={useVerticalTabs}
              onChange={async (e) => {
                const checked = e.target.checked
                setUseVerticalTabs(checked)
                await window.aura.settings.set('tabsLayout', checked ? 'vertical' : 'horizontal')
              }} />
            <span className="sett-toggle-knob" />
          </div>
        </label>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Websites</h3>
        <label className="sett-toggle">
          <div className="sett-toggle-body">
            <div className="sett-toggle-label">
              Force dark mode on websites
              <span className="setting-badge-experimental">Experimental</span>
            </div>
            <div className="sett-toggle-desc">
              Automatically darken light websites using Chromium's built-in algorithm. Some sites may render incorrectly. Aura's chrome and internal pages are not affected.
            </div>
            {showRestartBanner && (
              <div className="setting-restart-inline">
                Restart Aura to apply this change.
                <button onClick={() => { window.aura.app.relaunch() }}>
                  Restart now
                </button>
              </div>
            )}
          </div>
          <div className={`sett-toggle-switch${forceDark ? ' on' : ''}`}>
            <input type="checkbox" checked={forceDark}
              onChange={async (e) => {
                const checked = e.target.checked
                setForceDark(checked)
                await window.aura.settings.set('forceDarkOnWebsites', checked)
                setShowRestartBanner(true)
              }} />
            <span className="sett-toggle-knob" />
          </div>
        </label>
      </div>
    </div>
  )
}

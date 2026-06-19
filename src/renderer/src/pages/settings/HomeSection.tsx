import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle, RadioGroup } from './SettingsControls'

export function HomeSection(): React.ReactElement {
  const { settings } = useSettings()
  const s = settings as Record<string, unknown>
  if (!settings) return <div className="sett-card">Loading…</div>

  const set = (key: string, value: unknown) => window.aura.settings.set(key, value)
  const isLayoutOff = s.ntpLayout === 'off'
  const isLayoutMinimal = s.ntpLayout === 'minimal'

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Home</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">New Tab Page</h3>

        <RadioGroup
          label="Layout"
          description="Customize the look of your new tab page"
          value={s.ntpLayout as string}
          onChange={(v) => set('ntpLayout', v)}
          options={[
            { value: 'default', label: 'Default (mascot + search)' },
            { value: 'minimal', label: 'Minimal (search only)' },
            { value: 'off', label: 'Blank page' }
          ]}
        />

        <Toggle
          label="Show greeting"
          description='"Happy to see you, there" message above the search bar'
          checked={s.ntpShowGreeting as boolean}
          disabled={isLayoutOff}
          onChange={(v) => set('ntpShowGreeting', v)}
        />

        <Toggle
          label="Show mascot"
          description="The glowing Aura orb above the search bar"
          checked={s.ntpShowMascot as boolean}
          disabled={isLayoutOff || isLayoutMinimal}
          onChange={(v) => set('ntpShowMascot', v)}
        />

        <RadioGroup
          label="Search bar position"
          description="Where the search bar appears on the new tab page"
          value={s.ntpSearchBarPosition as string}
          disabled={isLayoutOff}
          onChange={(v) => set('ntpSearchBarPosition', v)}
          options={[
            { value: 'center', label: 'Center' },
            { value: 'top', label: 'Top' }
          ]}
        />
      </div>
    </div>
  )
}

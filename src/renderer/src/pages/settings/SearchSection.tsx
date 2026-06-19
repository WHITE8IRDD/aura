import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle, RadioGroup, Select } from './SettingsControls'

export function SearchSection(): React.ReactElement {
  const { settings } = useSettings()
  const s = settings as Record<string, unknown>
  if (!settings) return <div className="sett-card">Loading…</div>

  const set = (key: string, value: unknown) => window.aura.settings.set(key, value)
  const suggestionsOff = !s.searchSuggestionsEnabled

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Search</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">Default Search Engine</h3>

        <Select
          label="Search engine"
          description="Used when you search from the address bar"
          value={s.defaultSearchEngine as string}
          onChange={(v) => set('defaultSearchEngine', v)}
          options={[
            { value: 'google', label: 'Google' },
            { value: 'duckduckgo', label: 'DuckDuckGo' },
            { value: 'brave', label: 'Brave Search' },
            { value: 'startpage', label: 'Startpage' }
          ]}
        />

        <Toggle
          label="Show search engine quick picker"
          description="The 4-icon row next to the address bar lock icon for instant engine switching"
          checked={s.searchPickerVisible as boolean}
          onChange={(v) => set('searchPickerVisible', v)}
        />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Suggestions</h3>

        <Toggle
          label="Show suggestions while typing"
          description="Dropdown of suggestions appears as you type in the address bar"
          checked={s.searchSuggestionsEnabled as boolean}
          onChange={(v) => set('searchSuggestionsEnabled', v)}
        />

        <Toggle
          label="Include bookmarks"
          description="Match suggestions against your saved bookmarks"
          checked={s.searchSuggestSourceBookmarks as boolean}
          disabled={suggestionsOff}
          onChange={(v) => set('searchSuggestSourceBookmarks', v)}
        />

        <Toggle
          label="Include history"
          description="Match suggestions against pages you've previously visited"
          checked={s.searchSuggestSourceHistory as boolean}
          disabled={suggestionsOff}
          onChange={(v) => set('searchSuggestSourceHistory', v)}
        />

        <Toggle
          label="Include open tabs"
          description="Match suggestions against currently open tabs (switch to instead of opening new)"
          checked={s.searchSuggestSourceOpenTabs as boolean}
          disabled={suggestionsOff}
          onChange={(v) => set('searchSuggestSourceOpenTabs', v)}
        />
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Address Bar</h3>

        <Toggle
          label="Autocomplete from history"
          description="Complete URLs as you type based on your browsing history"
          checked={s.searchAutocompleteFromHistory as boolean}
          onChange={(v) => set('searchAutocompleteFromHistory', v)}
        />
      </div>
    </div>
  )
}

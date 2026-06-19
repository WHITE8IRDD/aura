import React, { useMemo, useState } from 'react'
import { SEARCH_INDEX, type SearchEntry } from './settings/SearchIndex'
import { GeneralSection } from './settings/GeneralSection'
import { PrivacySection } from './settings/PrivacySection'
import { AiSection } from './settings/AiSection'
import { Button } from './settings/SettingsControls'
import { useSettings } from '../hooks/useSettings'
import { ChromePageHeader } from '../components/ChromePageHeader'

interface Props {
  onClose: () => void
}

interface Section {
  id: string
  label: string
}

const SECTIONS: Section[] = [
  { id: 'general', label: 'General' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'ai', label: 'AI Assistant' }
]

export default function SettingsPage({ onClose }: Props): React.ReactElement {
  const [activeSection, setActiveSection] = useState('general')
  const [search, setSearch] = useState('')

  const { reset } = useSettings()

  const filtered: SearchEntry[] = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return SEARCH_INDEX.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }, [search])

  const handleSearchSelect = (entry: SearchEntry) => {
    setActiveSection(entry.section)
    setSearch('')
  }

  return (
    <div className="sett-page">
      <ChromePageHeader title="Settings" badge="STAGE 10" onBack={onClose} />

      <div className="sett-search-bar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
        </svg>
        <input type="text" placeholder="Search settings…" value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {search.trim() && filtered.length > 0 && (
        <div className="sett-search-results">
          {filtered.map((entry, i) => (
            <button key={i} className="sett-search-item"
              onClick={() => handleSearchSelect(entry)}>
              <span className="sett-search-section">{SECTIONS.find((s) => s.id === entry.section)?.label}</span>
              <span className="sett-search-label">{entry.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sett-layout">
        <nav className="sett-nav">
          {SECTIONS.map((s) => (
            <button key={s.id}
              className={`sett-nav-item${activeSection === s.id ? ' active' : ''}`}
              onClick={() => setActiveSection(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="sett-content">
          {activeSection === 'general' && <GeneralSection />}
          {activeSection === 'privacy' && <PrivacySection />}
          {activeSection === 'ai' && <AiSection />}

          <div className="sett-footer">
            <Button label="Reset all settings to defaults" variant="danger"
              onClick={() => {
                if (confirm('Reset all settings to defaults? This cannot be undone.')) reset()
              }} />
          </div>
        </div>
      </div>
    </div>
  )
}

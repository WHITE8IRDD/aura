import React, { useMemo, useState } from 'react'
import { SEARCH_INDEX, type SearchEntry } from './settings/SearchIndex'
import { GeneralSection } from './settings/GeneralSection'
import { AppearanceSection } from './settings/AppearanceSection'
import { HomeSection } from './settings/HomeSection'
import { SearchSection } from './settings/SearchSection'
import { PrivacySection } from './settings/PrivacySection'
import { AiSection } from './settings/AiSection'
import { LanguagesSection } from './settings/LanguagesSection'
import { DownloadsSection } from './settings/DownloadsSection'
import { AccessibilitySection } from './settings/AccessibilitySection'
import { SystemSection } from './settings/SystemSection'
import { PerformanceSection } from './settings/PerformanceSection'
import { DefaultBrowserSection } from './settings/DefaultBrowserSection'
import { AboutSection } from './settings/AboutSection'
import { Button } from './settings/SettingsControls'
import { useSettings } from '../hooks/useSettings'
import { ChromePageHeader } from '../components/ChromePageHeader'
import { ResetConfirmModal } from '../components/ResetConfirmModal'

interface Props {
  onClose: () => void
}

interface Section {
  id: string
  label: string
}

const SECTION_ICONS: Record<string, JSX.Element> = {
  general: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  appearance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5"/>
      <circle cx="17.5" cy="10.5" r="2.5"/>
      <circle cx="8.5" cy="7.5" r="2.5"/>
      <circle cx="6.5" cy="12.5" r="2.5"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  downloads: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  privacy: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  accessibility: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2"/>
      <path d="M19 13v-2c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v2"/>
      <path d="M12 9v6"/>
      <path d="M8 21l4-6 4 6"/>
    </svg>
  ),
  system: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  performance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  defaultBrowser: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  ai: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 7.5l-6 .9 4.4 4.2-1 6 5.1-2.7 5.1 2.7-1-6 4.4-4.2-6-.9L12 2z"/>
    </svg>
  ),
  languages: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  about: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

const SECTIONS: Section[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'system', label: 'System' },
  { id: 'performance', label: 'Performance' },
  { id: 'defaultBrowser', label: 'Default browser' },
  { id: 'ai', label: 'AI Assistant' },
  { id: 'languages', label: 'Languages' },
  { id: 'about', label: 'About' }
]

export default function SettingsPage({ onClose }: Props): React.ReactElement {
  const [activeSection, setActiveSection] = useState('general')
  const [search, setSearch] = useState('')

  const { reset } = useSettings()

  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetResult, setResetResult] = useState<string | null>(null)

  const handleResetAll = async () => {
    const result = await window.aura.settings.resetAll()
    setResetModalOpen(false)

    if (result.success) {
      setResetResult(`\u2713 Reset ${result.resetCount} settings to defaults`)
      setTimeout(() => setResetResult(null), 5000)
    } else {
      setResetResult(`Failed: ${result.error}`)
      setTimeout(() => setResetResult(null), 8000)
    }
  }

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
              <span className="sett-nav-icon">{SECTION_ICONS[s.id]}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="sett-content">
          {activeSection === 'general' && <GeneralSection />}
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'home' && <HomeSection />}
          {activeSection === 'search' && <SearchSection />}
          {activeSection === 'downloads' && <DownloadsSection />}
          {activeSection === 'privacy' && <PrivacySection />}
          {activeSection === 'accessibility' && <AccessibilitySection />}
          {activeSection === 'system' && <SystemSection />}
          {activeSection === 'performance' && <PerformanceSection />}
          {activeSection === 'defaultBrowser' && <DefaultBrowserSection />}
          {activeSection === 'ai' && <AiSection />}
          {activeSection === 'languages' && <LanguagesSection />}
          {activeSection === 'about' && <AboutSection />}

          <div className="sett-footer">
            <Button label="Reset all settings to defaults" variant="danger"
              onClick={() => setResetModalOpen(true)} />
          </div>
        </div>
      </div>

      <ResetConfirmModal
        open={resetModalOpen}
        title="Reset all settings?"
        description="This will restore every Aura setting to its default value. Your bookmarks, history, downloads, and saved tabs will NOT be affected \u2014 only preferences and toggles are reset."
        confirmWord="RESET"
        confirmLabel="Reset all settings"
        danger={true}
        onConfirm={handleResetAll}
        onCancel={() => setResetModalOpen(false)}
      />

      {resetResult && (
        <div className="settings-reset-toast">{resetResult}</div>
      )}
    </div>
  )
}

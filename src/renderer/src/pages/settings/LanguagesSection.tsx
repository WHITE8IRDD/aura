import React, { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Toggle } from './SettingsControls'
import './LanguagesSection.css'

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)', 'en-CA': 'English (Canada)',
  'es': 'Spanish', 'es-419': 'Spanish (Latin America)', 'es-AR': 'Spanish (Argentina)',
  'es-ES': 'Spanish (Spain)', 'es-MX': 'Spanish (Mexico)', 'es-US': 'Spanish (US)',
  'fr': 'French', 'fr-FR': 'French (France)', 'fr-CA': 'French (Canada)',
  'pt': 'Portuguese', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)',
  'de': 'German', 'de-DE': 'German (Germany)',
  'it': 'Italian', 'it-IT': 'Italian (Italy)',
  'da': 'Danish', 'sv': 'Swedish', 'nb': 'Norwegian (Bokmål)',
  'nn': 'Norwegian (Nynorsk)', 'no': 'Norwegian', 'is': 'Icelandic', 'fi': 'Finnish',
  'pl': 'Polish', 'cs': 'Czech', 'sk': 'Slovak', 'sl': 'Slovenian',
  'sh': 'Serbo-Croatian', 'hr': 'Croatian', 'sr': 'Serbian', 'bg': 'Bulgarian',
  'ru': 'Russian', 'uk': 'Ukrainian', 'be': 'Belarusian', 'mk': 'Macedonian',
  'nl': 'Dutch', 'el': 'Greek', 'cy': 'Welsh', 'ga': 'Irish',
  'gd': 'Scottish Gaelic', 'br': 'Breton', 'eu': 'Basque', 'ca': 'Catalan',
  'gl': 'Galician', 'ro': 'Romanian', 'hu': 'Hungarian', 'et': 'Estonian',
  'lv': 'Latvian', 'lt': 'Lithuanian', 'sq': 'Albanian', 'mt': 'Maltese',
  'lb': 'Luxembourgish', 'fo': 'Faroese',
  'tr': 'Turkish', 'ar': 'Arabic', 'fa': 'Persian', 'he': 'Hebrew',
  'hy': 'Armenian', 'ka': 'Georgian', 'ku': 'Kurdish',
  'hi': 'Hindi', 'bn': 'Bengali', 'pa': 'Punjabi', 'gu': 'Gujarati',
  'ta': 'Tamil', 'te': 'Telugu', 'ml': 'Malayalam', 'kn': 'Kannada',
  'mr': 'Marathi', 'ne': 'Nepali', 'si': 'Sinhala', 'ur': 'Urdu',
  'zh': 'Chinese', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'ja': 'Japanese', 'ko': 'Korean',
  'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay',
  'tl': 'Filipino', 'km': 'Khmer', 'lo': 'Lao', 'my': 'Burmese',
  'sw': 'Swahili', 'zu': 'Zulu', 'xh': 'Xhosa', 'af': 'Afrikaans',
  'am': 'Amharic', 'so': 'Somali', 'ha': 'Hausa', 'ig': 'Igbo', 'yo': 'Yoruba',
  'rw': 'Kinyarwanda',
  'eo': 'Esperanto', 'la': 'Latin'
}

function displayName(code: string): string {
  return LANGUAGE_NAMES[code] || code
}

export function LanguagesSection(): React.ReactElement {
  const { settings } = useSettings()
  const s = settings as Record<string, unknown>
  const [available, setAvailable] = useState<string[]>([])

  useEffect(() => {
    window.aura.languages.getAvailableDictionaries().then(setAvailable).catch(() => {})
  }, [])

  if (!settings) return <div className="sett-card">Loading…</div>

  const set = (key: string, value: unknown) => window.aura.settings.set(key, value)
  const spEnabled = s.spellcheckEnabled as boolean
  const spLangs = (s.spellcheckLanguages as string[]) ?? []
  const prefLangs = (s.preferredLanguages as string[]) ?? []

  const toggleSpellLang = (code: string) => {
    if (spLangs.includes(code)) {
      set('spellcheckLanguages', spLangs.filter((l) => l !== code))
    } else {
      set('spellcheckLanguages', [...spLangs, code])
    }
  }

  const handlePreferredChange = (val: string) => {
    set('preferredLanguages', val.split(',').map((s) => s.trim()).filter(Boolean))
  }

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Languages</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">Spell Check</h3>

        <Toggle
          label="Enable spell check"
          description="Underlines misspelled words in text areas"
          checked={spEnabled}
          onChange={(v) => set('spellcheckEnabled', v)}
        />

        {spEnabled && (
          <div className="sett-field">
            <div className="sett-field-label">Dictionaries</div>
            <div className="sett-field-desc">Select languages for spell checking</div>
            <div className="lang-dict-grid">
              {available.length > 0
                ? available.map((code) => (
                    <label key={code} className={`lang-dict-item${spLangs.includes(code) ? ' active' : ''}`}
                      onClick={() => toggleSpellLang(code)}>
                      <span className="lang-dict-check">
                        {spLangs.includes(code) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span>{displayName(code)}</span>
                    </label>
                  ))
                : <div className="lang-dict-loading">Loading dictionaries…</div>}
            </div>
          </div>
        )}
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Website Language Preference</h3>

        <div className="sett-field">
          <div className="sett-field-label">Preferred languages</div>
          <div className="sett-field-desc">
            Ordered comma-separated list sent in the Accept-Language header. Example: en-US, en, fr
          </div>
          <input className="lang-pref-input" type="text"
            value={prefLangs.join(', ')}
            onChange={(e) => handlePreferredChange(e.target.value)}
            placeholder="en-US, en, fr" />
        </div>
      </div>
    </div>
  )
}

import { ipcMain, session } from 'electron'
import { getSetting } from './settings'

export function applySpellcheckToSession(s: Electron.Session): void {
  const enabled = getSetting('spellcheckEnabled')
  try {
    s.setSpellCheckerEnabled(enabled)
    if (enabled) {
      const langs = getSetting('spellcheckLanguages')
      if (langs.length > 0) {
        s.setSpellCheckerLanguages(langs)
      }
    }
  } catch (err) {
    console.warn('[Aura/languages] setSpellChecker failed:', err)
  }
}

export function initLanguages(): void {
  applySpellcheckToSession(session.defaultSession)

  ipcMain.handle('languages:getAvailableDictionaries', async () => {
    return session.defaultSession.availableSpellCheckerLanguages
  })
}

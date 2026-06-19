import { BrowserWindow, app } from 'electron'
import { getDb } from './db'

export interface AuraSettings {
  startupBehavior: 'newtab' | 'restoreSession' | 'specificUrl'
  startupUrl: string
  openLinksInTabs: boolean
  switchToNewTab: boolean
  ctrlTabRecentOrder: boolean
  askBeforeClosingMultipleTabs: boolean
  tabsLayout: 'horizontal' | 'vertical'
  showBookmarksBar: boolean
  themeMode: 'light' | 'dark' | 'auto'
  themePreset: string
  fontSize: 'small' | 'medium' | 'large'
  downloadsFolder: string
  alwaysAskWhereToSave: boolean
  deleteDownloadsAfterPrivateClose: boolean
  downloadPath: string
  downloadAskWhereToSave: boolean
  downloadShowPillWhileActive: boolean
  downloadClearOnQuit: boolean
  downloadHistoryRetention: 'forever' | '30days' | '7days' | '24hours' | 'never'
  hardwareAcceleration: boolean
  sleepingTabsEnabled: boolean
  sleepingTabsMinutes: number
  systemStartOnLogin: boolean
  systemRunInBackground: boolean
  systemProxyMode: 'system' | 'direct'
  systemMemorySaver: 'off' | 'balanced' | 'aggressive'
  autoplayAllowed: boolean
  smoothScrolling: boolean
  ctrlWheelZoom: boolean
  autoCheckUpdates: boolean
  shieldsLevel: 'standard' | 'strict' | 'custom'
  blockTrackers: boolean
  blockAds: boolean
  blockSocialTrackers: boolean
  blockFingerprinters: boolean
  httpsOnly: boolean
  sendDoNotTrack: boolean
  blockPhishing: boolean
  rememberHistory: boolean
  suggestHistory: boolean
  suggestBookmarks: boolean
  suggestOpenTabs: boolean
  defaultSearchEngine: 'duckduckgo' | 'google' | 'brave' | 'startpage'
  aiIncludePageContextDefault: boolean
  aiRememberConversations: boolean
  forceDarkOnWebsites: boolean
  spellcheckEnabled: boolean
  spellcheckLanguages: string[]
  preferredLanguages: string[]
  ntpLayout: 'default' | 'minimal' | 'off'
  ntpShowGreeting: boolean
  ntpShowMascot: boolean
  ntpSearchBarPosition: 'center' | 'top'
  searchPickerVisible: boolean
  searchSuggestionsEnabled: boolean
  searchSuggestSourceBookmarks: boolean
  searchSuggestSourceHistory: boolean
  searchSuggestSourceOpenTabs: boolean
  searchAutocompleteFromHistory: boolean
  a11yDefaultZoom: number
  a11yMinFontSize: number
  a11yReduceMotion: boolean
  a11yCaretBrowsing: boolean
  a11yAlwaysShowFocus: boolean
  a11yLargerCursor: boolean
}

const DEFAULTS: AuraSettings = {
  startupBehavior: 'newtab',
  startupUrl: '',
  openLinksInTabs: true,
  switchToNewTab: false,
  ctrlTabRecentOrder: false,
  askBeforeClosingMultipleTabs: true,
  tabsLayout: 'horizontal',
  showBookmarksBar: true,
  themeMode: 'dark',
  themePreset: 'aura-dark',
  fontSize: 'medium',
  downloadsFolder: app.getPath('downloads'),
  alwaysAskWhereToSave: false,
  deleteDownloadsAfterPrivateClose: true,
  downloadPath: '',
  downloadAskWhereToSave: false,
  downloadShowPillWhileActive: true,
  downloadClearOnQuit: false,
  downloadHistoryRetention: 'forever',
  hardwareAcceleration: true,
  sleepingTabsEnabled: true,
  sleepingTabsMinutes: 30,
  systemStartOnLogin: false,
  systemRunInBackground: false,
  systemProxyMode: 'system',
  systemMemorySaver: 'off',
  autoplayAllowed: true,
  smoothScrolling: true,
  ctrlWheelZoom: true,
  autoCheckUpdates: true,
  shieldsLevel: 'standard',
  blockTrackers: true,
  blockAds: true,
  blockSocialTrackers: true,
  blockFingerprinters: true,
  httpsOnly: true,
  sendDoNotTrack: true,
  blockPhishing: true,
  rememberHistory: true,
  suggestHistory: true,
  suggestBookmarks: true,
  suggestOpenTabs: true,
  defaultSearchEngine: 'google',
  aiIncludePageContextDefault: true,
  aiRememberConversations: true,
  forceDarkOnWebsites: false,
  spellcheckEnabled: true,
  spellcheckLanguages: ['en-US'],
  preferredLanguages: ['en-US', 'en'],
  ntpLayout: 'default',
  ntpShowGreeting: true,
  ntpShowMascot: true,
  ntpSearchBarPosition: 'center',
  searchPickerVisible: true,
  searchSuggestionsEnabled: true,
  searchSuggestSourceBookmarks: true,
  searchSuggestSourceHistory: true,
  searchSuggestSourceOpenTabs: true,
  searchAutocompleteFromHistory: true,
  a11yDefaultZoom: 100,
  a11yMinFontSize: 0,
  a11yReduceMotion: false,
  a11yCaretBrowsing: false,
  a11yAlwaysShowFocus: false,
  a11yLargerCursor: false
}

let cache: Record<string, unknown> = {}
let cacheLoaded = false
let cacheDirty = false

function loadFromDisk(): void {
  try {
    const rows = getDb()
      .prepare('SELECT key, value FROM settings')
      .all() as { key: string; value: string }[]
    cache = {}
    for (const r of rows) {
      try { cache[r.key] = JSON.parse(r.value) } catch { /* skip corrupt */ }
    }
    cacheLoaded = true
    cacheDirty = false
  } catch (err) {
    console.warn('[Aura/settings] loadFromDisk failed:', err)
  }
}

function ensureFresh(): void {
  if (!cacheLoaded || cacheDirty) loadFromDisk()
}

function broadcast(key: string, value: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('settings:changed', { key, value })
    }
  }
}

function migrateLegacyTheme(): void {
  if (cache['theme'] !== undefined && cache['themeMode'] === undefined) {
    const old = cache['theme'] as string
    delete cache['theme']
    if (old === 'light') {
      cache['themeMode'] = 'light'
      cache['themePreset'] = 'aura-light'
    } else if (old === 'dark') {
      cache['themeMode'] = 'dark'
      cache['themePreset'] = 'aura-dark'
    } else if (old === 'auto') {
      cache['themeMode'] = 'auto'
      cache['themePreset'] = 'aura-dark'
    }
  }
}

export function getSetting<K extends keyof AuraSettings>(key: K): AuraSettings[K] {
  ensureFresh()
  migrateLegacyTheme()
  const stored = cache[key as string]
  return (stored !== undefined ? stored : DEFAULTS[key]) as AuraSettings[K]
}

export function getAllSettings(): AuraSettings {
  ensureFresh()
  migrateLegacyTheme()
  return { ...DEFAULTS, ...cache } as AuraSettings
}

export function setSetting<K extends keyof AuraSettings>(
  key: K, value: AuraSettings[K]
): void {
  ensureFresh()
  const db = getDb()
  const now = Date.now()
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key as string, JSON.stringify(value), now)

  cache[key as string] = value
  cacheDirty = true

  broadcast(key as string, value)
}

export function resetSettings(): void {
  getDb().prepare('DELETE FROM settings').run()
  cache = {}
  cacheLoaded = true
  cacheDirty = true
  for (const [k, v] of Object.entries(DEFAULTS)) {
    broadcast(k, v)
  }
}

export function getDefaults(): AuraSettings {
  return { ...DEFAULTS }
}

export function reloadSettings(): void {
  cacheLoaded = false
  cacheDirty = false
  loadFromDisk()
}

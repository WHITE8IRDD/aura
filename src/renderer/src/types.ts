import type { AuraApi } from '../../preload/index'

declare global {
  interface Window {
    aura: AuraApi
  }
}

export interface AiConversation {
  id: number
  title: string
  pageUrl: string | null
  pageTitle: string | null
  createdAt: number
  updatedAt: number
}

export interface AiConversationMessage {
  id: number
  conversationId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}

export interface AiProviderConfig {
  id: 'mock' | 'openai' | 'anthropic' | 'ollama'
  hasKey: boolean
  defaultModel?: string
  baseUrl?: string
}

export interface TabState {
  id: number
  url: string
  title: string
  favicon: string | null
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  internal: boolean
  pinned: boolean
  muted: boolean
  zoomFactor: number
  findMatches: { current: number; total: number } | null
  sleeping: boolean
  lastActiveAt: number
  groupId: string | null
  hasAudio: boolean
  fullscreen: boolean
}

export interface ReadingItem {
  id: number
  url: string
  title: string
  excerpt: string | null
  addedAt: number
  readAt: number | null
}

export interface Boost {
  id: number
  host: string
  name: string
  css: string
  enabled: boolean
  createdAt: number
}

export interface SidebarPanel {
  id: number
  url: string
  title: string
  iconUrl: string | null
  sortOrder: number
  createdAt: number
}

export interface TabGroup {
  id: string
  name: string
  color: string
  collapsed: boolean
  tabIds: number[]
}

export interface HistoryEntry {
  url: string
  title: string
  visitedAt: number
  visitCount: number
}

export interface Suggestion {
  type: 'history' | 'search' | 'url' | 'bookmark' | 'open-tab'
  label: string
  hint?: string
  url: string
  favicon?: string
}

export interface Bookmark {
  id: number
  url: string
  title: string
  folderId: number | null
  createdAt: number
  sortOrder: number
}

export interface BookmarkFolder {
  id: number
  name: string
  createdAt: number
}

export interface DownloadRecord {
  id: number
  url: string
  filename: string
  savePath: string
  mimeType: string | null
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  startedAt: number
  completedAt: number | null
}

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

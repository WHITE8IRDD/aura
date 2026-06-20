export interface SearchEntry {
  section: string
  label: string
  keywords: string[]
  group?: string
}

export const SEARCH_INDEX: SearchEntry[] = [
  { section: 'general', label: 'Startup behavior', keywords: ['startup', 'launch', 'open', 'new tab', 'restore', 'session', 'specific url'] },
  { section: 'general', label: 'Tab behavior', keywords: ['tab', 'tabs', 'open links', 'switch', 'ctrl tab', 'close', 'multiple'] },
  { section: 'general', label: 'Tab layout', keywords: ['tab layout', 'horizontal', 'vertical', 'sidebar'] },
  { section: 'general', label: 'Bookmarks bar', keywords: ['bookmarks', 'bookmarks bar', 'show bookmarks'] },
  { section: 'general', label: 'Theme', keywords: ['theme', 'dark', 'light', 'appearance', 'background'] },
  { section: 'general', label: 'Font size', keywords: ['font', 'size', 'text', 'zoom'] },
  { section: 'downloads', label: 'Download folder', keywords: ['download', 'folder', 'path', 'location', 'save', 'directory'] },
  { section: 'downloads', label: 'Ask where to save', keywords: ['ask', 'save', 'dialog', 'prompt', 'choose'] },
  { section: 'downloads', label: 'Download history retention', keywords: ['history', 'retention', 'keep', 'old', 'clear', 'delete'] },
  { section: 'downloads', label: 'Clear history on quit', keywords: ['clear', 'quit', 'close', 'exit', 'wipe'] },
  { section: 'general', label: 'Hardware acceleration', keywords: ['hardware', 'acceleration', 'gpu', 'performance'] },
  { section: 'general', label: 'Sleeping tabs', keywords: ['sleep', 'sleeping', 'tabs', 'inactive', 'memory', 'performance'] },
  { section: 'general', label: 'Media autoplay', keywords: ['autoplay', 'media', 'video', 'audio', 'play'] },
  { section: 'general', label: 'Smooth scrolling', keywords: ['smooth', 'scroll', 'scrolling'] },
  { section: 'general', label: 'Ctrl+Wheel zoom', keywords: ['ctrl', 'wheel', 'zoom', 'scroll zoom'] },
  { section: 'general', label: 'Auto-check updates', keywords: ['update', 'updates', 'auto', 'check'] },
  { section: 'general', label: 'Default search engine', keywords: ['search', 'engine', 'default', 'google', 'duckduckgo', 'bing', 'brave'] },

  { section: 'privacy', label: 'Shields level', keywords: ['shields', 'privacy', 'security', 'standard', 'strict', 'custom', 'level'] },
  { section: 'privacy', label: 'Block trackers', keywords: ['tracker', 'trackers', 'block', 'privacy'] },
  { section: 'privacy', label: 'Block ads', keywords: ['ads', 'ad', 'block', 'adblock'] },
  { section: 'privacy', label: 'Block social trackers', keywords: ['social', 'tracker', 'facebook', 'twitter', 'block'] },
  { section: 'privacy', label: 'Block fingerprinters', keywords: ['fingerprint', 'fingerprinting', 'block', 'privacy'] },
  { section: 'privacy', label: 'HTTPS-Only mode', keywords: ['https', 'ssl', 'tls', 'secure', 'encrypt'] },
  { section: 'privacy', label: 'Do Not Track', keywords: ['do not track', 'dnt', 'track', 'privacy'] },
  { section: 'privacy', label: 'Block phishing', keywords: ['phishing', 'malware', 'security', 'block', 'dangerous'] },
  { section: 'privacy', label: 'Remember history', keywords: ['history', 'remember', 'browsing'] },
  { section: 'privacy', label: 'Suggest history', keywords: ['suggest', 'history', 'autocomplete', 'url bar'] },
  { section: 'privacy', label: 'Suggest bookmarks', keywords: ['suggest', 'bookmarks', 'autocomplete'] },
  { section: 'privacy', label: 'Suggest open tabs', keywords: ['suggest', 'tab', 'open tabs', 'autocomplete'] },

  { section: 'autofill', label: 'Autofill', keywords: ['autofill', 'form', 'save', 'fill', 'profile'] },
  { section: 'autofill', label: 'Saved passwords', keywords: ['password', 'passwords', 'vault', 'credentials'] }
]

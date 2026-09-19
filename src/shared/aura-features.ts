// ---------- Feature 1: Snoozing ----------
export interface SnoozeSettings {
  enabled: boolean
  idleMinutes: number // 1..1440, default 15
  snoozePinned: boolean
  snoozeAudible: boolean
  neverSnoozeHosts: string[]
}

export const DEFAULT_SNOOZE_SETTINGS: SnoozeSettings = {
  enabled: true,
  idleMinutes: 15,
  snoozePinned: false,
  snoozeAudible: false,
  neverSnoozeHosts: [
    'mail.google.com',
    'docs.google.com',
    'calendar.google.com',
    'meet.google.com',
    'figma.com',
    'notion.so',
    'web.whatsapp.com',
    'discord.com',
    'app.slack.com',
    'teams.microsoft.com',
  ],
}

export interface TabSnoozeStatePatch {
  tabId: string
  snoozed: boolean
  approxFreedMB?: number
}

// ---------- Feature 2: Gestures ----------
export interface GestureSettings {
  enabled: boolean
  doubleTapSeekSeconds: number // default 10
  centerDeadZone: number // 0..0.8, fraction of width in middle NOT intercepted
  skipIntroSeconds: number // default 85
  volumeStep: number // default 0.05
  speedStep: number // default 0.25
  minSpeed: number // default 0.25
  maxSpeed: number // default 4
  disabledHosts: string[]
}

export const DEFAULT_GESTURE_SETTINGS: GestureSettings = {
  enabled: true,
  doubleTapSeekSeconds: 10,
  centerDeadZone: 0.3,
  skipIntroSeconds: 85,
  volumeStep: 0.05,
  speedStep: 0.25,
  minSpeed: 0.25,
  maxSpeed: 4,
  disabledHosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
}

// ---------- Feature 3: Dark Mode ----------
export type DarkPreset = 'oled' | 'charcoal' | 'amber'
export type DarkSiteRule = DarkPreset | 'off'
export const DARK_PRESETS: DarkPreset[] = ['oled', 'charcoal', 'amber']

export interface DarkModeState {
  preset: DarkPreset | null // null = no dark mode on this page
  forced: boolean // true when user set a per-site rule (skips auto-dark detection)
}

// ---------- API exposed to Browser UI (Chrome) only ----------
export interface AuraFeaturesApi {
  snooze: {
    getSettings(): Promise<SnoozeSettings>
    setSettings(patch: Partial<SnoozeSettings>): Promise<SnoozeSettings>
    snoozeTab(tabId: string): Promise<boolean>
    snoozeOthers(exceptTabId: string | null): Promise<number>
    wakeTab(tabId: string): Promise<void>
    stats(): Promise<{ snoozedCount: number; approxFreedMB: number }>
    onTabState(cb: (p: TabSnoozeStatePatch) => void): () => void
  }
  gestures: {
    getSettings(): Promise<GestureSettings>
    setSettings(patch: Partial<GestureSettings>): Promise<GestureSettings>
  }
  darkMode: {
    get(host: string): Promise<{ state: DarkModeState; rule: DarkSiteRule | null; globalPreset: DarkPreset | null }>
    setSite(host: string, rule: DarkSiteRule | null): Promise<void>
    setGlobal(preset: DarkPreset | null): Promise<void>
  }
}

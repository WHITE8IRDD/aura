import { app } from 'electron'
import { getSetting } from './settings'
import { applySpellcheckToSession } from './languages'

interface CleanupFn { unregister: () => void }
const headerCleanups = new WeakMap<Electron.Session, CleanupFn>()
const knownSessions = new Set<Electron.Session>()

export function applyStartupFlags(): void {
  try {
    if (getSetting('hardwareAcceleration') === false) {
      app.disableHardwareAcceleration()
      console.log('[Aura/startup] Hardware acceleration: DISABLED')
    }
    if (getSetting('a11yCaretBrowsing') === true) {
      app.commandLine.appendSwitch('enable-blink-features', 'CaretBrowsing')
    }
  } catch {
    // settings not ready
  }
}

export function applyHardwareAccelLater(): void {
  try {
    if (getSetting('hardwareAcceleration') === false) {
      console.log('[Aura/bridge] hardwareAcceleration is OFF — restart required to take effect')
    }
  } catch {
    // settings not ready
  }
}

export function applyForceDarkFlag(): void {
  try {
    if (getSetting('forceDarkOnWebsites') === true) {
      app.commandLine.appendSwitch('blink-settings', 'forceDarkModeEnabled=true')
      console.log('[Aura/startup] Force dark mode on websites: ENABLED')
    }
  } catch {
    // settings not ready
  }
}

function applyHeadersToSession(targetSession: Electron.Session): void {
  const existing = headerCleanups.get(targetSession)
  if (existing) existing.unregister()

  const headers: Record<string, string> = {}

  if (getSetting('sendDoNotTrack')) {
    headers['DNT'] = '1'
    headers['Sec-GPC'] = '1'
  }

  const preferred = getSetting('preferredLanguages')
  if (preferred && preferred.length > 0) {
    headers['Accept-Language'] = preferred.join(', ')
  }

  if (Object.keys(headers).length > 0) {
    const handler = (
      details: Electron.OnBeforeSendHeadersListenerDetails,
      cb: (response: Electron.BeforeSendResponse) => void
    ): void => {
      cb({ requestHeaders: { ...details.requestHeaders, ...headers } })
    }
    targetSession.webRequest.onBeforeSendHeaders(handler)
    headerCleanups.set(targetSession, {
      unregister: () => targetSession.webRequest.onBeforeSendHeaders(null)
    })
  }
}

function applySettingToSession(targetSession: Electron.Session, key: string): void {
  switch (key) {
    case 'sendDoNotTrack':
    case 'preferredLanguages':
      applyHeadersToSession(targetSession)
      break
    case 'spellcheckEnabled':
    case 'spellcheckLanguages':
      applySpellcheckToSession(targetSession)
      break
  }
}

export function applyAllSettings(targetSession: Electron.Session): void {
  applyHeadersToSession(targetSession)
  applySpellcheckToSession(targetSession)
}

export function registerSession(s: Electron.Session): void {
  knownSessions.add(s)
  applyAllSettings(s)
}

export function broadcastSettingChange(key: string): void {
  for (const s of knownSessions) {
    applySettingToSession(s, key)
  }
}

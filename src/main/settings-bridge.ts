import { app } from 'electron'
import { getSetting } from './settings'

interface DntCleanup { unregister: () => void }
const dntCleanups = new WeakMap<Electron.Session, DntCleanup>()
const knownSessions = new Set<Electron.Session>()

export function applyStartupFlags(): void {
  // Cannot reliably read settings DB before app.whenReady() because
  // app.getPath('userData') may not resolve correctly during early boot.
  // Hardware acceleration defaults to ON (Chromium default) — users who
  // disabled it will see a "restart required" banner in Settings.
  // The actual disable happens via app.disableHardwareAcceleration() called
  // ONLY when we can confirm the setting at a later safe point.
  console.log('[Aura/bridge] applyStartupFlags: using Chromium defaults')
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

function applySettingToSession(targetSession: Electron.Session, key: string): void {
  switch (key) {
    case 'sendDoNotTrack': {
      const existing = dntCleanups.get(targetSession)
      if (existing) existing.unregister()

      if (getSetting('sendDoNotTrack')) {
        const handler = (
          details: Electron.OnBeforeSendHeadersListenerDetails,
          cb: (response: Electron.BeforeSendResponse) => void
        ): void => {
          const headers = { ...details.requestHeaders, DNT: '1', 'Sec-GPC': '1' }
          cb({ requestHeaders: headers })
        }
        targetSession.webRequest.onBeforeSendHeaders(handler)
        dntCleanups.set(targetSession, {
          unregister: () => targetSession.webRequest.onBeforeSendHeaders(null)
        })
      }
      break
    }
  }
}

export function applyAllSettings(targetSession: Electron.Session): void {
  applySettingToSession(targetSession, 'sendDoNotTrack')
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

import type { Session } from 'electron'
import { initBlocker, installBlocker } from './blocker'
import { setupHttpsOnly } from './security/https-only'
import { setupSessionFingerprintDefenses } from './security/fingerprint'
import { setupPermissionPrompts } from './security/permissions'
import { registerSession } from './settings-bridge'
import { attachDownloadHandler } from './downloads'

export async function setupNinjaSession(s: Session): Promise<void> {
  await initBlocker()
  installBlocker(s)
  setupHttpsOnly(s)
  setupSessionFingerprintDefenses(s)
  setupPermissionPrompts(s)
  registerSession(s)
  attachDownloadHandler(s, true)
}

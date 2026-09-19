import type { Session } from 'electron'
import { installBlockerOnSession } from './blocker'
import { setupSessionFingerprintDefenses } from './security/fingerprint'
import { setupPermissionPrompts } from './security/permissions'
import { registerSession } from './settings-bridge'
import { attachDownloadHandler } from './downloads'

export async function setupNinjaSession(s: Session): Promise<void> {
  installBlockerOnSession(s)
  setupSessionFingerprintDefenses(s)
  setupPermissionPrompts(s)
  registerSession(s)
  attachDownloadHandler(s, true)
}

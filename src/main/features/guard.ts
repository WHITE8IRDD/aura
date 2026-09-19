import type { WebContents } from 'electron'
import { isRegisteredTab } from '../blocker'

/**
 * Chrome-UI gate for mutating feature IPC. Tab page contexts must never be
 * able to call these channels: a sender is trusted when it is NOT a
 * registered tab WebContents (the app's own windows/popovers are never
 * registered with the blocker). Floating popover routes are additionally
 * allow-listed by URL so a registration bug can never lock out the UI.
 */
export function isChromeUi(sender: WebContents): boolean {
  try {
    if (sender.isDestroyed()) return false
    if (!isRegisteredTab(sender.id)) return true
    const url = sender.getURL()
    return url.includes('#/darkmode-popover') || url.includes('#/shields-popover')
  } catch {
    return false
  }
}

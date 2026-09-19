import type { WebContents } from 'electron'
import { isRegisteredTab } from '../blocker'

/**
 * Chrome-UI gate for mutating feature IPC. Tab page contexts must never be
 * able to call these channels: a sender is trusted only when it is NOT a
 * registered tab WebContents (the app's own windows/popovers are never
 * registered with the blocker).
 */
export function isChromeUi(sender: WebContents): boolean {
  try {
    if (sender.isDestroyed()) return false
    return !isRegisteredTab(sender.id)
  } catch {
    return false
  }
}

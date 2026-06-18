import { BrowserWindow, type Session } from 'electron'

interface PendingPermission {
  id: number
  origin: string
  permission: string
  callback: (granted: boolean) => void
}

let nextRequestId = 1
const pending = new Map<number, PendingPermission>()
const sessionDecisions = new Map<string, boolean>()

export function setupPermissionPrompts(targetSession: Session): void {
  targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = (() => {
      try {
        return new URL(details.requestingUrl).origin
      } catch {
        return webContents.getURL()
      }
    })()

    const key = `${origin}:${permission}`
    const remembered = sessionDecisions.get(key)
    if (remembered !== undefined) {
      callback(remembered)
      return
    }

    const id = nextRequestId++
    pending.set(id, { id, origin, permission, callback })

    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('permission:request', { id, origin, permission })
    }
  })
}

export function respondToPermission(id: number, granted: boolean, remember: boolean): void {
  const req = pending.get(id)
  if (!req) return
  pending.delete(id)
  if (remember) {
    sessionDecisions.set(`${req.origin}:${req.permission}`, granted)
  }
  req.callback(granted)
}

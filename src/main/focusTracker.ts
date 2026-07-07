import { WebContents, webContents as wcAPI, app } from 'electron'

let lastFocusedId: number | null = null
let mainWindowRef: Electron.BrowserWindow | null = null
const excluded = new Set<number>()

export function excludeFromFocusTracking(id: number): void {
  excluded.add(id)
}

export function initFocusTracker(mainWindow: Electron.BrowserWindow): void {
  mainWindowRef = mainWindow
  lastFocusedId = mainWindow.webContents.id

  const attach = (wc: WebContents) => {
    wc.on('focus', () => {
      if (excluded.has(wc.id)) return
      lastFocusedId = wc.id
    })
    wc.on('destroyed', () => { excluded.delete(wc.id) })
  }

  wcAPI.getAllWebContents().forEach(attach)
  app.on('web-contents-created', (_e, wc) => attach(wc))
}

export function getLastFocusedWebContents(): WebContents | null {
  if (lastFocusedId == null) return mainWindowRef?.webContents ?? null
  const wc = wcAPI.fromId(lastFocusedId)
  if (!wc || wc.isDestroyed()) return mainWindowRef?.webContents ?? null
  return wc
}

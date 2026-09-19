import { BrowserWindow, ipcMain } from 'electron'
import { TabManager } from '../tabs'
import { isChromeUi } from './guard'
import { TabSnoozer, getSnoozeSettings, setSnoozeSettings } from './snooze'

let snoozer: TabSnoozer | null = null

export function getSnoozer(): TabSnoozer | null {
  return snoozer
}

export interface FeaturesDeps {
  getMainWindow: () => BrowserWindow | null
}

/** Call once from createWindow(), after the main TabManager exists. */
export function initFeatures(_deps: FeaturesDeps): void {
  if (snoozer) return
  snoozer = new TabSnoozer({
    managers: () => TabManager.getAll(),
    sendToChrome: (channel, ...args) => {
      const wins = new Set<BrowserWindow>()
      const main = _deps.getMainWindow()
      if (main && !main.isDestroyed()) wins.add(main)
      for (const m of TabManager.getAll()) {
        try {
          const w = m.getWindow()
          if (w && !w.isDestroyed()) wins.add(w)
        } catch { /* ignore */ }
      }
      for (const w of wins) {
        try {
          w.webContents.send(channel, ...args)
        } catch { /* window gone */ }
      }
    },
  })
  for (const m of TabManager.getAll()) snoozer.attachManager(m)
  snoozer.start()
  registerSnoozeIpc()
}

function toTabId(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function registerSnoozeIpc(): void {
  ipcMain.handle('features:snooze-get-settings', (e) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    return getSnoozeSettings()
  })
  ipcMain.handle('features:snooze-set-settings', (e, patch: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const p = (patch ?? {}) as Partial<ReturnType<typeof getSnoozeSettings>>
    return setSnoozeSettings(p)
  })
  ipcMain.handle('features:snooze-tab', async (e, tabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const id = toTabId(tabId)
    if (id === null || !snoozer) return false
    return snoozer.snooze(id, 'manual')
  })
  ipcMain.handle('features:snooze-others', async (e, exceptTabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    if (!snoozer) return 0
    const except = exceptTabId == null ? null : toTabId(exceptTabId)
    return snoozer.snoozeOthers(except)
  })
  ipcMain.handle('features:snooze-wake', (e, tabId: unknown) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    const id = toTabId(tabId)
    if (id === null || !snoozer) return
    snoozer.wake(id)
  })
  ipcMain.handle('features:snooze-stats', (e) => {
    if (!isChromeUi(e.sender)) throw new Error('features: untrusted sender')
    return snoozer ? snoozer.stats() : { snoozedCount: 0, approxFreedMB: 0 }
  })
}

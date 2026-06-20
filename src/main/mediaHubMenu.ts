import { Menu, MenuItemConstructorOptions, BrowserWindow, ipcMain } from 'electron'
import { getActiveMediaTabs } from './mediaController'

export type MediaHubAction =
  | { type: 'toggle'; wcId: number }
  | { type: 'prev'; wcId: number }
  | { type: 'next'; wcId: number }
  | { type: 'mute'; wcId: number; muted: boolean }
  | { type: 'focus'; wcId: number }
  | null

function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '\u2026' : s
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return '' }
}

export function showMediaHubMenu(win: BrowserWindow): Promise<MediaHubAction> {
  return new Promise((resolve) => {
    let resolved = false
    const respond = (action: MediaHubAction) => {
      if (resolved) return
      resolved = true
      resolve(action)
    }

    const tabs = getActiveMediaTabs()

    if (tabs.length === 0) {
      respond(null)
      return
    }

    const template: MenuItemConstructorOptions[] = []

    template.push({
      label: `\u266A Now playing \u2014 ${tabs.length} tab${tabs.length === 1 ? '' : 's'}`,
      enabled: false
    })
    template.push({ type: 'separator' })

    tabs.forEach((tab) => {
      const tabLabel = truncate(tab.title || 'Untitled', 40)
      const domain = extractDomain(tab.url)
      const statusPrefix = tab.muted ? '\uD83D\uDD07 ' : (tab.playing ? '\u25B6 ' : '\u23F8 ')

      template.push({
        label: `${statusPrefix}${tabLabel}`,
        sublabel: domain,
        submenu: [
          {
            label: tab.playing ? 'Pause' : 'Play',
            click: () => respond({ type: 'toggle', wcId: tab.id })
          },
          {
            label: 'Previous track',
            click: () => respond({ type: 'prev', wcId: tab.id })
          },
          {
            label: 'Next track',
            click: () => respond({ type: 'next', wcId: tab.id })
          },
          { type: 'separator' },
          {
            label: tab.muted ? 'Unmute' : 'Mute',
            click: () => respond({ type: 'mute', wcId: tab.id, muted: !tab.muted })
          },
          { type: 'separator' },
          {
            label: 'Switch to this tab',
            click: () => respond({ type: 'focus', wcId: tab.id })
          }
        ]
      })
    })

    if (tabs.length === 1) {
      const tab = tabs[0]
      template.push({ type: 'separator' })
      template.push({
        label: tab.playing ? '\u23F8 Pause' : '\u25B6 Play',
        click: () => respond({ type: 'toggle', wcId: tab.id })
      })
      template.push({
        label: '\u23EE Previous',
        click: () => respond({ type: 'prev', wcId: tab.id })
      })
      template.push({
        label: '\u23ED Next',
        click: () => respond({ type: 'next', wcId: tab.id })
      })
      template.push({
        label: tab.muted ? '\uD83D\uDD0A Unmute' : '\uD83D\uDD07 Mute',
        click: () => respond({ type: 'mute', wcId: tab.id, muted: !tab.muted })
      })
      template.push({ type: 'separator' })
      template.push({
        label: 'Switch to tab',
        click: () => respond({ type: 'focus', wcId: tab.id })
      })
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({
      window: win,
      callback: () => respond(null)
    })
  })
}

export function registerMediaHubMenuIPC(): void {
  ipcMain.handle('mediaHub:show', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return showMediaHubMenu(win)
  })
}

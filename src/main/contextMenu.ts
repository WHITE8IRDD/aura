import { Menu, MenuItem, WebContents, BrowserWindow, clipboard } from 'electron'
import type { TabManager } from './tabs'
import { searchUrl } from './url'
import { addBookmark } from './bookmarks'
import { getSetting } from './settings'

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'dclid', 'yclid', 'wbraid', 'gbraid',
  'ref', 'ref_src', 'ref_url', 'referrer', 'source', 'origin',
  '_ga', '_gl', 'mc_eid', 'mc_cid', 'igshid', 'si', 'vero_id', 'vero_conv'
]

function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url)
    for (const k of TRACKING_PARAMS) u.searchParams.delete(k)
    return u.toString()
  } catch {
    return url
  }
}

function engineDisplayName(engine: string): string {
  switch (engine) {
    case 'google': return 'Google'
    case 'duckduckgo': return 'DuckDuckGo'
    case 'brave': return 'Brave'
    case 'startpage': return 'Startpage'
    default: return 'Web'
  }
}

function truncate(s: string, n: number): string {
  if (!s) return ''
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > n ? clean.slice(0, n) + '\u2026' : clean
}

export function attachContextMenu(
  wc: WebContents,
  win: BrowserWindow,
  tabs: TabManager
): void {
  wc.on('context-menu', (_event, params) => {
    if (params.linkURL) {
      const url = params.linkURL
      const linkText = params.linkText || url
      const engine = getSetting('defaultSearchEngine') as string
      const engineName = engineDisplayName(engine)
      const truncatedText = truncate(linkText, 30)

      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: 'Open Link in New Tab',
          click: () => { tabs.create(url) }
        },
        {
          label: 'Open Link in Ninja Window',
          click: () => { win.webContents.send('cm:openInNinja', url) }
        },
        { type: 'separator' },
        {
          label: 'Bookmark Link\u2026',
          click: () => {
            addBookmark(url, linkText || url, null)
            win.webContents.send('bookmarks:update')
          }
        },
        {
          label: 'Copy Link',
          click: () => clipboard.writeText(url)
        },
        {
          label: 'Copy Clean Link',
          click: () => clipboard.writeText(stripTrackingParams(url))
        },
        { type: 'separator' },
        {
          label: `Search ${engineName} for "${truncatedText}"`,
          click: () => {
            tabs.create(searchUrl(linkText))
          }
        }
      ]

      const menu = Menu.buildFromTemplate(template)
      menu.popup({ window: win })
      return
    }

    if (params.mediaType === 'video') {
      const menu = new Menu()
      menu.append(new MenuItem({
        label: 'Picture in Picture',
        click: () => { tabs.pictureInPicture(tabs.getActiveId()!) }
      }))
      menu.popup({ window: win })
    }
  })
}

import { Menu, MenuItem, WebContents, BrowserWindow, clipboard, net, nativeImage } from 'electron'
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

function looksLikeUrl(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (trimmed.length > 2048) return false
  if (/^https?:\/\/\S+\.\S+/i.test(trimmed)) return true
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(trimmed)) return true
  return false
}

function normalizeUrl(text: string): string {
  const trimmed = text.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return 'https://' + trimmed
}

async function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const req = net.request(url)
      const chunks: Buffer[] = []
      req.on('response', (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      req.on('error', reject)
      req.end()
    } catch (err) {
      reject(err)
    }
  })
}

export function attachContextMenu(
  wc: WebContents,
  win: BrowserWindow,
  tabs: TabManager
): void {
  wc.on('context-menu', (event, params) => {
    event.preventDefault()

    // PiP for video elements takes priority
    if (params.mediaType === 'video') {
      const menu = new Menu()
      menu.append(new MenuItem({
        label: 'Picture in Picture',
        click: () => { tabs.pictureInPicture(tabs.getActiveId()!) }
      }))
      menu.popup({ window: win })
      return
    }

    const hasLink = !!params.linkURL
    const hasImage = params.hasImageContents && !!params.srcURL
    const hasSelection = !!(params.selectionText && params.selectionText.trim())

    if (!hasLink && !hasImage && !hasSelection) {
      const menu = new Menu()
      menu.append(new MenuItem({
        label: 'Save all images on this page\u2026',
        click: () => {
          win.webContents.send('imageSaver:requestOpenFloating', {
            srcURL: '',
            pageRectX: params.x,
            pageRectY: params.y,
            sourceWcId: wc.id
          })
        }
      }))
      menu.popup({ window: win })
      return
    }

    const template: Electron.MenuItemConstructorOptions[] = []

    if (hasLink) {
      const url = params.linkURL
      const linkText = params.linkText || url
      const engine = getSetting('defaultSearchEngine') as string
      const engineName = engineDisplayName(engine)
      const truncatedText = truncate(linkText, 30)

      template.push(
        { label: 'Open Link in New Tab', click: () => tabs.create(url) },
        { label: 'Open Link in Ninja Window', click: () => win.webContents.send('cm:openInNinja', url) },
        { type: 'separator' },
        { label: 'Bookmark Link\u2026', click: () => {
          addBookmark(url, linkText || url, null)
          win.webContents.send('bookmarks:update')
        }},
        { label: 'Copy Link', click: () => clipboard.writeText(url) },
        { label: 'Copy Clean Link', click: () => clipboard.writeText(stripTrackingParams(url)) },
        { type: 'separator' },
        { label: `Search ${engineName} for "${truncatedText}"`, click: () => tabs.create(searchUrl(linkText)) }
      )

      // If user also selected text, show Translate for the selection
      const linkSelText = params.selectionText?.trim()
      if (linkSelText) {
        const linkSelTrunc = truncate(linkSelText, 30)
        template.push(
          { type: 'separator' },
          {
            label: `Translate "${linkSelTrunc}"`,
            click: () => {
              win.webContents.send('translator:requestOpenFloating', {
                text: linkSelText,
                pageRectX: params.x,
                pageRectY: params.y
              })
            }
          }
        )
      }
    }

    if (hasImage) {
      const srcURL = params.srcURL

      if (hasLink) template.push({ type: 'separator' })

      template.push(
        { label: 'Open Image in New Tab', click: () => tabs.create(srcURL) },
        {
          label: 'Copy Image',
          click: async () => {
            try {
              const buf = await downloadBuffer(srcURL)
              const img = nativeImage.createFromBuffer(buf)
              if (img.isEmpty()) {
                console.warn('[Aura/cm] copyImage: decoded image is empty')
                return
              }
              clipboard.writeImage(img)
            } catch (err) {
              console.error('[Aura/cm] copyImage failed:', err)
            }
          }
        },
        { label: 'Copy Image Link', click: () => clipboard.writeText(srcURL) },
        { type: 'separator' },
        {
           label: 'Save with options\u2026',
           click: () => {
              win.webContents.send('imageSaver:requestOpenFloating', {
                 srcURL,
                 pageRectX: params.x,
                 pageRectY: params.y,
                 sourceWcId: wc.id
               })
             }
           },
        { type: 'separator' },
        {
          label: 'Reverse Image Search',
          click: () => {
            const searchURL = `https://duckduckgo.com/?q=${encodeURIComponent(srcURL)}&iax=images&ia=images`
            tabs.create(searchURL)
          }
        }
      )
    }

    if (hasSelection && !hasLink && !hasImage) {
      const selText = params.selectionText.trim()
      const truncated = truncate(selText, 30)
      const engine = getSetting('defaultSearchEngine') as string
      const engineName = engineDisplayName(engine)
      const selIsUrl = looksLikeUrl(selText)

      template.push({
        label: 'Copy',
        click: () => clipboard.writeText(selText)
      })

      template.push({ type: 'separator' })

      template.push({
        label: `Search ${engineName} for "${truncated}"`,
        click: () => { tabs.create(searchUrl(selText)) }
      })

      template.push({
        label: `Translate "${truncated}"`,
        click: () => {
          win.webContents.send('translator:requestOpenFloating', {
            text: selText,
            pageRectX: params.x,
            pageRectY: params.y
          })
        }
      })

      if (selIsUrl) {
        template.push({
          label: 'Open Link',
          click: () => { tabs.create(normalizeUrl(selText)) }
        })
      }
    }

    if (template.length === 0) return

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: win })
  })
}

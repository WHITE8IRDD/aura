import { BrowserWindow, ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent, Rectangle, WebContents } from 'electron'
import { flushBlockedCounts, getSiteShields, setSiteShieldsLevel, cleanDomain } from './shields-store'
import type { ShieldsLevel } from './shields-store'
import {
  getPageCount, isRegisteredTab, noteDomBlocked, noteGesture,
} from './index'
import {
  getShieldsPopoverWebContents, hideShieldsPopover, toggleShieldsPopover,
} from './shields-popover'
import { hostOf, isYouTubeHost, registrableDomain } from './util'
import {
  AD_FRAME_HOSTS, POPUNDER_DOMAINS, POPUNDER_PATH_PATTERN,
} from './constants'

export interface ShieldsIpcDeps {
  getMainWindow: () => BrowserWindow | null
  getTabWebContents: (tabId?: string | number | null) => WebContents | null
}

export interface ShieldsState {
  domain: string
  level: ShieldsLevel
  pageCount: number
  lifetimeCount: number
}

function stateFor(wc: WebContents): ShieldsState {
  const domain = cleanDomain(hostOf(wc.getURL()))
  const s = getSiteShields(domain)
  return { domain, level: s.level, pageCount: getPageCount(wc.id), lifetimeCount: s.blockedCount }
}

export function registerShieldsIpc(deps: ShieldsIpcDeps): void {
  const assertUi = (e: IpcMainEvent | IpcMainInvokeEvent): void => {
    const ok = e.sender === deps.getMainWindow()?.webContents || e.sender === getShieldsPopoverWebContents()
    if (!ok) throw new Error('shields: untrusted sender')
  }

  ipcMain.on('shields:get-config', (e, hostArg: unknown) => {
    if (!isRegisteredTab(e.sender.id)) {
      e.returnValue = null
      return
    }
    const host = cleanDomain(hostOf(e.senderFrame?.url) || String(hostArg ?? ''))
    const s = getSiteShields(host)
    e.returnValue = {
      level: s.level,
      exempt: isYouTubeHost(host),
      site: registrableDomain(host),
      strict: s.level === 'aggressive',
      floating: s.blockAnnoyances,
      popunderHosts: [...POPUNDER_DOMAINS],
      adFrameHosts: [...AD_FRAME_HOSTS],
      popunderPath: { source: POPUNDER_PATH_PATTERN.source, flags: POPUNDER_PATH_PATTERN.flags },
    }
  })

  ipcMain.on('shields:gesture', (e, href: unknown) => {
    noteGesture(e.sender.id, typeof href === 'string' ? href : '')
  })

  ipcMain.on('shields:dom-blocked', (e, n: unknown) => {
    const count = Number(n)
    if (Number.isFinite(count) && count > 0) noteDomBlocked(e.sender, count)
  })

  ipcMain.handle('shields:get-state', (e, tabId?: string | number | null): ShieldsState | null => {
    assertUi(e)
    const wc = deps.getTabWebContents(tabId)
    return wc && !wc.isDestroyed() ? stateFor(wc) : null
  })

  ipcMain.handle('shields:set-level', (e, tabId: string | number | null, level: unknown): ShieldsState | null => {
    assertUi(e)
    if (level !== 'off' && level !== 'standard' && level !== 'aggressive') throw new Error('invalid level')
    const wc = deps.getTabWebContents(tabId)
    if (!wc || wc.isDestroyed()) return null
    const domain = cleanDomain(hostOf(wc.getURL()))
    if (!domain) return null
    setSiteShieldsLevel(domain, level)
    flushBlockedCounts()
    wc.reload()
    return stateFor(wc)
  })

  ipcMain.handle('shields:open-popover', (e, tabId: string | number | null, anchor: Rectangle) => {
    assertUi(e)
    const win = deps.getMainWindow()
    const wc = deps.getTabWebContents(tabId)
    if (!win) {
      console.warn('[Aura/Shields] open-popover: no main window')
      return false
    }
    if (!wc || wc.isDestroyed() || !/^https?:/i.test(wc.getURL())) {
      console.warn('[Aura/Shields] open-popover: no usable tab webContents')
      return false
    }
    const domain = cleanDomain(hostOf(wc.getURL()))
    toggleShieldsPopover(win, { tabId: tabId ?? null, domain }, anchor)
    return true
  })

  ipcMain.handle('shields:close-popover', (e) => {
    assertUi(e)
    hideShieldsPopover()
  })
}

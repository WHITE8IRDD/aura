import { Menu, MenuItemConstructorOptions, BrowserWindow, ipcMain } from 'electron'

export interface TabMenuContext {
  tabId: number
  muted: boolean
  pinned: boolean
  inGroup: boolean
  isActive: boolean
  canCloseOthers: boolean
  canReopenClosed: boolean
}

export type TabMenuAction =
  | { type: 'new-tab' }
  | { type: 'reload' }
  | { type: 'mute-toggle' }
  | { type: 'pin-toggle' }
  | { type: 'unload' }
  | { type: 'duplicate' }
  | { type: 'bookmark'; url?: string; title?: string }
  | { type: 'add-to-new-group' }
  | { type: 'remove-from-group' }
  | { type: 'close' }
  | { type: 'close-others' }
  | { type: 'close-right' }
  | { type: 'close-duplicates' }
  | { type: 'reopen-closed' }
  | null

export function showTabContextMenu(
  win: BrowserWindow,
  ctx: TabMenuContext
): Promise<TabMenuAction> {
  return new Promise((resolve) => {
    let resolved = false
    const respond = (action: TabMenuAction) => {
      if (resolved) return
      resolved = true
      resolve(action)
    }

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'New Tab Below',
        click: () => respond({ type: 'new-tab' })
      },
      { type: 'separator' },
      {
        label: 'Reload Tab',
        click: () => respond({ type: 'reload' })
      },
      {
        label: ctx.muted ? 'Unmute Tab' : 'Mute Tab',
        click: () => respond({ type: 'mute-toggle' })
      },
      {
        label: ctx.pinned ? 'Unpin Tab' : 'Pin Tab',
        click: () => respond({ type: 'pin-toggle' })
      },
      {
        label: 'Unload Tab',
        enabled: !ctx.isActive,
        click: () => respond({ type: 'unload' })
      },
      {
        label: 'Duplicate Tab',
        click: () => respond({ type: 'duplicate' })
      },
      { type: 'separator' },
      {
        label: 'Bookmark Tab\u2026',
        click: () => respond({ type: 'bookmark' })
      },
      {
        label: 'Add to New Group\u2026',
        click: () => respond({ type: 'add-to-new-group' })
      },
      {
        label: 'Remove from Group',
        enabled: ctx.inGroup,
        click: () => respond({ type: 'remove-from-group' })
      },
      { type: 'separator' },
      {
        label: ctx.pinned ? 'Unpin and Close' : 'Close Tab',
        click: () => respond({ type: 'close' })
      },
      {
        label: 'Close Other Tabs',
        enabled: ctx.canCloseOthers,
        click: () => respond({ type: 'close-others' })
      },
      {
        label: 'Close Tabs to the Right',
        click: () => respond({ type: 'close-right' })
      },
      {
        label: 'Close Duplicate Tabs',
        click: () => respond({ type: 'close-duplicates' })
      },
      { type: 'separator' },
      {
        label: 'Reopen Closed Tab',
        enabled: ctx.canReopenClosed,
        click: () => respond({ type: 'reopen-closed' })
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    menu.popup({
      window: win,
      callback: () => respond(null)
    })
  })
}

export function registerTabContextMenuIPC(): void {
  ipcMain.handle('tabCtx:show', async (event, ctx: TabMenuContext) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return showTabContextMenu(win, ctx)
  })
}

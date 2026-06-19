import { Menu, MenuItemConstructorOptions, BrowserWindow, ipcMain } from 'electron'

export interface ToolbarMenuContext {
  bookmarksBarVisible: boolean
  sidebarVisible: boolean
}

export type ToolbarMenuAction =
  | { type: 'toggle-bookmarks-bar' }
  | { type: 'toggle-sidebar' }
  | { type: 'open-settings' }
  | null

export function showToolbarContextMenu(
  win: BrowserWindow,
  ctx: ToolbarMenuContext
): Promise<ToolbarMenuAction> {
  return new Promise((resolve) => {
    let resolved = false
    const respond = (action: ToolbarMenuAction) => {
      if (resolved) return
      resolved = true
      resolve(action)
    }

    const template: MenuItemConstructorOptions[] = [
      {
        label: ctx.bookmarksBarVisible ? 'Hide Bookmarks Bar' : 'Show Bookmarks Bar',
        click: () => respond({ type: 'toggle-bookmarks-bar' })
      },
      {
        label: ctx.sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar',
        click: () => respond({ type: 'toggle-sidebar' })
      },
      { type: 'separator' },
      {
        label: 'Customize\u2026',
        click: () => respond({ type: 'open-settings' })
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    menu.popup({
      window: win,
      callback: () => respond(null)
    })
  })
}

export function registerToolbarContextMenuIPC(): void {
  ipcMain.handle('toolbarCtx:show', async (event, ctx: ToolbarMenuContext) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return showToolbarContextMenu(win, ctx)
  })
}

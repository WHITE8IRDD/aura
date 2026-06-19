import { Menu, MenuItemConstructorOptions, BrowserWindow, ipcMain, clipboard } from 'electron'

export interface InputMenuContext {
  hasSelection: boolean
  selectedText: string
  fullValue: string
  selectionStart: number
  selectionEnd: number
  isAddressBar: boolean
}

export type InputMenuAction =
  | { type: 'cut'; text: string }
  | { type: 'copy' }
  | { type: 'paste'; text: string }
  | { type: 'paste-and-go'; text: string }
  | { type: 'delete' }
  | { type: 'select-all' }
  | { type: 'undo' }
  | { type: 'redo' }
  | null

export function showInputContextMenu(
  win: BrowserWindow,
  ctx: InputMenuContext
): Promise<InputMenuAction> {
  return new Promise((resolve) => {
    let resolved = false
    const respond = (action: InputMenuAction) => {
      if (resolved) return
      resolved = true
      resolve(action)
    }

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: () => respond({ type: 'undo' })
      },
      {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Shift+Z',
        click: () => respond({ type: 'redo' })
      },
      { type: 'separator' },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        enabled: ctx.hasSelection,
        click: () => {
          clipboard.writeText(ctx.selectedText)
          respond({ type: 'cut', text: ctx.selectedText })
        }
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        enabled: ctx.hasSelection,
        click: () => {
          clipboard.writeText(ctx.selectedText)
          respond({ type: 'copy' })
        }
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        click: () => {
          const text = clipboard.readText()
          respond({ type: 'paste', text })
        }
      }
    ]

    if (ctx.isAddressBar) {
      template.push({
        label: 'Paste and Go',
        accelerator: 'CmdOrCtrl+Shift+V',
        click: () => {
          const text = clipboard.readText().trim()
          respond({ type: 'paste-and-go', text })
        }
      })
    }

    template.push(
      {
        label: 'Delete',
        enabled: ctx.hasSelection,
        click: () => respond({ type: 'delete' })
      },
      { type: 'separator' },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: () => respond({ type: 'select-all' })
      }
    )

    const menu = Menu.buildFromTemplate(template)
    menu.popup({
      window: win,
      callback: () => respond(null)
    })
  })
}

export function registerInputContextMenuIPC(): void {
  ipcMain.handle('inputCtx:show', async (event, ctx: InputMenuContext) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return showInputContextMenu(win, ctx)
  })
}

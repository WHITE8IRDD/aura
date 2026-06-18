import { BrowserWindow, ipcMain } from 'electron'

let registered = false

export function registerWindowControls(getWindow: () => BrowserWindow | null): void {
  if (registered) return
  registered = true

  ipcMain.handle('window:minimize', (e) => {
    (BrowserWindow.fromWebContents(e.sender) ?? getWindow())?.minimize()
  })

  ipcMain.handle('window:maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? getWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.handle('window:close', (e) => {
    (BrowserWindow.fromWebContents(e.sender) ?? getWindow())?.close()
  })

  ipcMain.handle('window:isMaximized', (e) => {
    return (BrowserWindow.fromWebContents(e.sender) ?? getWindow())?.isMaximized() ?? false
  })
}

export function wireMaximizeEvents(win: BrowserWindow): void {
  const send = (state: boolean): void => {
    if (!win.isDestroyed()) win.webContents.send('window:maximizedChange', state)
  }
  win.on('maximize', () => send(true))
  win.on('unmaximize', () => send(false))
}

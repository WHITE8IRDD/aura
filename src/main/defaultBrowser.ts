import { app, ipcMain, shell } from 'electron'

export interface DefaultBrowserStatus {
  isHttpDefault: boolean
  isHttpsDefault: boolean
  isFullDefault: boolean
  platform: string
}

export function getDefaultBrowserStatus(): DefaultBrowserStatus {
  const isHttp = app.isDefaultProtocolClient('http')
  const isHttps = app.isDefaultProtocolClient('https')
  return {
    isHttpDefault: isHttp,
    isHttpsDefault: isHttps,
    isFullDefault: isHttp && isHttps,
    platform: process.platform
  }
}

export function setAsDefaultBrowser(): { success: boolean; error?: string } {
  try {
    const httpOk = app.setAsDefaultProtocolClient('http')
    const httpsOk = app.setAsDefaultProtocolClient('https')
    if (!httpOk || !httpsOk) {
      return {
        success: false,
        error:
          'Could not register Aura as the default. On Windows, you may need to choose Aura manually in Windows Settings.'
      }
    }
    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unknown error'
    }
  }
}

export function removeAsDefaultBrowser(): { success: boolean } {
  try {
    app.removeAsDefaultProtocolClient('http')
    app.removeAsDefaultProtocolClient('https')
    return { success: true }
  } catch {
    return { success: false }
  }
}

export function openSystemDefaultAppsSettings(): void {
  if (process.platform === 'win32') {
    shell.openExternal('ms-settings:defaultapps')
  } else if (process.platform === 'darwin') {
    shell.openExternal('x-apple.systempreferences:')
  } else {
    console.log(
      '[Aura/defaultBrowser] System settings not auto-openable on this platform'
    )
  }
}

export function registerDefaultBrowserIPC(): void {
  ipcMain.handle('defaultBrowser:getStatus', () => getDefaultBrowserStatus())
  ipcMain.handle('defaultBrowser:setAsDefault', () => setAsDefaultBrowser())
  ipcMain.handle('defaultBrowser:remove', () => removeAsDefaultBrowser())
  ipcMain.handle('defaultBrowser:openSystemSettings', () =>
    openSystemDefaultAppsSettings()
  )
}

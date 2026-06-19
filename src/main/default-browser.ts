import { app, shell } from 'electron'

export function setAsDefaultBrowser(): boolean {
  try {
    app.setAsDefaultProtocolClient('http')
    app.setAsDefaultProtocolClient('https')
    if (process.platform === 'win32') {
      void shell.openExternal('ms-settings:defaultapps')
    }
    return true
  } catch (err) {
    console.warn('[Aura] Default browser set failed:', err)
    return false
  }
}

export function isDefaultBrowser(): boolean {
  return app.isDefaultProtocolClient('http') && app.isDefaultProtocolClient('https')
}

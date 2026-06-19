import { app, shell, ipcMain, clipboard } from 'electron'
import path from 'path'
import os from 'os'

export interface AboutInfo {
  appName: string
  appVersion: string
  electronVersion: string
  chromiumVersion: string
  nodeVersion: string
  v8Version: string
  osPlatform: string
  osVersion: string
  osArch: string
  userDataPath: string
  logsPath: string
  buildDate: string
}

function getAboutInfo(): AboutInfo {
  return {
    appName: app.getName(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromiumVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    v8Version: process.versions.v8,
    osPlatform: process.platform,
    osVersion: os.release(),
    osArch: process.arch,
    userDataPath: app.getPath('userData'),
    logsPath: path.join(app.getPath('userData'), 'logs'),
    buildDate: process.env.AURA_BUILD_DATE || 'development'
  }
}

export function registerAboutIPC(): void {
  ipcMain.handle('about:getInfo', () => getAboutInfo())

  ipcMain.handle('about:openDataFolder', () => {
    shell.openPath(app.getPath('userData'))
  })

  ipcMain.handle('about:openLogsFolder', () => {
    const logsPath = path.join(app.getPath('userData'), 'logs')
    shell.openPath(logsPath).then((err) => {
      if (err) shell.openPath(app.getPath('userData'))
    })
  })

  ipcMain.handle('about:copySystemInfo', () => {
    const info = getAboutInfo()
    const text = [
      `Aura ${info.appVersion}`,
      `Build: ${info.buildDate}`,
      `Electron: ${info.electronVersion}`,
      `Chromium: ${info.chromiumVersion}`,
      `Node: ${info.nodeVersion}`,
      `V8: ${info.v8Version}`,
      `OS: ${info.osPlatform} ${info.osVersion} (${info.osArch})`
    ].join('\n')
    clipboard.writeText(text)
  })
}

import { BrowserWindow } from 'electron'
import type { TabManager } from './tabs'

export function registerShortcuts(win: BrowserWindow, tabs: TabManager): void {
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return

    const ctrl = input.control || input.meta
    const shift = input.shift
    const key = input.key.toLowerCase()

    // Ctrl+T → new tab
    if (ctrl && !shift && key === 't') {
      tabs.create('aura://newtab')
    }

    // Ctrl+W → close active tab
    if (ctrl && !shift && key === 'w') {
      const active = tabs.getActiveId()
      if (active !== null) tabs.close(active)
    }

    // Ctrl+R or F5 → reload
    if ((ctrl && !shift && key === 'r') || key === 'f5') {
      const active = tabs.getActiveId()
      if (active !== null) tabs.reload(active)
    }

    // Ctrl+L → focus address bar (signal to renderer)
    if (ctrl && !shift && key === 'l') {
      win.webContents.send('shortcut:focusAddress')
    }

    // Ctrl+K → open command palette
    if (ctrl && !shift && key === 'k') {
      win.webContents.send('shortcut:commandPalette')
    }

    // Ctrl+Tab → next tab
    if (ctrl && key === 'tab') {
      win.webContents.send('shortcut:nextTab', shift)
    }

    // Ctrl+1..9 → switch to tab N
    if (ctrl && /^[1-9]$/.test(key)) {
      win.webContents.send('shortcut:switchTab', parseInt(key, 10) - 1)
    }

    // Ctrl+B → toggle sidebar
    if (ctrl && !shift && key === 'b') {
      win.webContents.send('shortcut:toggleSidebar')
    }

    // Ctrl+Shift+N → open ninja modal
    if (ctrl && shift && key === 'n') {
      win.webContents.send('ninja:openModal')
    }

    // Alt+Left → back
    if (input.alt && key === 'arrowleft') {
      const active = tabs.getActiveId()
      if (active !== null) tabs.goBack(active)
    }

    // Alt+Right → forward
    if (input.alt && key === 'arrowright') {
      const active = tabs.getActiveId()
      if (active !== null) tabs.goForward(active)
    }
  })
}

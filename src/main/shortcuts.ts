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

    // Ctrl+B → toggle sidebar
    if (ctrl && !shift && key === 'b') {
      win.webContents.send('shortcut:toggleSidebar')
    }

    // Ctrl+Shift+T → reopen last closed tab
    if (ctrl && shift && key === 't') {
      win.webContents.send('shortcut:reopenClosed')
    }

    // Ctrl+D → bookmark current page
    if (ctrl && !shift && key === 'd') {
      win.webContents.send('shortcut:bookmark')
    }

    // Ctrl+Shift+B → toggle bookmarks bar visibility
    if (ctrl && shift && key === 'b') {
      win.webContents.send('shortcut:toggleBookmarksBar')
    }

    // Ctrl+Shift+N → open ninja modal
    if (ctrl && shift && key === 'n') {
      win.webContents.send('ninja:openModal')
    }

    // STAGE 7A — Find in page (Ctrl+F)
    if (ctrl && !shift && key === 'f') {
      win.webContents.send('shortcut:findInPage')
    }

    // STAGE 7A — Print (Ctrl+P)
    if (ctrl && !shift && key === 'p') {
      const active = tabs.getActiveId()
      if (active !== null) tabs.print(active)
    }

    // STAGE 7A — Zoom in (Ctrl+= and Ctrl++)
    if (ctrl && !shift && (key === '=' || key === '+')) {
      const active = tabs.getActiveId()
      if (active !== null) tabs.zoomIn(active)
    }

    // STAGE 7A — Zoom out (Ctrl+-)
    if (ctrl && !shift && key === '-') {
      const active = tabs.getActiveId()
      if (active !== null) tabs.zoomOut(active)
    }

    // STAGE 7A — Zoom reset (Ctrl+0)
    if (ctrl && !shift && key === '0') {
      const active = tabs.getActiveId()
      if (active !== null) tabs.zoomReset(active)
    }

    // STAGE 7B — Tab search (Ctrl+Shift+A)
    if (ctrl && shift && key === 'a') {
      win.webContents.send('shortcut:tabSearch')
    }

    // STAGE 7B — Screenshot (Ctrl+Shift+S)
    if (ctrl && shift && key === 's') {
      win.webContents.send('shortcut:screenshot')
    }

    // STAGE 7B — Reader mode toggle (Ctrl+Shift+R)
    if (ctrl && shift && key === 'r') {
      win.webContents.send('shortcut:readerMode')
    }

    // Escape closes overlays (find-in-page, etc.)
    if (key === 'escape') {
      win.webContents.send('shortcut:escape')
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

    // Ctrl+, → open Settings
    if (input.ctrl && key === ',') {
      win.webContents.send('shortcut:openSettings')
    }
  })
}

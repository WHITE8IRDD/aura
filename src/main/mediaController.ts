import { ipcMain, webContents, BrowserWindow, app } from 'electron'
import { TabManager } from './tabs'

export interface MediaTab {
  id: number
  title: string
  url: string
  favicon?: string
  audible: boolean
  muted: boolean
  playing: boolean
}

export function getActiveMediaTabs(): MediaTab[] {
  const result: MediaTab[] = []
  for (const mgr of TabManager.getAll()) {
    for (const t of mgr.getMediaTabs()) {
      result.push({
        id: t.id,
        title: t.title,
        url: t.url,
        favicon: t.favicon ?? undefined,
        audible: t.hasAudio,
        muted: t.muted,
        playing: t.hasAudio && !t.muted
      })
    }
  }
  return result
}

export function dispatchMediaCommand(
  tabId: number,
  action: 'play' | 'pause' | 'previoustrack' | 'nexttrack'
): { success: boolean; method: string } {
  const mgr = TabManager.findTab(tabId)
  if (!mgr) return { success: false, method: 'no-manager' }

  const wcId = mgr.getWebContentsId(tabId)
  if (!wcId) return { success: false, method: 'no-webcontents-id' }

  const wc = webContents.fromId(wcId)
  if (!wc || wc.isDestroyed()) return { success: false, method: 'no-webcontents' }

  const script = `
    (function() {
      try {
        const media = document.querySelector('video, audio');
        if (!media) return 'no-media-element';
        switch ('${action}') {
          case 'play':
            if (media.paused) { media.play(); return 'dom-play'; }
            return 'already-playing';
          case 'pause':
            if (!media.paused) { media.pause(); return 'dom-pause'; }
            return 'already-paused';
          case 'nexttrack':
            const nextBtn = document.querySelector(
              '[aria-label*="Next" i], [class*="next" i] button, button[class*="next" i]'
            );
            if (nextBtn) { nextBtn.click(); return 'dom-next-click'; }
            return 'no-next';
          case 'previoustrack':
            const prevBtn = document.querySelector(
              '[aria-label*="Previous" i], [class*="prev" i] button, button[class*="prev" i]'
            );
            if (prevBtn) { prevBtn.click(); return 'dom-prev-click'; }
            return 'no-prev';
        }
        return 'unknown-action';
      } catch (e) {
        return 'error: ' + (e instanceof Error ? e.message : String(e));
      }
    })();
  `

  wc.executeJavaScript(script, true).then((method: string) => {
    console.log('[Aura/media] dispatch', action, 'on tab', tabId, '\u2192', method)
  }).catch((err: Error) => {
    console.error('[Aura/media] dispatch failed:', err)
  })

  return { success: true, method: 'pending' }
}

export function setupMediaWatcher(): void {
  const broadcast = () => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('media:stateChanged')
      }
    }
  }

  const attachListener = (wc: Electron.WebContents) => {
    wc.on('audio-state-changed', broadcast)
  }

  for (const wc of webContents.getAllWebContents()) {
    attachListener(wc)
  }

  app.on('web-contents-created', (_event, wc) => {
    attachListener(wc)
  })
}

export function registerMediaControllerIPC(): void {
  ipcMain.handle('media:getActiveTabs', () => getActiveMediaTabs())

  ipcMain.handle('media:dispatch', (_e, tabId: number, action: string) =>
    dispatchMediaCommand(tabId, action as 'play' | 'pause' | 'previoustrack' | 'nexttrack'))

  ipcMain.handle('media:setMuted', (_e, tabId: number, muted: boolean) => {
    const mgr = TabManager.findTab(tabId)
    if (!mgr) return { success: false, reason: 'no-manager' }
    const rec = mgr.records.get(tabId)
    if (!rec?.view) return { success: false, reason: 'no-view' }
    rec.view.webContents.setAudioMuted(muted)
    rec.muted = muted
    ;(mgr as unknown as { emit: () => void }).emit()
    return { success: true }
  })

  ipcMain.handle('media:getProgress', async (_e, wcId: number) => {
    const wc = webContents.fromId(wcId)
    if (!wc) return null
    try {
      return await wc.executeJavaScript(`(() => {
        const v = document.querySelector('video, audio')
        return v ? { currentTime: v.currentTime, duration: v.duration } : null
      })()`, true)
    } catch { return null }
  })

  ipcMain.handle('media:focusTab', (_e, tabId: number) => {
    const mgr = TabManager.findTab(tabId)
    if (!mgr) return { success: false, reason: 'no-manager' }
    const win = mgr.getWindow()
    if (!win || win.isDestroyed()) return { success: false, reason: 'no-window' }
    win.focus()
    mgr.activate(tabId)
    return { success: true }
  })
}

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('aura', {
  media: {
    getActiveTabs: () => ipcRenderer.invoke('media:getActiveTabs'),
    dispatch: (wcId: number, action: string) =>
      ipcRenderer.invoke('media:dispatch', wcId, action),
    setMuted: (wcId: number, muted: boolean) =>
      ipcRenderer.invoke('media:setMuted', wcId, muted),
    focusTab: (wcId: number) =>
      ipcRenderer.invoke('media:focusTab', wcId),
    getProgress: (wcId: number) =>
      ipcRenderer.invoke('media:getProgress', wcId),
    closePopoverWindow: () =>
      ipcRenderer.invoke('mediaHubWindow:close'),
    onStateChanged: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('media:stateChanged', handler)
      return () => ipcRenderer.removeListener('media:stateChanged', handler)
    }
  },
  theme: {
    getResolved: () => ipcRenderer.invoke('theme:getResolved')
  }
})

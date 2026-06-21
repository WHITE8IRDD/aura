import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('aura', {
  imageSaver: {
    saveWithFormat: (url: string, format: 'png' | 'jpg', quality: number, sourceWcId?: number) =>
      ipcRenderer.invoke('imageSaver:saveWithFormat', url, format, quality, sourceWcId),
    copyToClipboard: async (url: string, sourceWcId?: number) => {
      const result = await ipcRenderer.invoke('imageSaver:saveWithFormat', url, 'png', 100, sourceWcId)
      return result.success
    },
    batchSavePage: (format: 'png' | 'jpg', quality: number) =>
      ipcRenderer.invoke('imageSaver:batchSavePage', format, quality)
  },
  popover: {
    close: () => ipcRenderer.send('imageSaverWindow:close'),
    onSetData: (cb: (data: { srcURL?: string; batchMode: boolean; sourceWcId?: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { srcURL?: string; batchMode: boolean; sourceWcId?: number }) => cb(data)
      ipcRenderer.on('imageSaver:setData', handler)
      return () => ipcRenderer.removeListener('imageSaver:setData', handler)
    }
  },
  theme: {
    getResolved: () => ipcRenderer.invoke('theme:getResolved')
  }
})

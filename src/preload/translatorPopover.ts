import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('aura', {
  translator: {
    translate: (text: string, targetLang?: string) =>
      ipcRenderer.invoke('translator:translate', text, targetLang)
  },
  popover: {
    close: () => ipcRenderer.send('translatorWindow:close'),
    onSetText: (cb: (text: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, text: string) => cb(text)
      ipcRenderer.on('translator:setText', handler)
      return () => ipcRenderer.removeListener('translator:setText', handler)
    }
  },
  theme: {
    getResolved: () => ipcRenderer.invoke('theme:getResolved')
  }
})

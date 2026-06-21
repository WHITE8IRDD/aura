import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('perfHud', {
  onTick: (cb: (sample: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, sample: unknown) => cb(sample)
    ipcRenderer.on('perf-hud:tick', handler)
    return () => ipcRenderer.removeListener('perf-hud:tick', handler)
  },
  close: () => ipcRenderer.send('perf-hud:close'),
  focusTab: (pid: number) => ipcRenderer.send('perf-hud:focus-tab', pid),
  killTab: (pid: number) => ipcRenderer.send('perf-hud:kill-tab', pid),
})

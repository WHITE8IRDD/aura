import { contextBridge, ipcRenderer } from 'electron'
import type { TabState } from '../main/tabs'
import type { HistoryEntry } from '../main/history'

interface PrivacyStats {
  trackersBlocked: number
  adsBlocked: number
  fingerprintersBlocked: number
  socialBlocked: number
  bandwidthSavedKb: number
}

interface PermissionRequest {
  id: number
  origin: string
  permission: string
}

const api = {
  platform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:platform'),

  tabs: {
    create: (url?: string): Promise<number> => ipcRenderer.invoke('tabs:create', url),
    close: (id: number): Promise<void> => ipcRenderer.invoke('tabs:close', id),
    activate: (id: number): Promise<void> => ipcRenderer.invoke('tabs:activate', id),
    navigate: (id: number, url: string): Promise<void> =>
      ipcRenderer.invoke('tabs:navigate', id, url),
    goBack: (id: number): Promise<void> => ipcRenderer.invoke('tabs:goBack', id),
    goForward: (id: number): Promise<void> => ipcRenderer.invoke('tabs:goForward', id),
    reload: (id: number): Promise<void> => ipcRenderer.invoke('tabs:reload', id),
    getState: (): Promise<{ tabs: TabState[]; activeId: number | null }> =>
      ipcRenderer.invoke('tabs:getState'),
    reorder: (fromId: number, toIndex: number): Promise<void> =>
      ipcRenderer.invoke('tabs:reorder', fromId, toIndex),
    onUpdate: (cb: (tabs: TabState[], activeId: number | null) => void): (() => void) => {
      const listener = (
        _e: Electron.IpcRendererEvent,
        t: TabState[],
        a: number | null
      ): void => cb(t, a)
      ipcRenderer.on('tabs:update', listener)
      return () => ipcRenderer.removeListener('tabs:update', listener)
    }
  },

  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (cb: (maximized: boolean) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, m: boolean): void => cb(m)
      ipcRenderer.on('window:maximizedChange', listener)
      return () => ipcRenderer.removeListener('window:maximizedChange', listener)
    }
  },

  layout: {
    setSidebarWidth: (width: number): Promise<void> =>
      ipcRenderer.invoke('layout:setSidebarWidth', width),
    hideView: (): Promise<void> => ipcRenderer.invoke('layout:hideView'),
    showView: (): Promise<void> => ipcRenderer.invoke('layout:showView')
  },

  suggest: {
    query: (q: string): Promise<HistoryEntry[]> => ipcRenderer.invoke('suggest:query', q),
    preconnect: (url: string): Promise<void> => ipcRenderer.invoke('suggest:preconnect', url)
  },

  privacy: {
    stats: (): Promise<PrivacyStats> => ipcRenderer.invoke('privacy:stats'),
    isPhishing: (hostname: string): Promise<boolean> =>
      ipcRenderer.invoke('privacy:isPhishing', hostname)
  },

  security: {
    allowInsecure: (host: string): Promise<void> =>
      ipcRenderer.invoke('security:allowInsecure', host)
  },

  permissions: {
    respond: (id: number, granted: boolean, remember: boolean): Promise<void> =>
      ipcRenderer.invoke('permission:respond', id, granted, remember),
    onRequest: (cb: (req: PermissionRequest) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, req: PermissionRequest): void => cb(req)
      ipcRenderer.on('permission:request', listener)
      return () => ipcRenderer.removeListener('permission:request', listener)
    }
  },

  favicons: {
    fetch: (url: string): Promise<string | null> => ipcRenderer.invoke('favicons:fetch', url)
  },

  ninja: {
    launch: (): Promise<void> => ipcRenderer.invoke('ninja:launch'),
    isPrivate: (): Promise<boolean> => ipcRenderer.invoke('ninja:isPrivate')
  },

  shields: {
    toggle: (hostname: string): Promise<boolean> =>
      ipcRenderer.invoke('shields:toggle', hostname),
    isEnabled: (hostname: string): Promise<boolean> =>
      ipcRenderer.invoke('shields:isEnabled', hostname)
  },

  shortcuts: {
    onFocusAddress: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('shortcut:focusAddress', listener)
      return () => ipcRenderer.removeListener('shortcut:focusAddress', listener)
    },
    onCommandPalette: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('shortcut:commandPalette', listener)
      return () => ipcRenderer.removeListener('shortcut:commandPalette', listener)
    },
    onNextTab: (cb: (reverse: boolean) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, r: boolean): void => cb(r)
      ipcRenderer.on('shortcut:nextTab', listener)
      return () => ipcRenderer.removeListener('shortcut:nextTab', listener)
    },
    onSwitchTab: (cb: (index: number) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, i: number): void => cb(i)
      ipcRenderer.on('shortcut:switchTab', listener)
      return () => ipcRenderer.removeListener('shortcut:switchTab', listener)
    },
    onToggleSidebar: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('shortcut:toggleSidebar', listener)
      return () => ipcRenderer.removeListener('shortcut:toggleSidebar', listener)
    },
    onNinjaModal: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('shortcut:ninjaModal', listener)
      return () => ipcRenderer.removeListener('shortcut:ninjaModal', listener)
    }
  }
}

contextBridge.exposeInMainWorld('aura', api)
export type AuraApi = typeof api

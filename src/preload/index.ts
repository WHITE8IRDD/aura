import { contextBridge, ipcRenderer } from 'electron'

const isNinjaWindow = process.argv.includes('--ninja-window')
import type { TabState } from '../main/tabs'
import type { HistoryEntry } from '../main/history'
import type { Bookmark, BookmarkFolder } from '../main/bookmarks'
import type { DownloadRecord } from '../main/downloads'
import type { ReadingItem } from '../main/reading-list'
import type { Boost } from '../main/boosts'
import type { SidebarPanel } from '../main/sidebar-panels'
import type { TabGroup } from '../main/tab-groups'

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
  isNinjaWindow,
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
    pin: (id: number): Promise<void> => ipcRenderer.invoke('tabs:pin', id),
    unpin: (id: number): Promise<void> => ipcRenderer.invoke('tabs:unpin', id),
    mute: (id: number): Promise<void> => ipcRenderer.invoke('tabs:mute', id),
    duplicate: (id: number): Promise<number | null> => ipcRenderer.invoke('tabs:duplicate', id),
    unload: (id: number): Promise<void> => ipcRenderer.invoke('tabs:unload', id),
    closeOthers: (id: number): Promise<void> => ipcRenderer.invoke('tabs:closeOthers', id),
    closeToRight: (id: number): Promise<void> => ipcRenderer.invoke('tabs:closeToRight', id),
    closeDuplicates: (): Promise<void> => ipcRenderer.invoke('tabs:closeDuplicates'),
    reopenClosed: (): Promise<number | null> => ipcRenderer.invoke('tabs:reopenClosed'),
    hasClosedTabs: (): Promise<boolean> => ipcRenderer.invoke('tabs:hasClosedTabs'),
    find: (id: number, query: string, forward: boolean): Promise<void> =>
      ipcRenderer.invoke('tabs:find', id, query, forward),
    findNext: (id: number, forward: boolean): Promise<void> =>
      ipcRenderer.invoke('tabs:findNext', id, forward),
    stopFind: (id: number): Promise<void> => ipcRenderer.invoke('tabs:stopFind', id),
    setZoom: (id: number, factor: number): Promise<void> =>
      ipcRenderer.invoke('tabs:setZoom', id, factor),
    zoomIn: (id: number): Promise<void> => ipcRenderer.invoke('tabs:zoomIn', id),
    zoomOut: (id: number): Promise<void> => ipcRenderer.invoke('tabs:zoomOut', id),
    zoomReset: (id: number): Promise<void> => ipcRenderer.invoke('tabs:zoomReset', id),
    print: (id: number): Promise<void> => ipcRenderer.invoke('tabs:print', id),
    pip: (id: number): Promise<boolean> => ipcRenderer.invoke('tabs:pip', id),
    sendMessage: (tabId: number, channel: string, ...args: unknown[]): Promise<void> =>
      ipcRenderer.invoke('tabs:sendMessage', tabId, channel, ...args),
    readerExtract: (id: number): Promise<{ url: string; title: string; html: string } | null> =>
      ipcRenderer.invoke('tabs:readerExtract', id),
    screenshot: (id: number, action: 'save' | 'copy'): Promise<string | null> =>
      ipcRenderer.invoke('tabs:screenshot', id, action),
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
    setChromeHeight: (height: number): Promise<void> =>
      ipcRenderer.invoke('layout:setChromeHeight', height),
    hideView: (): Promise<void> => ipcRenderer.invoke('layout:hideView'),
    showView: (): Promise<void> => ipcRenderer.invoke('layout:showView')
  },

  inputContextMenu: {
    show: (ctx: {
      hasSelection: boolean
      selectedText: string
      fullValue: string
      selectionStart: number
      selectionEnd: number
      isAddressBar: boolean
    }): Promise<{ type: string; text?: string } | null> =>
      ipcRenderer.invoke('inputCtx:show', ctx)
  },

  suggest: {
    query: (q: string): Promise<HistoryEntry[]> => ipcRenderer.invoke('suggest:query', q),
    preconnect: (url: string): Promise<void> => ipcRenderer.invoke('suggest:preconnect', url)
  },

  toolbarContextMenu: {
    show: (ctx: {
      bookmarksBarVisible: boolean
      sidebarVisible: boolean
    }): Promise<{ type: string } | null> =>
      ipcRenderer.invoke('toolbarCtx:show', ctx)
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
    launchWithUrl: (url: string): Promise<void> => ipcRenderer.invoke('ninja:launchWithUrl', url),
    isPrivate: (): Promise<boolean> => ipcRenderer.invoke('ninja:isPrivate')
  },

  shields: {
    toggle: (hostname: string): Promise<boolean> =>
      ipcRenderer.invoke('shields:toggle', hostname),
    isEnabled: (hostname: string): Promise<boolean> =>
      ipcRenderer.invoke('shields:isEnabled', hostname)
  },

  // STAGE 6
  history: {
    all: (limit?: number): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:all', limit),
    search: (q: string): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:search', q),
    delete: (url: string): Promise<void> => ipcRenderer.invoke('history:delete', url),
    clear: (): Promise<void> => ipcRenderer.invoke('history:clear'),
    count: (): Promise<number> => ipcRenderer.invoke('history:count')
  },

  bookmarks: {
    list: (folderId?: number | null): Promise<Bookmark[]> =>
      ipcRenderer.invoke('bookmarks:list', folderId),
    listBar: (): Promise<Bookmark[]> => ipcRenderer.invoke('bookmarks:listBar'),
    reorder: (orderedIds: number[]): Promise<void> =>
      ipcRenderer.invoke('bookmarks:reorder', orderedIds),
    addSeparator: (folderId?: number | null): Promise<Bookmark> =>
      ipcRenderer.invoke('bookmarks:addSeparator', folderId),
    add: (url: string, title: string, folderId?: number | null): Promise<Bookmark> =>
      ipcRenderer.invoke('bookmarks:add', url, title, folderId),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('bookmarks:delete', id),
    update: (
      id: number,
      changes: { url?: string; title?: string; folderId?: number | null }
    ): Promise<void> => ipcRenderer.invoke('bookmarks:update', id, changes),
    isBookmarked: (url: string): Promise<boolean> =>
      ipcRenderer.invoke('bookmarks:isBookmarked', url),
    listFolders: (): Promise<BookmarkFolder[]> => ipcRenderer.invoke('bookmarks:listFolders'),
    addFolder: (name: string): Promise<BookmarkFolder> =>
      ipcRenderer.invoke('bookmarks:addFolder', name),
    deleteFolder: (id: number): Promise<void> =>
      ipcRenderer.invoke('bookmarks:deleteFolder', id),
    onUpdate: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('bookmarks:update', l)
      return () => ipcRenderer.removeListener('bookmarks:update', l)
    }
  },

  downloads: {
    list: (): Promise<DownloadRecord[]> => ipcRenderer.invoke('downloads:list'),
    cancel: (id: number): Promise<void> => ipcRenderer.invoke('downloads:cancel', id),
    open: (savePath: string): Promise<void> => ipcRenderer.invoke('downloads:open', savePath),
    reveal: (savePath: string): Promise<void> =>
      ipcRenderer.invoke('downloads:reveal', savePath),
    deleteRecord: (id: number): Promise<void> =>
      ipcRenderer.invoke('downloads:deleteRecord', id),
    clearCompleted: (): Promise<void> => ipcRenderer.invoke('downloads:clearCompleted'),
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke('downloads:pickFolder'),
    openFolder: (): Promise<void> => ipcRenderer.invoke('downloads:openFolder'),
    getCurrentFolder: (): Promise<string> => ipcRenderer.invoke('downloads:getCurrentFolder'),
    clearHistory: (): Promise<boolean> => ipcRenderer.invoke('downloads:clearHistory'),
    applyRetention: () => ipcRenderer.invoke('downloads:applyRetention'),
    onUpdate: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('downloads:update', listener)
      return () => ipcRenderer.removeListener('downloads:update', listener)
    }
  },

  shortcuts: {
    onFocusAddress: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:focusAddress', l)
      return () => ipcRenderer.removeListener('shortcut:focusAddress', l)
    },
    onCommandPalette: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:commandPalette', l)
      return () => ipcRenderer.removeListener('shortcut:commandPalette', l)
    },
    onNextTab: (cb: (reverse: boolean) => void): (() => void) => {
      const l = (_e: Electron.IpcRendererEvent, r: boolean): void => cb(r)
      ipcRenderer.on('shortcut:nextTab', l)
      return () => ipcRenderer.removeListener('shortcut:nextTab', l)
    },
    onSwitchTab: (cb: (index: number) => void): (() => void) => {
      const l = (_e: Electron.IpcRendererEvent, i: number): void => cb(i)
      ipcRenderer.on('shortcut:switchTab', l)
      return () => ipcRenderer.removeListener('shortcut:switchTab', l)
    },
    onToggleSidebar: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:toggleSidebar', l)
      return () => ipcRenderer.removeListener('shortcut:toggleSidebar', l)
    },
    onNinjaModal: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:ninjaModal', l)
      return () => ipcRenderer.removeListener('shortcut:ninjaModal', l)
    },
    onToggleVerticalTabs: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:toggleVerticalTabs', l)
      return () => ipcRenderer.removeListener('shortcut:toggleVerticalTabs', l)
    },
    onReopenClosed: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:reopenClosed', l)
      return () => ipcRenderer.removeListener('shortcut:reopenClosed', l)
    },
    onBookmark: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:bookmark', l)
      return () => ipcRenderer.removeListener('shortcut:bookmark', l)
    },
    onToggleBookmarksBar: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:toggleBookmarksBar', l)
      return () => ipcRenderer.removeListener('shortcut:toggleBookmarksBar', l)
    },
    onFindInPage: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:findInPage', l)
      return () => ipcRenderer.removeListener('shortcut:findInPage', l)
    },
    onEscape: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:escape', l)
      return () => ipcRenderer.removeListener('shortcut:escape', l)
    },
    onTabSearch: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:tabSearch', l)
      return () => ipcRenderer.removeListener('shortcut:tabSearch', l)
    },
    onScreenshot: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:screenshot', l)
      return () => ipcRenderer.removeListener('shortcut:screenshot', l)
    },
    onReaderMode: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:readerMode', l)
      return () => ipcRenderer.removeListener('shortcut:readerMode', l)
    },
    onFullscreenEnter: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('fullscreen:enter', l)
      return () => ipcRenderer.removeListener('fullscreen:enter', l)
    },
    onFullscreenExit: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('fullscreen:exit', l)
      return () => ipcRenderer.removeListener('fullscreen:exit', l)
    },
    onOpenSettings: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('shortcut:openSettings', l)
      return () => ipcRenderer.removeListener('shortcut:openSettings', l)
    },
  },

  groups: {
    create: (name: string, color: string) => ipcRenderer.invoke('groups:create', name, color),
    delete: (id: string) => ipcRenderer.invoke('groups:delete', id),
    rename: (id: string, name: string) => ipcRenderer.invoke('groups:rename', id, name),
    setColor: (id: string, color: string) => ipcRenderer.invoke('groups:setColor', id, color),
    toggleCollapsed: (id: string) => ipcRenderer.invoke('groups:toggleCollapsed', id),
    addTab: (groupId: string, tabId: number) => ipcRenderer.invoke('groups:addTab', groupId, tabId),
    removeTab: (tabId: number) => ipcRenderer.invoke('groups:removeTab', tabId),
    list: () => ipcRenderer.invoke('groups:list'),
    snapshot: () => ipcRenderer.invoke('groups:snapshot'),
    onChanged: (cb: () => void): (() => void) => {
      const l = (): void => cb()
      ipcRenderer.on('groups:changed', l)
      return () => ipcRenderer.removeListener('groups:changed', l)
    }
  },

  readingList: {
    add: (url: string, title: string, excerpt?: string) =>
      ipcRenderer.invoke('readingList:add', url, title, excerpt),
    delete: (id: number) => ipcRenderer.invoke('readingList:delete', id),
    markRead: (id: number, read: boolean) => ipcRenderer.invoke('readingList:markRead', id, read),
    list: (filter?: 'all' | 'unread' | 'read') => ipcRenderer.invoke('readingList:list', filter),
    clearRead: () => ipcRenderer.invoke('readingList:clearRead'),
    onUpdate: (cb: () => void) => {
      const l = () => cb()
      ipcRenderer.on('readingList:update', l)
      return () => ipcRenderer.removeListener('readingList:update', l)
    }
  },

  boosts: {
    add: (host: string, name: string, css: string) => ipcRenderer.invoke('boosts:add', host, name, css),
    update: (id: number, changes: { host?: string; name?: string; css?: string; enabled?: boolean }) =>
      ipcRenderer.invoke('boosts:update', id, changes),
    delete: (id: number) => ipcRenderer.invoke('boosts:delete', id),
    list: () => ipcRenderer.invoke('boosts:list'),
    onUpdate: (cb: () => void) => {
      const l = () => cb()
      ipcRenderer.on('boosts:update', l)
      return () => ipcRenderer.removeListener('boosts:update', l)
    }
  },

  settings: {
    getAll: (): Promise<import('../renderer/src/types').AuraSettings> =>
      ipcRenderer.invoke('settings:getAll'),
    get: <K extends keyof import('../renderer/src/types').AuraSettings>(key: K):
      Promise<import('../renderer/src/types').AuraSettings[K]> =>
      ipcRenderer.invoke('settings:get', key),
    set: <K extends keyof import('../renderer/src/types').AuraSettings>(key: K, value: import('../renderer/src/types').AuraSettings[K]):
      Promise<void> => ipcRenderer.invoke('settings:set', key, value),
    reset: (): Promise<void> => ipcRenderer.invoke('settings:reset'),
    resetAll: (): Promise<{
      success: boolean
      resetCount: number
      error?: string
    }> => ipcRenderer.invoke('settings:resetAll'),
    resetByKeys: (keys: string[]): Promise<{
      success: boolean
      resetCount: number
      error?: string
    }> => ipcRenderer.invoke('settings:resetByKeys', keys),
    onFullReset: (cb: () => void): (() => void) => {
      const handler = () => cb()
      ipcRenderer.on('settings:fullReset', handler)
      return () => ipcRenderer.removeListener('settings:fullReset', handler)
    },
    onChanged: (cb: (data: { key: string; value: unknown }) => void): (() => void) => {
      const l = (_e: Electron.IpcRendererEvent, data: { key: string; value: unknown }) =>
        cb(data)
      ipcRenderer.on('settings:changed', l)
      return () => ipcRenderer.removeListener('settings:changed', l)
    }
  },

  browser: {
    setDefault: (): Promise<boolean> => ipcRenderer.invoke('browser:setDefault'),
    isDefault: (): Promise<boolean> => ipcRenderer.invoke('browser:isDefault')
  },

  app: {
    openUserDataFolder: (): void => { void ipcRenderer.invoke('app:openUserDataFolder') },
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    relaunch: (): void => { void ipcRenderer.invoke('app:relaunch') }
  },

  theme: {
    getResolved: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('theme:getResolved'),
    onChanged: (cb: (theme: 'light' | 'dark') => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, t: 'light' | 'dark'): void => cb(t)
      ipcRenderer.on('theme:resolved', listener)
      return () => ipcRenderer.removeListener('theme:resolved', listener)
    }
  },

  accessibility: {
    onReloadHint: (cb: (reason: string) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, reason: string): void => cb(reason)
      ipcRenderer.on('a11y:reloadHint', handler)
      return () => ipcRenderer.removeListener('a11y:reloadHint', handler)
    }
  },

  contextMenu: {
    onOpenInNinja: (cb: (url: string) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, url: string): void => cb(url)
      ipcRenderer.on('cm:openInNinja', handler)
      return () => ipcRenderer.removeListener('cm:openInNinja', handler)
    }
  },

  languages: {
    getAvailableDictionaries: (): Promise<string[]> =>
      ipcRenderer.invoke('languages:getAvailableDictionaries')
  },

  about: {
    getInfo: (): Promise<{
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
    }> => ipcRenderer.invoke('about:getInfo'),
    openDataFolder: () => { void ipcRenderer.invoke('about:openDataFolder') },
    openLogsFolder: () => { void ipcRenderer.invoke('about:openLogsFolder') },
    copySystemInfo: () => { void ipcRenderer.invoke('about:copySystemInfo') }
  },

  translator: {
    translate: (text: string, targetLang?: string): Promise<{ translatedText: string; detectedLang?: string; engine: string; error?: string }> =>
      ipcRenderer.invoke('translator:translate', text, targetLang),
    onSelectionRequest: (cb: (data: { text: string; x: number; y: number }) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { text: string; x: number; y: number }) => {
        cb(data)
      }
      ipcRenderer.on('translator:requestSelection', handler)
      return () => ipcRenderer.removeListener('translator:requestSelection', handler)
    },
    openFloating: (anchor: {
      text: string
      pageRectX: number
      pageRectY: number
      chromeOffsetTop: number
      chromeOffsetLeft: number
    }) => ipcRenderer.send('translatorWindow:open', anchor),
    onRequestOpenFloating: (cb: (data: {
      text: string
      pageRectX: number
      pageRectY: number
    }) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { text: string; pageRectX: number; pageRectY: number }) => {
        cb(data)
      }
      ipcRenderer.on('translator:requestOpenFloating', handler)
      return () => ipcRenderer.removeListener('translator:requestOpenFloating', handler)
    }
  },

  imageSaver: {
    saveWithFormat: (url: string, format: 'png' | 'jpg', quality: number, sourceWcId?: number): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('imageSaver:saveWithFormat', url, format, quality, sourceWcId),
    batchSavePage: (format: 'png' | 'jpg', quality: number): Promise<{ success: boolean; count: number; folder?: string }> =>
      ipcRenderer.invoke('imageSaver:batchSavePage', format, quality),
    copyToClipboard: async (url: string, sourceWcId?: number): Promise<boolean> => {
      const result = await ipcRenderer.invoke('imageSaver:saveWithFormat', url, 'png', 100, sourceWcId)
      return result.success
    },
    onOpen: (cb: (data: { srcURL: string; x: number; y: number }) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { srcURL: string; x: number; y: number }) => {
        cb(data)
      }
      ipcRenderer.on('imageSaver:open', handler)
      return () => ipcRenderer.removeListener('imageSaver:open', handler)
    },
    onOpenBatch: (cb: () => void): (() => void) => {
      const handler = () => {
        cb()
      }
      ipcRenderer.on('imageSaver:openBatch', handler)
      return () => ipcRenderer.removeListener('imageSaver:openBatch', handler)
    },
    openFloating: (anchor: {
      srcURL: string
      batchMode: boolean
      sourceWcId?: number
      pageRectX: number
      pageRectY: number
      chromeOffsetTop: number
      chromeOffsetLeft: number
    }) => ipcRenderer.send('imageSaverWindow:open', anchor),
    onRequestOpenFloating: (cb: (data: {
      srcURL: string
      pageRectX: number
      pageRectY: number
      sourceWcId?: number
    }) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { srcURL: string; pageRectX: number; pageRectY: number; sourceWcId?: number }) => {
        cb(data)
      }
      ipcRenderer.on('imageSaver:requestOpenFloating', handler)
      return () => ipcRenderer.removeListener('imageSaver:requestOpenFloating', handler)
    }
  },

  performance: {
    getGPU: (): Promise<any> => ipcRenderer.invoke('perf:getGPU'),
    getTabMetrics: (): Promise<any[]> => ipcRenderer.invoke('perf:getTabMetrics'),
    discardSleepingTabs: (): Promise<number> => ipcRenderer.invoke('perf:discardSleepingTabs')
  },

  defaultBrowser: {
    getStatus: (): Promise<{
      isHttpDefault: boolean
      isHttpsDefault: boolean
      isFullDefault: boolean
      platform: string
    }> => ipcRenderer.invoke('defaultBrowser:getStatus'),
    setAsDefault: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('defaultBrowser:setAsDefault'),
    remove: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('defaultBrowser:remove'),
    openSystemSettings: (): Promise<void> =>
      ipcRenderer.invoke('defaultBrowser:openSystemSettings')
  },

  tabContextMenu: {
    show: (ctx: {
      tabId: number
      muted: boolean
      pinned: boolean
      inGroup: boolean
      isActive: boolean
      canCloseOthers: boolean
      canReopenClosed: boolean
    }): Promise<{
      type: string
    } | null> => ipcRenderer.invoke('tabCtx:show', ctx)
  },

  profile: {
    exportData: (): Promise<{
      success: boolean
      path?: string
      error?: string
    }> => ipcRenderer.invoke('profile:exportData'),

    importData: (): Promise<{
      success: boolean
      bookmarksImported?: number
      historyImported?: number
      settingsImported?: number
      error?: string
    }> => ipcRenderer.invoke('profile:importData')
  },

  perfHud: {
    toggle: (anchor?: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.send('perf-hud:toggle', anchor),
  },

  media: {
    getActiveTabs: (): Promise<Array<{
      id: number; title: string; url: string; favicon?: string
      audible: boolean; muted: boolean; playing: boolean
    }>> => ipcRenderer.invoke('media:getActiveTabs'),

    dispatch: (tabId: number, action: 'play' | 'pause' | 'previoustrack' | 'nexttrack'): Promise<{ success: boolean; method: string }> =>
      ipcRenderer.invoke('media:dispatch', tabId, action),

    setMuted: (tabId: number, muted: boolean): Promise<{ success: boolean; reason?: string }> =>
      ipcRenderer.invoke('media:setMuted', tabId, muted),

    focusTab: (tabId: number): Promise<{ success: boolean; reason?: string }> =>
      ipcRenderer.invoke('media:focusTab', tabId),

    openPopoverWindow: (buttonRect: {
      x: number; y: number; width: number; height: number
    }) => ipcRenderer.invoke('mediaHubWindow:open', buttonRect),

    showNativeMenu: (): Promise<{
      type: string; wcId?: number; muted?: boolean
    } | null> => ipcRenderer.invoke('mediaHub:show'),

    onStateChanged: (cb: () => void): (() => void) => {
      const handler = () => cb()
      ipcRenderer.on('media:stateChanged', handler)
      return () => ipcRenderer.removeListener('media:stateChanged', handler)
    }
  },

  clearData: {
    preview: (timeRange: 'hour' | 'day' | 'week' | 'fourWeeks' | 'all'): Promise<{
      historyCount: number
      downloadsCount: number
      cookiesSiteCount: number
      cacheSizeBytes: number
      siteSettingsCount: number
    }> => ipcRenderer.invoke('clearData:preview', timeRange),

    execute: (options: {
      timeRange: 'hour' | 'day' | 'week' | 'fourWeeks' | 'all'
      browsingHistory: boolean
      downloadHistory: boolean
      cookies: boolean
      cache: boolean
      passwords: boolean
      autofillData: boolean
      siteSettings: boolean
      hostedAppData: boolean
    }): Promise<{
      success: boolean
      cleared: Record<string, number>
      errors: string[]
    }> => ipcRenderer.invoke('clearData:execute', options)
  },

  reader: {
    probe: (tabId: string | number): Promise<{ readerable: boolean; reason?: string }> =>
      ipcRenderer.invoke('reader:probe', tabId),
    enter: (tabId: string | number): Promise<{ ok: boolean; error?: string; article?: any }> =>
      ipcRenderer.invoke('reader:enter', tabId),
    exit: (tabId: string | number): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('reader:exit', tabId),
    getCurrent: (tabId: string | number): Promise<any> =>
      ipcRenderer.invoke('reader:getCurrent', tabId),
    isActive: (tabId: string | number): Promise<boolean> =>
      ipcRenderer.invoke('reader:isActive', tabId),
  },

  split: {
    open: (tabId: number, url: string): Promise<void> =>
      ipcRenderer.invoke('split:open', tabId, url),
    close: (tabId: number): Promise<void> =>
      ipcRenderer.invoke('split:close', tabId),
    isSplit: (tabId: number): Promise<boolean> =>
      ipcRenderer.invoke('split:isSplit', tabId),
    getState: (tabId: number): Promise<{
      tabId: number; splitUrl: string; focusedPane: 'primary' | 'split'; ratio: number
    } | null> => ipcRenderer.invoke('split:getState', tabId),
    setFocusedPane: (tabId: number, pane: 'primary' | 'split'): Promise<void> =>
      ipcRenderer.invoke('split:setFocusedPane', tabId, pane),
    toggleFocusedPane: (tabId: number): Promise<void> =>
      ipcRenderer.invoke('split:toggleFocusedPane', tabId),
    navigateFocused: (tabId: number, url: string): Promise<void> =>
      ipcRenderer.invoke('split:navigateFocused', tabId, url),
    navigateNonFocused: (tabId: number, url: string): Promise<void> =>
      ipcRenderer.invoke('split:navigateNonFocused', tabId, url),
    navigateSplitPane: (tabId: number, url: string): Promise<void> =>
      ipcRenderer.invoke('split:navigateSplitPane', tabId, url),
    setRatio: (tabId: number, ratio: number): Promise<void> =>
      ipcRenderer.invoke('split:setRatio', tabId, ratio),
    getAll: (): Promise<Array<{
      tabId: number; splitUrl: string; focusedPane: 'primary' | 'split'; ratio: number
    }>> => ipcRenderer.invoke('split:getAll'),
    onSplitChanged: (cb: () => void): (() => void) => {
      const handler = () => cb()
      ipcRenderer.on('split:changed', handler)
      return () => ipcRenderer.removeListener('split:changed', handler)
    }
  },

  extensions: {
    list: (): Promise<Array<{
      id: string; name: string; version: string; description: string
      author: string; homeUrl: string; iconPath: string
      sourceType: string; sourcePath: string; enabled: number; installed_at: number
    }>> => ipcRenderer.invoke('extensions:list'),
    get: (id: string): Promise<{
      id: string; name: string; version: string; description: string
      author: string; homeUrl: string; iconPath: string
      sourceType: string; sourcePath: string; enabled: number; installed_at: number
    } | undefined> => ipcRenderer.invoke('extensions:get', id),
    installFolder: (): Promise<{ success: boolean; id?: string; error?: string; cancelled?: boolean }> =>
      ipcRenderer.invoke('extensions:installFolder'),
    installCrx: (): Promise<{ success: boolean; id?: string; error?: string; cancelled?: boolean }> =>
      ipcRenderer.invoke('extensions:installCrx'),
    enable: (id: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('extensions:enable', id),
    disable: (id: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('extensions:disable', id),
    delete: (id: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('extensions:delete', id),
    openStore: (): Promise<void> => ipcRenderer.invoke('extensions:openStore'),
    getIcon: (id: string): Promise<string | null> =>
      ipcRenderer.invoke('extensions:getIcon', id),
    installFromStoreId: (id: string): Promise<{ success: boolean; id?: string; error?: string }> =>
      ipcRenderer.invoke('extensions:installFromStoreId', id),
    installFromUrl: (url: string): Promise<{ success: boolean; id?: string | null; error?: string }> =>
      ipcRenderer.invoke('extensions:installFromUrl', url),
    search: (query: string): Promise<{ success: boolean; results: Array<{ id: string; name: string; description: string; iconUrl: string }>; error?: string }> =>
      ipcRenderer.invoke('extensions:search', query),
  },

  autofill: {
    isAvailable: (): Promise<boolean> => ipcRenderer.invoke('autofill:isAvailable'),

    list: (): Promise<Array<{
      id: number; label: string; fullName: string; givenName: string
      familyName: string; email: string; phone: string
      organization: string; street: string; city: string
      region: string; postalCode: string; country: string
      createdAt: number; updatedAt: number
    }>> => ipcRenderer.invoke('autofill:list'),

    add: (input: any): Promise<{ id: number; success: boolean }> =>
      ipcRenderer.invoke('autofill:add', input),

    update: (id: number, input: any): Promise<boolean> =>
      ipcRenderer.invoke('autofill:update', id, input),

    delete: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('autofill:delete', id),

    deleteAll: (): Promise<number> => ipcRenderer.invoke('autofill:deleteAll'),

    acceptSave: (input: any): Promise<{ id: number; success: boolean }> =>
      ipcRenderer.invoke('autofill:promptSaveAccept', input),

    onPromptSave: (cb: (data: any) => void): (() => void) => {
      const handler = (_e: any, data: any) => cb(data)
      ipcRenderer.on('autofill:promptSave', handler)
      return () => ipcRenderer.removeListener('autofill:promptSave', handler)
    }
  }
}

contextBridge.exposeInMainWorld('aura', api)
export type AuraApi = typeof api

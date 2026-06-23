import React, { useCallback, useEffect, useState } from 'react'
import { useTheme } from './lib/useTheme'
import { useAccessibility } from './lib/useAccessibility'
import { useSettings } from './hooks/useSettings'
import TabBar from './components/TabBar'
import Toolbar from './components/Toolbar'
import Sidebar, { type SidebarAction } from './components/Sidebar'
import WindowControls from './components/WindowControls'
import CommandPalette from './components/CommandPalette'
import ProgressBar from './components/ProgressBar'
import PermissionPrompt from './components/PermissionPrompt'
import BookmarksBar from './components/BookmarksBar'
import FindBar from './components/FindBar'
import TabSearchPalette from './components/TabSearchPalette'
import ReaderPage from './pages/ReaderPage'
import NewTabDashboard from './pages/NewTabDashboard'
import NinjaNewTab from './pages/NinjaNewTab'
import NinjaModal from './components/NinjaModal'
import PrivacyDashboard from './pages/PrivacyDashboard'
import HistoryPage from './pages/HistoryPage'
import BookmarksPage from './pages/BookmarksPage'
import DownloadsPage from './pages/DownloadsPage'
import ReadingListPage from './pages/ReadingListPage'
import BoostsPage from './pages/BoostsPage'
import SettingsPage from './pages/SettingsPage'

import { SplitOverlay } from './components/SplitOverlay'
import { AutofillSavePrompt } from './components/AutofillSavePrompt'
import { useKeyboard } from './hooks/useKeyboard'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useResize } from './hooks/useResize'
import type { TabState } from './types'

// STAGE 8.7-hotfix: updated to match new CSS heights
//   .chrome-top-row    = 36px (tabs row)
//   .toolbar           = 44px (address bar row)
//   .bookmarks-bar     = 30px (only when visible)
//   .chrome-top-row.compact = 30px (vertical-tabs mode)
const SIDEBAR_WIDTH_VERTICAL_DEFAULT = 220
const SIDEBAR_WIDTH_VERTICAL_MIN = 160
const SIDEBAR_WIDTH_VERTICAL_MAX = 400
const CHROME_HEIGHT_BASE = 80                  // 36 (tabs) + 44 (toolbar)
const BOOKMARKS_BAR_HEIGHT = 30                // .bookmarks-bar height
const CHROME_HEIGHT_VERTICAL_COMPACT = 74      // 30 (compact top) + 44 (toolbar)

type ChromePage = null | 'privacy' | 'history' | 'bookmarks' | 'downloads' | 'readingList' | 'boosts' | 'settings'

export default function App(): React.ReactElement {
  useTheme()
  useAccessibility()
  const { settings } = useSettings()

  // One-time migration: copy aura:verticalTabs from localStorage to settings DB
  useEffect(() => {
    const legacy = localStorage.getItem('aura:verticalTabs')
    if (legacy === null) return
    const legacyBool = legacy === 'true'
    const layoutValue = legacyBool ? 'vertical' : 'horizontal'
    window.aura.settings.set('tabsLayout', layoutValue).then(() => {
      localStorage.removeItem('aura:verticalTabs')
    }).catch(() => {})
  }, [])

  const verticalTabs = settings?.tabsLayout === 'vertical'
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)
  const [panelMessage, setPanelMessage] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [ninjaModalOpen, setNinjaModalOpen] = useState(false)
  const [chromePage, setChromePage] = useState<ChromePage>(null)
  const [bookmarkSignal, setBookmarkSignal] = useState(0)
  const [findBarOpen, setFindBarOpen] = useState(false)
  const [tabSearchOpen, setTabSearchOpen] = useState(false)
  const [readerActive, setReaderActive] = useState(false)
  const [bookmarksBarVisible, setBookmarksBarVisible] = useLocalStorage<boolean>(
    'aura:bookmarksBarVisible',
    true
  )
  const [hasBarBookmarks, setHasBarBookmarks] = useState(false)
  const [reloadHint, setReloadHint] = useState<string | null>(null)

  useEffect(() => {
    const unsub = window.aura.accessibility?.onReloadHint?.((reason) => {
      setReloadHint(reason)
      setTimeout(() => setReloadHint(null), 8000)
    })
    return unsub
  }, [])

  const [persistedVerticalWidth, setPersistedVerticalWidth] = useLocalStorage<number>(
    'aura:sidebarWidth',
    SIDEBAR_WIDTH_VERTICAL_DEFAULT
  )

  const {
    width: verticalWidth,
    startDrag: onResizeStart,
    isDragging: isResizing,
    setWidth: setVerticalWidth
  } = useResize({
    initial: persistedVerticalWidth,
    min: SIDEBAR_WIDTH_VERTICAL_MIN,
    max: SIDEBAR_WIDTH_VERTICAL_MAX,
    onChange: (w) => {
      void window.aura.layout.setSidebarWidth(w)
    },
    onCommit: (w) => {
      setPersistedVerticalWidth(w)
    }
  })

  useEffect(() => {
    if (verticalTabs && persistedVerticalWidth !== verticalWidth) {
      setVerticalWidth(persistedVerticalWidth)
    }
  }, [verticalTabs])

  useEffect(() => {
    return window.aura.tabs.onUpdate((t, a) => {
      setTabs(t)
      setActiveId(a)
    })
  }, [])

  useEffect(() => {
    window.aura.platform().then((p) => {
      document.documentElement.setAttribute('data-platform', p)
    })
  }, [])

  useEffect(() => {
    window.aura.ninja.isPrivate()
      .then((priv) => {
        setIsPrivate(priv)
        document.documentElement.setAttribute('data-ninja', priv ? 'true' : 'false')
        document.title = priv ? 'Aura — Ninja Mode' : 'Aura'
      })
      .catch(() => {
        setIsPrivate(false)
        document.documentElement.setAttribute('data-ninja', 'false')
      })
  }, [])

  useEffect(() => {
    const load = (): void => {
      window.aura.bookmarks.listBar()
        .then((list) => setHasBarBookmarks(list.length > 0))
        .catch(() => setHasBarBookmarks(false))
    }
    load()
    return window.aura.bookmarks.onUpdate(load)
  }, [])

  const effectiveSidebarWidth = verticalTabs ? verticalWidth : 0

  useEffect(() => {
    void window.aura.layout.setSidebarWidth(effectiveSidebarWidth)
  }, [effectiveSidebarWidth])

  const activeTab = tabs.find((t) => t.id === activeId)
  const showBookmarksBar = bookmarksBarVisible && hasBarBookmarks && !!activeTab && chromePage === null
  const chromeHeight =
    (verticalTabs ? CHROME_HEIGHT_VERTICAL_COMPACT : CHROME_HEIGHT_BASE) +
    (showBookmarksBar ? BOOKMARKS_BAR_HEIGHT : 0)

  useEffect(() => {
    window.aura.layout.setChromeHeight(chromeHeight)
  }, [chromeHeight])

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-vertical-tabs',
      verticalTabs ? 'true' : 'false'
    )
  }, [verticalTabs])

  useEffect(() => {
    if (chromePage !== null) {
      void window.aura.layout.hideView()
      requestAnimationFrame(() => {
        void window.aura.layout.hideView()
      })
    } else {
      if (!ninjaModalOpen && !paletteOpen && !readerActive && !findBarOpen
          && !tabSearchOpen) {
        void window.aura.layout.showView()
      }
    }
  }, [chromePage, ninjaModalOpen, paletteOpen, readerActive, findBarOpen, tabSearchOpen])

  useEffect(() => {
    const anyOverlay =
      ninjaModalOpen ||
      paletteOpen ||
      chromePage !== null ||
      readerActive ||
      findBarOpen ||
      tabSearchOpen
    if (anyOverlay) void window.aura.layout.hideView()
    else void window.aura.layout.showView()
  }, [ninjaModalOpen, paletteOpen, chromePage, readerActive, findBarOpen, tabSearchOpen])

  useEffect(() => {
    if (isResizing) void window.aura.layout.hideView()
    else if (
      !ninjaModalOpen &&
      !paletteOpen &&
      chromePage === null &&
      !readerActive &&
      !findBarOpen &&
      !tabSearchOpen
    ) {
      void window.aura.layout.showView()
    }
  }, [isResizing, ninjaModalOpen, paletteOpen, chromePage, readerActive, findBarOpen, tabSearchOpen])

  useEffect(() => {
    setReaderActive(false)
  }, [activeId])

  useEffect(() => {
    if (activeId === null) return
    const t = tabs.find((tab) => tab.id === activeId)
    if (t && !t.internal) setChromePage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    if (!chromePage) return

    const onMouseUp = (e: MouseEvent): void => {
      if (e.button === 3) {
        e.preventDefault()
        setChromePage(null)
      }
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      if (isTyping) return
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        setChromePage(null)
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setChromePage(null)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setChromePage(null)
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [chromePage])

  const handleChangeGroup = useCallback(async (tabId: number, groupId: string | null) => {
    if (groupId === null) {
      await window.aura.groups.removeTab(tabId)
    } else {
      await window.aura.groups.addTab(groupId, tabId)
    }
  }, [])

  const handleSaveToReadingList = useCallback(async () => {
    if (!activeTab || activeTab.internal) return
    await window.aura.readingList.add(activeTab.url, activeTab.title)
    setPanelMessage('Saved to reading list')
    setTimeout(() => setPanelMessage(null), 2000)
  }, [activeTab])

  const toolbarMenuHandlers = React.useMemo(() => ({
    bookmarksBarVisible: bookmarksBarVisible,
    sidebarVisible: !sidebarCollapsed,
    onToggleBookmarksBar: () => setBookmarksBarVisible((v) => !v),
    onToggleSidebar: () => setSidebarCollapsed((c) => !c),
    onOpenSettings: () => setChromePage('settings')
  }), [bookmarksBarVisible, sidebarCollapsed])

  const handleNavigate = useCallback(
    (value: string) => {
      setChromePage(null)
      if (activeId !== null) window.aura.split.navigateFocused(activeId, value)
    },
    [activeId]
  )

  const handleNew = useCallback(() => {
    window.aura.tabs.create('aura://newtab')
  }, [])

  const handleClose = useCallback((id: number) => {
    window.aura.tabs.close(id)
  }, [])

  const handleSelect = useCallback((id: number) => {
    window.aura.tabs.activate(id)
  }, [])

  const handleSidebarAction = useCallback((action: SidebarAction) => {
    if (action === 'privacy') return setChromePage((p) => p === 'privacy' ? null : 'privacy')
    if (action === 'history') return setChromePage((p) => p === 'history' ? null : 'history')
    if (action === 'bookmarks') return setChromePage((p) => p === 'bookmarks' ? null : 'bookmarks')
    if (action === 'downloads') return setChromePage((p) => p === 'downloads' ? null : 'downloads')
    if (action === 'readingList') return setChromePage((p) => p === 'readingList' ? null : 'readingList')
    if (action === 'boosts') return setChromePage((p) => p === 'boosts' ? null : 'boosts')
    if (action === 'settings') return setChromePage((p) => p === 'settings' ? null : 'settings')
    if (action === 'verticalTabs') {
      window.aura.settings.set('tabsLayout', settings?.tabsLayout === 'vertical' ? 'horizontal' : 'vertical')
      return
    }
    const labels: Partial<Record<SidebarAction, string>> = {
      extensions: 'Extensions page arrives in Stage 10',
      profile: 'Profile switcher arrives in Stage 10'
    }
    const label = labels[action]
    if (label) {
      setPanelMessage(label)
      setTimeout(() => setPanelMessage(null), 2500)
    }
  }, [settings])

  useKeyboard({
    onFocusAddress: () => setFocusSignal((n) => n + 1),
    onCommandPalette: () => setPaletteOpen(true),
    onNextTab: (reverse) => {
      if (tabs.length < 2 || activeId === null) return
      const idx = tabs.findIndex((t) => t.id === activeId)
      const next = reverse
        ? (idx - 1 + tabs.length) % tabs.length
        : (idx + 1) % tabs.length
      window.aura.tabs.activate(tabs[next].id)
    },
    onToggleSidebar: () => setSidebarCollapsed((c) => !c)
  })

  useEffect(() => {
    return window.aura.shortcuts.onToggleVerticalTabs(() => {
      window.aura.settings.set('tabsLayout', settings?.tabsLayout === 'vertical' ? 'horizontal' : 'vertical')
    })
  }, [settings])

  useEffect(() => {
    return window.aura.shortcuts.onNinjaModal(() => setNinjaModalOpen(true))
  }, [])

  useEffect(() => {
    return window.aura.shortcuts.onBookmark(() => setBookmarkSignal((n) => n + 1))
  }, [])

  useEffect(() => {
    return window.aura.shortcuts.onReopenClosed(() => {
      void window.aura.tabs.reopenClosed()
    })
  }, [])

  useEffect(() => {
    return window.aura.shortcuts.onTabSearch(() => setTabSearchOpen(true))
  }, [])

  useEffect(() => {
    return window.aura.shortcuts.onOpenSettings(() => setChromePage('settings'))
  }, [])

  useEffect(() => {
    return window.aura.contextMenu.onOpenInNinja((url: string) => {
      window.aura.ninja.launchWithUrl(url)
    })
  }, [])

  useEffect(() => {
    const unsub = window.aura.translator.onRequestOpenFloating((data) => {
      const toolbar = document.querySelector('.chrome-top-row, [class*="chrome-top-row"]')
      const bookmarksBar = document.querySelector('.bookmarks-bar, [class*="bookmarks-bar"]')
      const sidebar = document.querySelector('.sidebar, [class*="sidebar"]')

      const chromeOffsetTop = (toolbar?.getBoundingClientRect().bottom || 80) +
        (bookmarksBar?.getBoundingClientRect().height || 0)
      const chromeOffsetLeft = sidebar?.getBoundingClientRect().width || 0

      window.aura.translator.openFloating({
        text: data.text,
        pageRectX: data.pageRectX,
        pageRectY: data.pageRectY,
        chromeOffsetTop,
        chromeOffsetLeft
      })
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.aura.imageSaver.onRequestOpenFloating((data) => {
      const toolbar = document.querySelector('.chrome-top-row, [class*="chrome-top-row"]')
      const bookmarksBar = document.querySelector('.bookmarks-bar, [class*="bookmarks-bar"]')
      const sidebar = document.querySelector('.sidebar, [class*="sidebar"]')

      const chromeOffsetTop = (toolbar?.getBoundingClientRect().bottom || 80) +
        (bookmarksBar?.getBoundingClientRect().height || 0)
      const chromeOffsetLeft = sidebar?.getBoundingClientRect().width || 0
      const batchMode = !data.srcURL

      window.aura.imageSaver.openFloating({
        srcURL: data.srcURL || '',
        batchMode,
        sourceWcId: data.sourceWcId,
        pageRectX: data.pageRectX,
        pageRectY: data.pageRectY,
        chromeOffsetTop,
        chromeOffsetLeft
      })
    })
    return unsub
  }, [])

  useEffect(() => {
    return window.aura.shortcuts.onScreenshot(async () => {
      if (activeId === null || !activeTab || activeTab.internal) return
      const result = await window.aura.tabs.screenshot(activeId, 'save')
      if (result === 'clipboard') {
        setPanelMessage('Screenshot copied to clipboard')
      } else if (result) {
        setPanelMessage('Screenshot saved')
      }
      setTimeout(() => setPanelMessage(null), 2500)
    })
  }, [activeId, activeTab])

  useEffect(() => {
    return window.aura.shortcuts.onReaderMode(() => {
      if (activeTab && !activeTab.internal) {
        if (readerActive) {
          void window.aura.reader.exit(activeId!)
          setReaderActive(false)
        } else {
          void window.aura.reader.enter(activeId!).then((r) => {
            if (r.ok) setReaderActive(true)
          })
        }
      }
    })
  }, [activeTab, readerActive, activeId])

  useEffect(() => {
    return window.aura.shortcuts.onToggleBookmarksBar(() => {
      setBookmarksBarVisible((v) => !v)
    })
  }, [setBookmarksBarVisible])

  useEffect(() => {
    return window.aura.shortcuts.onFindInPage(() => {
      if (activeTab && !activeTab.internal) setFindBarOpen(true)
    })
  }, [activeTab])

  useEffect(() => {
    return window.aura.shortcuts.onEscape(() => {
      if (findBarOpen) {
        setFindBarOpen(false)
        if (activeId !== null) void window.aura.tabs.stopFind(activeId)
      }
    })
  }, [findBarOpen, activeId])

  useEffect(() => {
    if (findBarOpen) {
      setFindBarOpen(false)
      if (activeId !== null) void window.aura.tabs.stopFind(activeId)
    }
  }, [activeId])

  // STAGE 8.8 — listen for fullscreen enter/exit from main process
  useEffect(() => {
    const unsubEnter = window.aura.shortcuts.onFullscreenEnter(() => {
      document.documentElement.setAttribute('data-fullscreen', 'true')
    })
    const unsubExit = window.aura.shortcuts.onFullscreenExit(() => {
      document.documentElement.setAttribute('data-fullscreen', 'false')
    })
    return () => {
      unsubEnter()
      unsubExit()
    }
  }, [])

  const renderChromePage = (): React.ReactElement | null => {
    const onClose = (): void => setChromePage(null)
    if (chromePage === 'privacy') return <PrivacyDashboard onClose={onClose} />
    if (chromePage === 'history') return <HistoryPage onNavigate={handleNavigate} onClose={onClose} />
    if (chromePage === 'bookmarks') return <BookmarksPage onNavigate={handleNavigate} onClose={onClose} />
    if (chromePage === 'downloads') return <DownloadsPage onClose={onClose} />
    if (chromePage === 'readingList') return <ReadingListPage onNavigate={handleNavigate} onClose={onClose} />
    if (chromePage === 'boosts') return <BoostsPage onClose={onClose} />
    if (chromePage === 'settings') return <SettingsPage onClose={onClose} />
    return null
  }

  return (
    <div className="app-root">
      {verticalTabs && (
        <Sidebar
          toolbarMenuHandlers={toolbarMenuHandlers}
          collapsed={sidebarCollapsed}
          verticalTabsMode={verticalTabs}
          width={verticalWidth}
          resizing={isResizing}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          onAction={handleSidebarAction}
          onResizeStart={onResizeStart}
        >
          <TabBar
            tabs={tabs}
            activeId={activeId}
            onSelect={handleSelect}
            onClose={handleClose}
            onNew={handleNew}
            isPrivate={isPrivate}
            vertical
            onChangeGroup={handleChangeGroup}
          />
        </Sidebar>
      )}

      <div className="main-area">
        <div className="chrome">
          {!verticalTabs && (
            <div className="chrome-top-row">
              <TabBar
              tabs={tabs}
              activeId={activeId}
              onSelect={handleSelect}
              onClose={handleClose}
              onNew={handleNew}
              isPrivate={isPrivate}
              onChangeGroup={handleChangeGroup}
            />
              <div className="drag-spacer" />
              <WindowControls />
            </div>
          )}

          {verticalTabs && (
            <div className="chrome-top-row compact">
              <div className="drag-spacer" />
              <WindowControls />
            </div>
          )}

          <Toolbar
            toolbarMenuHandlers={toolbarMenuHandlers}
            tab={activeTab}
            onBack={() => activeId !== null && window.aura.tabs.goBack(activeId)}
            onForward={() => activeId !== null && window.aura.tabs.goForward(activeId)}
            onReload={() => activeId !== null && window.aura.tabs.reload(activeId)}
            onNavigate={handleNavigate}
            focusSignal={focusSignal}
            onOpenHistory={() => setChromePage(chromePage === 'history' ? null : 'history')}
            onOpenDownloads={() => setChromePage(chromePage === 'downloads' ? null : 'downloads')}
            onOpenExtensions={() => {
              setPanelMessage('Extensions page arrives in Stage 10')
              setTimeout(() => setPanelMessage(null), 2500)
            }}
            onOpenSettings={() => setChromePage(chromePage === 'settings' ? null : 'settings')}
            onOpenProfile={() => {
              setPanelMessage('Profile switcher arrives in Stage 10')
              setTimeout(() => setPanelMessage(null), 2500)
            }}
            onOpenNinja={() => setNinjaModalOpen(true)}
            onOpenCommandPalette={() => setPaletteOpen(true)}
            onToggleVerticalTabs={() => window.aura.settings.set('tabsLayout', settings?.tabsLayout === 'vertical' ? 'horizontal' : 'vertical')}
            verticalTabs={verticalTabs}
            bookmarkSignal={bookmarkSignal}
            onOpenFindBar={() => setFindBarOpen(true)}
            onToggleReader={() => {
              if (activeTab && !activeTab.internal) {
                if (readerActive) {
                  void window.aura.reader.exit(activeId!)
                  setReaderActive(false)
                } else {
                  void window.aura.reader.enter(activeId!).then((r) => {
                    if (r.ok) setReaderActive(true)
                  })
                }
              }
            }}
            readerActive={readerActive}
            onSaveToReadingList={handleSaveToReadingList}
          />

          {/* STAGE 8.7: Hide bookmarks bar on internal pages (new tab, settings, etc.)
              — matches Safari/Arc/Brave behavior. Bookmarks bar only appears
              when you're actively browsing a real site. */}
          <BookmarksBar
            toolbarMenuHandlers={toolbarMenuHandlers}
            visible={showBookmarksBar}
            onNavigate={handleNavigate}
            onOpenBookmarksPage={() => setChromePage('bookmarks')}
            onToggleVisible={() => setBookmarksBarVisible((v) => !v)}
          />
        </div>

        <ProgressBar loading={activeTab?.loading ?? false} />

        <div className="content">
          {readerActive && activeId !== null && activeTab && !activeTab.internal ? (
            <ReaderPage tabId={activeId} onExit={() => setReaderActive(false)} />
          ) : chromePage !== null
            ? renderChromePage()
            : activeTab?.internal
              ? isPrivate
                ? <NinjaNewTab onNavigate={handleNavigate} />
                : <NewTabDashboard onNavigate={handleNavigate} />
              : null}
        </div>

        <SplitOverlay tabId={activeId} />

        <FindBar
          visible={findBarOpen}
          matches={activeTab?.findMatches ?? null}
          onSearch={(q, forward) => {
            if (activeId !== null) void window.aura.tabs.find(activeId, q, forward)
          }}
          onNext={(forward) => {
            if (activeId !== null) void window.aura.tabs.findNext(activeId, forward)
          }}
          onClose={() => {
            setFindBarOpen(false)
            if (activeId !== null) void window.aura.tabs.stopFind(activeId)
          }}
        />

        {panelMessage && <div className="toast" key={panelMessage}>{panelMessage}</div>}
        {reloadHint && (
          <div className="a11y-reload-hint">
            Reload your tabs to apply the new {reloadHint === 'minFontSize' ? 'font size' : 'setting'}.
            <button onClick={() => { void window.aura.tabs.reloadAll?.(); setReloadHint(null) }}>
              Reload all
            </button>
          </div>
        )}
        <PermissionPrompt />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
        onNewTab={handleNew}
        onNinja={() => setNinjaModalOpen(true)}
        onOpenPage={(page) => setChromePage(page as ChromePage)}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        onToggleBookmarksBar={() => setBookmarksBarVisible((v) => !v)}
        onQuit={() => window.close()}
      />

      <NinjaModal
        open={ninjaModalOpen}
        onClose={() => setNinjaModalOpen(false)}
        onLaunch={() => {
          window.aura.ninja.launch()
          setNinjaModalOpen(false)
        }}
      />

      <TabSearchPalette
        open={tabSearchOpen}
        tabs={tabs}
        onClose={() => setTabSearchOpen(false)}
        onSelect={(id) => window.aura.tabs.activate(id)}
        onClose_={(id) => window.aura.tabs.close(id)}
      />

      <AutofillSavePrompt />

      {isResizing && (
        <div
          className="resize-preview-line"
          style={{ left: `${verticalWidth - 1}px` }}
        />
      )}
    </div>
  )
}

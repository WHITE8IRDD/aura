import React, { useCallback, useEffect, useState } from 'react'
import TabBar from './components/TabBar'
import Toolbar from './components/Toolbar'
import Sidebar, { type SidebarAction } from './components/Sidebar'
import WindowControls from './components/WindowControls'
import CommandPalette from './components/CommandPalette'
import ProgressBar from './components/ProgressBar'
import PermissionPrompt from './components/PermissionPrompt'
import NewTabDashboard from './pages/NewTabDashboard'
import NinjaNewTab from './pages/NinjaNewTab'
import NinjaModal from './components/NinjaModal'
import PrivacyDashboard from './pages/PrivacyDashboard'
import { useKeyboard } from './hooks/useKeyboard'
import type { TabState } from './types'

const SIDEBAR_WIDTH_EXPANDED = 184
const SIDEBAR_WIDTH_COLLAPSED = 52

type ChromePage = null | 'privacy'

export default function App(): React.ReactElement {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)
  const [panelMessage, setPanelMessage] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [ninjaModalOpen, setNinjaModalOpen] = useState(false)
  const [chromePage, setChromePage] = useState<ChromePage>(null)

  useEffect(() => {
    window.aura.tabs.getState().then(({ tabs: t, activeId: a }) => {
      if (t.length > 0) { setTabs(t); setActiveId(a) }
    })
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
    window.aura.ninja
      .isPrivate()
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
    const width = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
    window.aura.layout.setSidebarWidth(width)
  }, [sidebarCollapsed])

  // Hide WebContentsView when any modal/overlay opens so React content
  // appears ABOVE the web content (otherwise Electron layers it behind)
  useEffect(() => {
    const anyOverlay = ninjaModalOpen || paletteOpen || chromePage !== null
    if (anyOverlay) {
      window.aura.layout.hideView()
    } else {
      window.aura.layout.showView()
    }
  }, [ninjaModalOpen, paletteOpen, chromePage])

  const activeTab = tabs.find((t) => t.id === activeId)

  useEffect(() => {
    if (activeTab && !activeTab.internal) setChromePage(null)
  }, [activeTab])

  const handleNavigate = useCallback(
    (value: string) => {
      setChromePage(null)
      if (activeId !== null) window.aura.tabs.navigate(activeId, value)
    },
    [activeId]
  )

  const handleNew = useCallback(() => {
    window.aura.tabs.create('aura://newtab')
  }, [])

  const handleSidebarAction = useCallback((action: SidebarAction) => {
    if (action === 'privacy') {
      setChromePage('privacy')
      return
    }
    const labels: Record<SidebarAction, string> = {
      bookmarks: 'Bookmarks arrives in Stage 6',
      history: 'History arrives in Stage 6',
      downloads: 'Downloads arrives in Stage 6',
      privacy: '',
      extensions: 'Extensions page arrives in Stage 8',
      settings: 'Settings arrives in Stage 8',
      profile: 'Profile switcher arrives in Stage 8'
    }
    setPanelMessage(labels[action])
    setTimeout(() => setPanelMessage(null), 2500)
  }, [])

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
    onSwitchTab: (i) => {
      if (tabs[i]) window.aura.tabs.activate(tabs[i].id)
    },
    onToggleSidebar: () => setSidebarCollapsed((c) => !c)
  })

  useEffect(() => {
    return window.aura.shortcuts.onNinjaModal(() => setNinjaModalOpen(true))
  }, [])

  return (
    <div className="app-root">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        onAction={handleSidebarAction}
      />

      <div className="main-area">
        <div className="chrome">
          <div className="chrome-top-row">
            <TabBar
              tabs={tabs}
              activeId={activeId}
              onSelect={(id) => window.aura.tabs.activate(id)}
              onClose={(id) => window.aura.tabs.close(id)}
              onNew={handleNew}
              isPrivate={isPrivate}
            />
            <div className="drag-spacer" />
            <WindowControls />
          </div>

          <Toolbar
            tab={activeTab}
            onBack={() => activeId !== null && window.aura.tabs.goBack(activeId)}
            onForward={() => activeId !== null && window.aura.tabs.goForward(activeId)}
            onReload={() => activeId !== null && window.aura.tabs.reload(activeId)}
            onNavigate={handleNavigate}
            onAssistant={() => setPanelMessage('AI assistant arrives in Stage 7')}
            focusSignal={focusSignal}
          />
        </div>

        <ProgressBar loading={activeTab?.loading ?? false} />

        <div className="content">
          {chromePage === 'privacy' ? (
            <PrivacyDashboard />
          ) : activeTab?.internal ? (
            isPrivate ? (
              <NinjaNewTab onNavigate={handleNavigate} />
            ) : (
              <NewTabDashboard onNavigate={handleNavigate} />
            )
          ) : null}
        </div>

        {panelMessage && (
          <div className="toast" key={panelMessage}>
            {panelMessage}
          </div>
        )}

        <PermissionPrompt />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
        onNewTab={handleNew}
      />

      <NinjaModal
        open={ninjaModalOpen}
        onCancel={() => setNinjaModalOpen(false)}
        onEnable={() => {
          window.aura.ninja.launch()
          setNinjaModalOpen(false)
        }}
      />
    </div>
  )
}

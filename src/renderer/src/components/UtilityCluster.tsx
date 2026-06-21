import React, { useCallback, useEffect, useState } from 'react'
import {
  IconHistory, IconDownload, IconExtension, IconSettings,
  IconUser, IconSidebar, IconSplit
} from './Icons'
import NinjaAvatar from './NinjaAvatar'
import { MediaHub } from './MediaHub'

interface TabState {
  id: number
  url: string
  title: string
}

interface Props {
  onOpenHistory: () => void
  onOpenDownloads: () => void
  onOpenExtensions: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenNinja: () => void
  onOpenCommandPalette: () => void
  onToggleVerticalTabs: () => void
  verticalTabs: boolean
  activeTab?: TabState | null
}

export default function UtilityCluster({
  onOpenHistory, onOpenDownloads, onOpenExtensions,
  onOpenSettings, onOpenProfile, onOpenNinja,
  onOpenCommandPalette, onToggleVerticalTabs,
  verticalTabs, activeTab
}: Props): React.ReactElement {
  const [pageTranslated, setPageTranslated] = useState(false)
  const [translatedTabId, setTranslatedTabId] = useState<number | null>(null)
  const [splitActive, setSplitActive] = useState(false)

  useEffect(() => {
    if (!activeTab) { setSplitActive(false); return }
    window.aura.split.isSplit(activeTab.id).then(setSplitActive)
  }, [activeTab?.id])

  useEffect(() => {
    return window.aura.split.onSplitChanged(() => {
      if (!activeTab) { setSplitActive(false); return }
      window.aura.split.isSplit(activeTab.id).then(setSplitActive)
    })
  }, [activeTab])

  const handleToggleSplit = useCallback(async (): Promise<void> => {
    if (!activeTab) return
    if (splitActive) {
      await window.aura.split.close(activeTab.id)
      return
    }
    // Enter split: use current tab + the most recent other tab
    const state = await window.aura.tabs.getState()
    const list = state?.tabs ?? []
    if (!state?.activeId || list.length < 2) return
    const other = list.find((t: { id: number }) => t.id !== state.activeId)
    if (other) {
      await window.aura.split.open(activeTab.id, other.url || 'aura://newtab')
    }
  }, [activeTab, splitActive])

  useEffect(() => {
    if (activeTab?.id !== translatedTabId) {
      setPageTranslated(false)
      setTranslatedTabId(null)
    }
  }, [activeTab?.id, translatedTabId])

  const handleTranslatePage = useCallback(() => {
    if (!activeTab || activeTab.url.startsWith('aura://')) return
    if (pageTranslated && translatedTabId === activeTab.id) {
      window.aura.tabs.sendMessage(activeTab.id, 'pageTranslator:revert')
      setPageTranslated(false)
      setTranslatedTabId(null)
    } else {
      window.aura.tabs.sendMessage(activeTab.id, 'pageTranslator:translate', 'en')
      setPageTranslated(true)
      setTranslatedTabId(activeTab.id)
    }
  }, [activeTab, pageTranslated, translatedTabId])
  return (
    <div className="utility-cluster">
      {/* Group A — Global tools */}
      <button className="util-btn" title="History" onClick={onOpenHistory}>
        <IconHistory size={15} />
      </button>
      <button className="util-btn" title="Downloads" onClick={onOpenDownloads}>
        <IconDownload size={15} />
      </button>
      <MediaHub />
      <button className={`util-btn${splitActive ? ' active' : ''}`}
        title={splitActive ? 'Exit split view (Ctrl+\\)' : 'Enter split view (Ctrl+\\)'}
        onClick={handleToggleSplit}
        aria-pressed={splitActive}>
        <IconSplit size={15} filled={splitActive} />
      </button>
      <button className="util-btn ninja-util" title="Ninja Mode" onClick={onOpenNinja}>
        <NinjaAvatar size={18} />
      </button>
      <button className="util-btn" title="Quick search (Ctrl+K)" onClick={onOpenCommandPalette}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6v6H9z" />
          <path d="M9 3v6" />
          <path d="M15 3v6" />
          <path d="M9 15v6" />
          <path d="M15 15v6" />
          <path d="M3 9h6" />
          <path d="M15 9h6" />
          <path d="M3 15h6" />
          <path d="M15 15h6" />
        </svg>
      </button>
      <button className={`util-btn${pageTranslated ? ' translator-active' : ''}`}
        title={pageTranslated ? 'Show original' : 'Translate page'}
        onClick={handleTranslatePage}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8l6 6" />
          <path d="M4 14l6-6 2-2" />
          <path d="M12 4l-4 8 2 2" />
          <path d="M14 12l-2 2-2 2" />
          <path d="M16 10l-2 2 2 2 2-2-2-2z" />
          <path d="M18 12h-2" />
          <path d="M19 8l-3 4" />
          <path d="M17 16l3-4" />
        </svg>
      </button>

      <div className="toolbar-group-separator" />

      {/* Group B — Account & overflow */}
      <button className="util-btn" title="Extensions" onClick={onOpenExtensions}>
        <IconExtension size={15} />
      </button>
      <button className="util-btn" title="Settings" onClick={onOpenSettings}>
        <IconSettings size={15} />
      </button>
      <button className="util-btn" title="Profile" onClick={onOpenProfile}>
        <IconUser size={15} />
      </button>

      <div className="toolbar-group-separator" />

      {/* Group C — Layout (hidden in horizontal tabs mode) */}
      {verticalTabs && (
        <button className="util-btn" title="Toggle vertical tabs (Ctrl+Shift+E)"
          onClick={onToggleVerticalTabs}>
          <IconSidebar size={15} />
        </button>
      )}
    </div>
  )
}

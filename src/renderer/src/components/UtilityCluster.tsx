import React, { useCallback, useEffect, useState } from 'react'
import {
  IconHistory, IconDownload, IconExtension, IconSettings,
  IconUser, IconSidebar, IconSplit, IconReader
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
  readerActive?: boolean
  onToggleReader?: () => void
}

export default function UtilityCluster({
  onOpenHistory, onOpenDownloads, onOpenExtensions,
  onOpenSettings, onOpenProfile, onOpenNinja,
  onOpenCommandPalette, onToggleVerticalTabs,
  verticalTabs, activeTab,
  readerActive: propReaderActive, onToggleReader: propOnToggleReader
}: Props): React.ReactElement {
  const [pageTranslated, setPageTranslated] = useState(false)
  const [translatedTabId, setTranslatedTabId] = useState<number | null>(null)
  const [splitActive, setSplitActive] = useState(false)
  const [readerAvailable, setReaderAvailable] = useState(false)
  const [readerActive, setReaderActive] = useState(false)
  const effectiveReaderActive = propReaderActive ?? readerActive

  useEffect(() => {
    if (!activeTab) { setSplitActive(false); return }
    window.aura.split.isSplit(activeTab.id).then(setSplitActive)
  }, [activeTab?.id])

  useEffect(() => {
    if (!activeTab) {
      setReaderAvailable(false)
      setReaderActive(false)
      return
    }
    let cancelled = false
    const checkReader = async (): Promise<void> => {
      try {
        const active = await window.aura.reader.isActive(activeTab.id)
        if (cancelled) return
        setReaderActive(!!active)
        if (active) {
          setReaderAvailable(true)
        } else {
          const probe = await window.aura.reader.probe(activeTab.id)
          if (!cancelled) setReaderAvailable(!!probe?.readerable)
        }
      } catch {
        if (!cancelled) {
          setReaderAvailable(false)
          setReaderActive(false)
        }
      }
    }
    void checkReader()
    const t = setTimeout(checkReader, 1200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [activeTab?.id, activeTab?.url, propReaderActive])

  useEffect(() => {
    return window.aura.split.onSplitChanged(() => {
      if (!activeTab) { setSplitActive(false); return }
      window.aura.split.isSplit(activeTab.id).then(setSplitActive)
    })
  }, [activeTab])

  const handleToggleReader = useCallback(async (): Promise<void> => {
    if (propOnToggleReader) {
      propOnToggleReader()
      return
    }
    if (!activeTab) return
    if (readerActive) {
      await window.aura.reader.exit(activeTab.id)
      setReaderActive(false)
    } else {
      const result = await window.aura.reader.enter(activeTab.id)
      if (result.ok) {
        setReaderActive(true)
        setReaderAvailable(true)
      }
    }
  }, [activeTab, readerActive, propOnToggleReader])

  const handleToggleSplit = useCallback(async (): Promise<void> => {
    if (splitActive) {
      if (activeTab) await window.aura.split.close(activeTab.id)
      return
    }

    if (!activeTab) return
    const tabState = await window.aura.tabs.getState()
    const list = tabState?.tabs ?? []
    const activeId = tabState?.activeId

    if (!activeId || list.length < 2) return

    const other = list.find((t: { id: number }) => t.id !== activeId)
    if (!other) return

    await window.aura.split.open(activeId, other.url ?? 'about:blank')
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
      <button className={`util-btn reader-toggle-btn${effectiveReaderActive ? ' active' : ''}${!readerAvailable ? ' hidden' : ''}`}
        title={effectiveReaderActive ? 'Exit reader (Ctrl+Shift+R)' : 'Reader mode (Ctrl+Shift+R)'}
        onClick={handleToggleReader}
        aria-pressed={effectiveReaderActive}>
        <IconReader size={15} filled={effectiveReaderActive} />
      </button>
      <button className={`util-btn${splitActive ? ' active' : ''}`}
        title={splitActive ? 'Exit split view (Ctrl+/)' : 'Enter split view (Ctrl+/)'}
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

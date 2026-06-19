import React from 'react'
import {
  IconHistory, IconDownload, IconExtension, IconSettings,
  IconUser, IconSidebar
} from './Icons'
import NinjaAvatar from './NinjaAvatar'

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
}

export default function UtilityCluster({
  onOpenHistory, onOpenDownloads, onOpenExtensions,
  onOpenSettings, onOpenProfile, onOpenNinja,
  onOpenCommandPalette, onToggleVerticalTabs,
  verticalTabs
}: Props): React.ReactElement {
  return (
    <div className="utility-cluster">
      {/* Group A — Global tools */}
      <button className="util-btn" title="History" onClick={onOpenHistory}>
        <IconHistory size={15} />
      </button>
      <button className="util-btn" title="Downloads" onClick={onOpenDownloads}>
        <IconDownload size={15} />
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

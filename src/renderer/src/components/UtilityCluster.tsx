import React from 'react'
import {
  IconBookmark, IconHistory, IconDownload, IconShield,
  IconExtension, IconSettings, IconUser, IconSidebar
} from './Icons'
import NinjaAvatar from './NinjaAvatar'

interface Props {
  onOpenBookmarks: () => void
  onOpenHistory: () => void
  onOpenDownloads: () => void
  onOpenPrivacy: () => void
  onOpenExtensions: () => void
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenNinja: () => void
  onToggleVerticalTabs: () => void
}

export default function UtilityCluster({
  onOpenBookmarks, onOpenHistory, onOpenDownloads, onOpenPrivacy,
  onOpenExtensions, onOpenSettings, onOpenProfile, onOpenNinja,
  onToggleVerticalTabs
}: Props): React.ReactElement {
  return (
    <div className="utility-cluster">
      <button className="util-btn" title="Bookmarks" onClick={onOpenBookmarks}>
        <IconBookmark size={15} />
      </button>
      <button className="util-btn" title="History" onClick={onOpenHistory}>
        <IconHistory size={15} />
      </button>
      <button className="util-btn" title="Downloads" onClick={onOpenDownloads}>
        <IconDownload size={15} />
      </button>
      <button className="util-btn" title="Privacy" onClick={onOpenPrivacy}>
        <IconShield size={15} />
      </button>
      <button className="util-btn ninja-util" title="Ninja Mode" onClick={onOpenNinja}>
        <NinjaAvatar size={18} />
      </button>
      <button className="util-btn" title="Extensions" onClick={onOpenExtensions}>
        <IconExtension size={15} />
      </button>
      <button className="util-btn" title="Settings" onClick={onOpenSettings}>
        <IconSettings size={15} />
      </button>
      <button className="util-btn" title="Profile" onClick={onOpenProfile}>
        <IconUser size={15} />
      </button>
      <div className="util-divider" />
      <button className="util-btn" title="Toggle vertical tabs (Ctrl+Shift+E)"
        onClick={onToggleVerticalTabs}>
        <IconSidebar size={15} />
      </button>
    </div>
  )
}

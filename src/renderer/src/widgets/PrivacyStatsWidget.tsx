import React, { useEffect, useState } from 'react'
import WidgetCard from './WidgetCard'
import { IconShield } from '../components/Icons'

interface Stats {
  trackersBlocked: number
  adsBlocked: number
  fingerprintersBlocked: number
  socialBlocked: number
  bandwidthSavedKb: number
}

interface Props {
  size: 1 | 2 | 3
  dragHandlers?: {
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
}

export default function PrivacyStatsWidget({
  size,
  dragHandlers
}: Props): React.ReactElement {
  const [stats, setStats] = useState<Stats>({
    trackersBlocked: 0,
    adsBlocked: 0,
    fingerprintersBlocked: 0,
    socialBlocked: 0,
    bandwidthSavedKb: 0
  })

  useEffect(() => {
    const load = (): void => {
      window.aura.privacy.stats().then(setStats).catch(() => {})
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [])

  const bandwidth =
    stats.bandwidthSavedKb >= 1024
      ? `${(stats.bandwidthSavedKb / 1024).toFixed(1)} MB`
      : `${stats.bandwidthSavedKb} KB`

  const total =
    stats.trackersBlocked +
    stats.adsBlocked +
    stats.fingerprintersBlocked +
    stats.socialBlocked

  return (
    <WidgetCard
      title="Privacy Shield"
      subtitle={total > 0 ? `${total} blocked · ${bandwidth} saved` : 'Active'}
      icon={<IconShield size={16} />}
      size={size}
      draggable
      {...dragHandlers}
    >
      <div className="privacy-stats">
        <div className="privacy-stat">
          <span className="privacy-stat-value">{stats.trackersBlocked}</span>
          <span className="privacy-stat-label">Trackers</span>
        </div>
        <div className="privacy-stat">
          <span className="privacy-stat-value">{stats.adsBlocked}</span>
          <span className="privacy-stat-label">Ads</span>
        </div>
        <div className="privacy-stat">
          <span className="privacy-stat-value">{stats.socialBlocked}</span>
          <span className="privacy-stat-label">Social</span>
        </div>
        <div className="privacy-stat">
          <span className="privacy-stat-value">{stats.fingerprintersBlocked}</span>
          <span className="privacy-stat-label">Fingerprint</span>
        </div>
      </div>
    </WidgetCard>
  )
}

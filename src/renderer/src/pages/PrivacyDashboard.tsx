import React, { useEffect, useState } from 'react'
import { IconShield } from '../components/Icons'
import { ChromePageHeader } from '../components/ChromePageHeader'

interface Props {
  onClose: () => void
}

interface Stats {
  trackersBlocked: number
  adsBlocked: number
  fingerprintersBlocked: number
  socialBlocked: number
  bandwidthSavedKb: number
}

export default function PrivacyDashboard({ onClose }: Props): React.ReactElement {
  const [stats, setStats] = useState<Stats>({
    trackersBlocked: 0,
    adsBlocked: 0,
    fingerprintersBlocked: 0,
    socialBlocked: 0,
    bandwidthSavedKb: 0
  })

  useEffect(() => {
    const load = (): void => {
      window.aura.privacy.stats().then(setStats)
    }
    load()
    const interval = setInterval(load, 2000)
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
    <div className="privacy-dashboard">
      <ChromePageHeader title="Privacy Shield" onBack={onClose} />
      <header className="pd-header">
        <IconShield size={28} />
        <div>
          <p>
            {total > 0
              ? `${total} requests blocked this session`
              : 'Real-time protection for this session'}
          </p>
        </div>
      </header>

      <section className="pd-stats">
        <StatCard value={stats.trackersBlocked} label="Trackers blocked" />
        <StatCard value={stats.adsBlocked} label="Ads blocked" />
        <StatCard value={stats.socialBlocked} label="Social trackers blocked" />
        <StatCard value={stats.fingerprintersBlocked} label="Fingerprinters blocked" />
        <StatCard value={bandwidth} label="Bandwidth saved" />
      </section>

      <section className="pd-protections">
        <h2>Active protections</h2>
        <ul>
          <li><strong>Tracker & ad blocking</strong> — EasyList + EasyPrivacy (50,000+ rules)</li>
          <li><strong>HTTPS-Only mode</strong> — every http connection auto-upgraded</li>
          <li><strong>Canvas fingerprint defense</strong> — randomized image data noise</li>
          <li><strong>User-agent normalization</strong> — generic Chrome UA presented</li>
          <li><strong>WebRTC IP leak protection</strong> — local IPs masked via mDNS</li>
          <li><strong>Phishing protection</strong> — local domain blocklist</li>
          <li><strong>Permission control</strong> — per-site prompts, deny by default</li>
        </ul>
      </section>

      <section className="pd-degoogle">
        <h2>Independence</h2>
        <p>
          Aura's own code makes <strong>zero outbound connections</strong> to Google services.
          The browser engine is Chromium (open source) — Google's tracking pieces (Sync,
          Safe Browsing, telemetry, suggestions, FCM) are not bundled. Favicons are fetched
          directly from the source site, never via Google's S2 service.
        </p>
      </section>
    </div>
  )
}

function StatCard({
  value,
  label
}: {
  value: number | string
  label: string
}): React.ReactElement {
  return (
    <div className="pd-stat">
      <div className="pd-stat-value">{value}</div>
      <div className="pd-stat-label">{label}</div>
    </div>
  )
}

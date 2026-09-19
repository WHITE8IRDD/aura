import React, { useEffect, useState } from 'react'

interface SiteShieldSettings {
  domain: string
  level: 'off' | 'standard' | 'aggressive' | 'custom'
  blockAds: boolean
  blockTrackers: boolean
  blockSocial: boolean
  blockFingerprinters: boolean
  blockAnnoyances: boolean
  blockedCount: number
}

interface PageBlockedStats {
  ads: number
  trackers: number
  total: number
}

export const ShieldsPopoverWindow: React.FC = () => {
  const [level, setLevel] = useState<'off' | 'standard' | 'aggressive'>('standard')
  const [blockedStats, setBlockedStats] = useState<PageBlockedStats>({ ads: 0, trackers: 0, total: 0 })
  const [totalLifetime, setTotalLifetime] = useState(0)
  const [domain, setDomain] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('domain') || ''
    setDomain(d)
  }, [])

  useEffect(() => {
    if (!domain) return

    let cancelled = false

    const fetchStats = async () => {
      if (window.aura?.shields?.getSettings) {
        try {
          const settings: SiteShieldSettings | null = await window.aura.shields.getSettings(domain)
          if (!cancelled && settings) {
            setLevel(settings.level === 'off' ? 'off' : settings.level === 'aggressive' ? 'aggressive' : 'standard')
            setTotalLifetime(settings.blockedCount || 0)
          }
        } catch {}
      }
      if (window.aura?.shields?.getPageStats) {
        try {
          const pageStats: PageBlockedStats | null = await window.aura.shields.getPageStats()
          if (!cancelled && pageStats) setBlockedStats(pageStats)
        } catch {}
      }
    }

    fetchStats()
    // Poll stats every 500ms while popover is open so live blocks update in real time!
    const interval = setInterval(fetchStats, 500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [domain])

  const handleLevelChange = async (newLevel: 'off' | 'standard' | 'aggressive') => {
    setLevel(newLevel)
    if (domain && window.aura?.shields?.setLevel) {
      await window.aura.shields.setLevel(domain, newLevel)
    }
    if (window.aura?.tabs?.reloadActive) {
      window.aura.tabs.reloadActive()
    }
  }

  const handleClose = () => {
    window.close()
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'rgba(20, 22, 30, 0.92)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        borderRadius: 14,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
        padding: 18,
        boxSizing: 'border-box',
        color: '#e4e4e7',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Aura Shields</div>
            <div style={{ fontSize: 11, color: '#71717a' }}>{domain || 'Current Site'}</div>
          </div>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            fontSize: 16,
            padding: '2px 6px',
            borderRadius: 6,
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Stats Counter Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '10px 12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#8ab4ff' }}>{blockedStats.total}</div>
          <div style={{ fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On this page</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '10px 12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#c084fc' }}>{totalLifetime}</div>
          <div style={{ fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifetime on Site</div>
        </div>
      </div>

      {/* Shields Level Selector */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Protection Level
        </label>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 10 }}>
          {(['off', 'standard', 'aggressive'] as const).map((l) => (
            <button
              key={l}
              onClick={() => handleLevelChange(l)}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
                background: level === l ? (l === 'off' ? '#ef4444' : l === 'aggressive' ? '#a855f7' : '#3b82f6') : 'transparent',
                color: level === l ? '#ffffff' : '#71717a',
                transition: 'all 0.2s ease',
              }}
            >
              {l === 'off' ? 'Disabled' : l}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#a1a1aa' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Ads & Trackers</span>
          <span style={{ color: level !== 'off' ? '#4ade80' : '#f87171' }}>{level !== 'off' ? '✓ Blocked' : '✕ Allowed'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>URL Tracking Stripper</span>
          <span style={{ color: '#4ade80' }}>✓ Active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Anti-Adblock Defuser</span>
          <span style={{ color: '#4ade80' }}>✓ Active</span>
        </div>
      </div>
    </div>
  )
}
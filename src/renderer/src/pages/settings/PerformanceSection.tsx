import React, { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Select } from './SettingsControls'
import './PerformanceSection.css'

interface GPUInfo {
  vendor: string
  device: string
  driverVersion: string
  glRenderer: string
  glVendor: string
  glVersion: string
  features: Array<{ name: string; status: string }>
  hardwareAccelerationEnabled: boolean
}

interface TabMetric {
  pid: number
  title: string
  url: string
  memoryMB: number
  cpuPercent: number
  type: string
}

const THRESHOLD_OPTIONS = [
  { value: '0', label: 'Disabled' },
  { value: '1024', label: 'Over 1 GB' },
  { value: '2048', label: 'Over 2 GB' },
  { value: '4096', label: 'Over 4 GB' },
  { value: '8192', label: 'Over 8 GB' }
]

function statusBadge(status: string): { label: string; color: string } {
  if (status.startsWith('enabled')) return { label: 'Enabled', color: 'success' }
  if (status.includes('disabled_software')) return { label: 'Software', color: 'warning' }
  if (status.includes('disabled')) return { label: 'Disabled', color: 'danger' }
  if (status.includes('unavailable')) return { label: 'Unavailable', color: 'tertiary' }
  return { label: status, color: 'tertiary' }
}

export const PerformanceSection: React.FC = () => {
  const { settings } = useSettings()
  const [gpu, setGpu] = useState<GPUInfo | null>(null)
  const [metrics, setMetrics] = useState<TabMetric[]>([])
  const [discardCount, setDiscardCount] = useState<number | null>(null)

  useEffect(() => {
    window.aura.performance.getGPU().then(setGpu)
    const loadMetrics = () => {
      window.aura.performance.getTabMetrics().then(setMetrics)
    }
    loadMetrics()
    const interval = setInterval(loadMetrics, 3000)
    return () => clearInterval(interval)
  }, [])

  const set = (key: string, value: unknown): void => {
    window.aura.settings.set(key, value)
  }

  const handleDiscard = async () => {
    const count = await window.aura.performance.discardSleepingTabs()
    setDiscardCount(count)
    setTimeout(() => setDiscardCount(null), 3000)
  }

  const totalMemoryMB = metrics.reduce((sum, m) => sum + m.memoryMB, 0)

  return (
    <div className="settings-section-content">
      <h2>Performance</h2>

      <div className="setting-card">
        <h3 className="setting-card-title">ENERGY</h3>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Energy saver</span>
            <span className="setting-description">
              Reduces background activity and caps the frame rate to 30fps to save battery
            </span>
          </div>
          <Select
            label=""
            value={settings?.perfEnergySaver ?? 'off'}
            onChange={(v) => set('perfEnergySaver', v)}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'onBattery', label: 'When on battery' },
              { value: 'always', label: 'Always on' }
            ]}
          />
        </div>
      </div>

      <div className="setting-card">
        <h3 className="setting-card-title">MEMORY</h3>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Auto-discard tabs when memory exceeds</span>
            <span className="setting-description">
              When Aura's total memory passes this threshold, the oldest sleeping tabs will be unloaded entirely until you click them
            </span>
          </div>
          <Select
            label=""
            value={String(settings?.perfTabUnloadThresholdMB ?? 0)}
            onChange={(v) => set('perfTabUnloadThresholdMB', Number(v))}
            options={THRESHOLD_OPTIONS}
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Free up memory now</span>
            <span className="setting-description">
              Manually unload all sleeping tabs to recover memory immediately
            </span>
          </div>
          <button className="perf-btn" onClick={handleDiscard}>
            {discardCount !== null
              ? `\u2713 Discarded ${discardCount} tab${discardCount === 1 ? '' : 's'}`
              : 'Discard sleeping tabs'}
          </button>
        </div>

        <div className="perf-memory-summary">
          <span className="perf-memory-label">Total memory in use:</span>
          <span className="perf-memory-value">
            {totalMemoryMB > 1024
              ? `${(totalMemoryMB / 1024).toFixed(2)} GB`
              : `${totalMemoryMB} MB`}
          </span>
        </div>
      </div>

      <div className="setting-card">
        <h3 className="setting-card-title">PROCESSES</h3>
        <p className="perf-card-description">
          Live memory and CPU usage per process. Updates every 3 seconds.
        </p>

        <div className="perf-process-list">
          <div className="perf-process-header">
            <span className="perf-col-name">Process</span>
            <span className="perf-col-cpu">CPU</span>
            <span className="perf-col-mem">Memory</span>
          </div>
          {metrics.length === 0 ? (
            <div className="perf-process-empty">Loading...</div>
          ) : (
            metrics.slice(0, 20).map(m => (
              <div key={m.pid} className="perf-process-row">
                <span className="perf-col-name" title={m.url || m.title}>
                  <span className="perf-process-type">{m.type}</span>
                  <span className="perf-process-title">{m.title}</span>
                </span>
                <span className="perf-col-cpu">
                  {m.cpuPercent > 0 ? `${m.cpuPercent.toFixed(1)}%` : '\u2014'}
                </span>
                <span className="perf-col-mem">
                  {m.memoryMB > 1024
                    ? `${(m.memoryMB / 1024).toFixed(2)} GB`
                    : `${m.memoryMB} MB`}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="setting-card">
        <h3 className="setting-card-title">GRAPHICS</h3>
        {!gpu ? (
          <div className="perf-process-empty">Loading GPU info...</div>
        ) : (
          <>
            <div className="perf-info-grid">
              <div className="perf-info-row">
                <span className="perf-info-key">GPU</span>
                <span className="perf-info-value">{gpu.glRenderer || gpu.device || 'Unknown'}</span>
              </div>
              <div className="perf-info-row">
                <span className="perf-info-key">Vendor</span>
                <span className="perf-info-value">{gpu.glVendor || gpu.vendor || 'Unknown'}</span>
              </div>
              {gpu.driverVersion && (
                <div className="perf-info-row">
                  <span className="perf-info-key">Driver</span>
                  <span className="perf-info-value mono">{gpu.driverVersion}</span>
                </div>
              )}
              {gpu.glVersion && (
                <div className="perf-info-row">
                  <span className="perf-info-key">OpenGL</span>
                  <span className="perf-info-value mono">{gpu.glVersion}</span>
                </div>
              )}
            </div>

            <h4 className="perf-features-title">Acceleration features</h4>
            <div className="perf-features-grid">
              {gpu.features.map(f => {
                const badge = statusBadge(f.status)
                return (
                  <div key={f.name} className="perf-feature-row">
                    <span className="perf-feature-name">{f.name}</span>
                    <span className={`perf-feature-badge perf-badge-${badge.color}`}>{badge.label}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="perf-hint">
        Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to open the Performance HUD overlay (coming in v1.1)
      </div>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import Sparkline from './Sparkline'

interface ProcessSample {
  pid: number
  type: string
  cpu: number
  memoryMB: number
  name?: string
  url?: string
}

interface PerfSample {
  timestamp: number
  totalCpu: number
  totalMemoryMB: number
  mainCpu: number
  mainMemoryMB: number
  gpuCpu: number
  gpuMemoryMB: number
  tabCount: number
  processes: ProcessSample[]
}

declare global {
  interface Window {
    perfHud: {
      onTick: (cb: (sample: PerfSample) => void) => () => void
      close: () => void
      focusTab: (pid: number) => void
      killTab: (pid: number) => void
    }
  }
}

const HISTORY_LEN = 60

const PerfHud: React.FC = () => {
  const [sample, setSample] = useState<PerfSample | null>(null)
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [tab, setTab] = useState<'overview' | 'processes'>('overview')

  useEffect(() => {
    const off = window.perfHud.onTick((s) => {
      setSample(s)
      setCpuHistory((h) => [...h.slice(-HISTORY_LEN + 1), s.totalCpu])
    })
    return off
  }, [])

  const health = useMemo(() => {
    if (!sample) return { label: 'Loading\u2026', tone: 'neutral' as const }
    const c = sample.totalCpu
    const m = sample.totalMemoryMB
    if (c > 80 || m > 4000) return { label: 'Under load', tone: 'danger' as const }
    if (c > 40 || m > 2000) return { label: 'Active', tone: 'warn' as const }
    return { label: 'Healthy', tone: 'ok' as const }
  }, [sample])

  if (!sample) {
    return (
      <div className="hud-shell">
        <div className="hud-loading">
          <div className="hud-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="hud-shell">

      <div className="hud-drag" />

      <div className="hud-hero">
        <div className="hud-hero-left">
          <div className="hud-hero-label">CPU usage</div>
          <div className="hud-hero-value">
            {sample.totalCpu.toFixed(1)}
            <span className="hud-hero-unit">%</span>
          </div>
          <div className={`hud-hero-status tone-${health.tone}`}>
            <span className="hud-hero-status-dot" />
            {health.label}
          </div>
        </div>
        <div className="hud-hero-spark">
          <Sparkline
            data={cpuHistory}
            max={100}
            color={
              health.tone === 'danger' ? '#ff453a'
              : health.tone === 'warn' ? '#ff9f0a'
              : '#30d158'
            }
            height={60}
          />
        </div>
      </div>

      <div className="hud-tabs">
        <button
          className={`hud-tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          className={`hud-tab ${tab === 'processes' ? 'active' : ''}`}
          onClick={() => setTab('processes')}
        >
          Processes
        </button>
      </div>

      {tab === 'overview' && (
        <div className="hud-list">
          <Row
            label="Memory"
            value={`${(sample.totalMemoryMB / 1024).toFixed(2)} GB`}
            sub={`${sample.totalMemoryMB.toLocaleString()} MB total`}
          />
          <Row
            label="Open tabs"
            value={`${sample.tabCount}`}
            sub={sample.tabCount === 1 ? 'tab' : 'tabs active'}
          />
          <Row
            label="GPU"
            value={`${sample.gpuCpu.toFixed(1)}%`}
            sub={`${sample.gpuMemoryMB} MB`}
          />
          <Row
            label="Browser core"
            value={`${sample.mainCpu.toFixed(1)}%`}
            sub={`${sample.mainMemoryMB} MB`}
          />
        </div>
      )}

      {tab === 'processes' && (
        <div className="hud-proc-list">
          {sample.processes.slice(0, 10).map((p) => (
            <ProcRow key={p.pid} proc={p} />
          ))}
        </div>
      )}

      <div className="hud-footer">
        <span className="hud-footer-time">
          Updated {new Date(sample.timestamp).toLocaleTimeString([], {
            hour: 'numeric', minute: '2-digit', second: '2-digit'
          })}
        </span>
        <button
          className="hud-footer-close"
          onClick={() => window.perfHud.close()}
        >
          Done
        </button>
      </div>
    </div>
  )
}

const Row: React.FC<{ label: string; value: string; sub?: string }> = ({
  label, value, sub
}) => (
  <div className="hud-row">
    <div className="hud-row-label">{label}</div>
    <div className="hud-row-right">
      <div className="hud-row-value">{value}</div>
      {sub && <div className="hud-row-sub">{sub}</div>}
    </div>
  </div>
)

const ProcRow: React.FC<{ proc: ProcessSample }> = ({ proc }) => {
  const displayName =
    proc.name?.trim()
    || prettyType(proc.type)

  const tone =
    proc.cpu > 70 ? 'danger'
    : proc.cpu > 30 ? 'warn'
    : 'ok'

  return (
    <div className="hud-proc-row">
      <div className="hud-proc-icon">
        {proc.url
          ? <img
              src={faviconUrl(proc.url)}
              alt=""
              className="hud-proc-favicon"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          : <TypeGlyph type={proc.type} />
        }
      </div>
      <div className="hud-proc-text">
        <div className="hud-proc-name">{displayName}</div>
        <div className="hud-proc-meta">{prettyType(proc.type)} &middot; {proc.memoryMB} MB</div>
      </div>
      <div className={`hud-proc-cpu tone-${tone}`}>
        {proc.cpu.toFixed(1)}%
      </div>
    </div>
  )
}

function prettyType(type: string): string {
  const map: Record<string, string> = {
    Browser: 'Browser core',
    Tab: 'Tab',
    GPU: 'Graphics',
    Utility: 'Utility',
    Plugin: 'Plugin',
    Worker: 'Worker',
    Renderer: 'Renderer',
  }
  return map[type] || type
}

function faviconUrl(pageUrl: string): string {
  try {
    const u = new URL(pageUrl)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`
  } catch {
    return ''
  }
}

const TypeGlyph: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { glyph: string; tone: string }> = {
    Browser: { glyph: '\u25C9', tone: 'accent' },
    GPU: { glyph: '\u25C6', tone: 'warn' },
    Utility: { glyph: '\u25CB', tone: 'muted' },
    Plugin: { glyph: '\u25C7', tone: 'muted' },
    Worker: { glyph: '\u25CC', tone: 'muted' },
  }
  const item = map[type] || { glyph: '\u00B7', tone: 'muted' }
  return <span className={`hud-proc-glyph tone-${item.tone}`}>{item.glyph}</span>
}

export default PerfHud

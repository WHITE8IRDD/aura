import React, { useEffect, useState } from 'react'
import { Button, Select, Slider, Toggle } from './SettingsControls'
import type { GestureSettings } from '../../../shared/aura-features'

export const PlaybackSection: React.FC = () => {
  const [gestures, setGestures] = useState<GestureSettings | null>(null)
  const [hostsText, setHostsText] = useState('')

  useEffect(() => {
    let alive = true
    window.auraFeatures?.gestures.getSettings().then((s) => {
      if (!alive) return
      setGestures(s as GestureSettings)
      setHostsText((s as GestureSettings).disabledHosts.join('\n'))
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const patch = (p: Partial<GestureSettings>): void => {
    setGestures((prev) => (prev ? { ...prev, ...p } : prev))
    window.auraFeatures?.gestures.setSettings(p).then((next) => setGestures(next as GestureSettings)).catch(() => {})
  }

  const commitHosts = (): void => {
    const hosts = hostsText.split('\n').map((h) => h.trim().toLowerCase()).filter(Boolean)
    patch({ disabledHosts: hosts })
  }

  const reset = (): void => {
    window.auraFeatures?.gestures.resetSettings().then((next) => {
      const s = next as GestureSettings
      setGestures(s)
      setHostsText(s.disabledHosts.join('\n'))
    }).catch(() => {})
  }

  return (
    <div className="settings-section-content">
      <h2>Playback</h2>

      <div className="setting-card">
        <h3 className="setting-card-title">VIDEO GESTURES</h3>
        <div className="sett-field-desc" style={{ marginBottom: 8 }}>
          Double-tap video edges to seek, scroll over video for volume, Shift+scroll for speed.
          YouTube uses Aura&apos;s built-in fast-playback engine and is not affected by these gestures.
        </div>
        <Toggle
          label="Enable video gestures"
          checked={gestures?.enabled ?? true}
          onChange={(v) => patch({ enabled: v })}
        />
        <Slider
          label="Double-tap seek"
          value={gestures?.doubleTapSeekSeconds ?? 10}
          min={1} max={60} step={1} unit="s"
          onChange={(v) => patch({ doubleTapSeekSeconds: v })}
        />
        <Slider
          label="Center dead zone"
          description="Middle fraction of the video where double-tap passes through to the page"
          value={Math.round((gestures?.centerDeadZone ?? 0.3) * 100)}
          min={0} max={80} step={5} unit="%"
          onChange={(v) => patch({ centerDeadZone: v / 100 })}
        />
        <Slider
          label="Intro skip target"
          description="Timestamp the “Skip intro” shortcut seeks to on long videos"
          value={gestures?.skipIntroSeconds ?? 85}
          min={5} max={600} step={5} unit="s"
          onChange={(v) => patch({ skipIntroSeconds: v })}
        />
        <Slider
          label="Volume step"
          value={Math.round((gestures?.volumeStep ?? 0.05) * 100)}
          min={1} max={50} step={1} unit="%"
          onChange={(v) => patch({ volumeStep: v / 100 })}
        />
        <Slider
          label="Speed step (Shift+scroll)"
          value={gestures?.speedStep ?? 0.25}
          min={0.05} max={1} step={0.05} unit="×"
          onChange={(v) => patch({ speedStep: v })}
        />
        <div className="sett-field">
          <div className="sett-field-label">Disabled hosts (one per line)</div>
          <textarea
            rows={4} value={hostsText}
            onChange={(e) => setHostsText(e.target.value)}
            onBlur={commitHosts}
            spellCheck={false}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <Select
          label="Speed limits"
          description="Playback rate stays within this range"
          value={`${gestures?.minSpeed ?? 0.25}-${gestures?.maxSpeed ?? 4}`}
          onChange={(v) => {
            const [lo, hi] = v.split('-').map(Number)
            patch({ minSpeed: lo, maxSpeed: hi })
          }}
          options={[
            { value: '0.25-4', label: '0.25× – 4× (default)' },
            { value: '0.5-2', label: '0.5× – 2× (narrow)' },
            { value: '1-4', label: '1× – 4× (no slow-mo)' },
          ]}
        />
        <Button label="Reset to defaults" onClick={reset} />
      </div>
    </div>
  )
}

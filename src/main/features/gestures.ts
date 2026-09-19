import { DEFAULT_GESTURE_SETTINGS, type GestureSettings } from '../../shared/aura-features'
import { kvGet, kvSet } from './kv'

const KEY = 'features:gesture-settings'

function num(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(hi, Math.max(lo, n))
}

function validate(raw: Partial<GestureSettings>): GestureSettings {
  const d = DEFAULT_GESTURE_SETTINGS
  const minSpeed = num(raw.minSpeed, 0.1, 4, d.minSpeed)
  const maxSpeed = Math.max(minSpeed, num(raw.maxSpeed, 0.1, 4, d.maxSpeed))
  return {
    enabled: raw.enabled ?? d.enabled,
    doubleTapSeekSeconds: Math.round(num(raw.doubleTapSeekSeconds, 1, 60, d.doubleTapSeekSeconds)),
    centerDeadZone: num(raw.centerDeadZone, 0, 0.8, d.centerDeadZone),
    skipIntroSeconds: Math.round(num(raw.skipIntroSeconds, 5, 600, d.skipIntroSeconds)),
    volumeStep: num(raw.volumeStep, 0.01, 0.5, d.volumeStep),
    speedStep: num(raw.speedStep, 0.05, 1, d.speedStep),
    minSpeed,
    maxSpeed,
    disabledHosts: Array.isArray(raw.disabledHosts)
      ? raw.disabledHosts.filter((h): h is string => typeof h === 'string').map((h) => h.trim().toLowerCase()).filter(Boolean)
      : [...d.disabledHosts],
  }
}

export function getGestureSettings(): GestureSettings {
  return validate(kvGet<Partial<GestureSettings>>(KEY, {}))
}

export function setGestureSettings(patch: Partial<GestureSettings>): GestureSettings {
  const next = validate({ ...getGestureSettings(), ...patch })
  kvSet(KEY, next)
  return next
}

export function resetGestureSettings(): GestureSettings {
  const next: GestureSettings = {
    ...DEFAULT_GESTURE_SETTINGS,
    disabledHosts: [...DEFAULT_GESTURE_SETTINGS.disabledHosts],
  }
  kvSet(KEY, next)
  return next
}

import { getDb } from '../db'
import { DARK_PRESETS, type DarkModeState, type DarkPreset, type DarkSiteRule } from '../../shared/aura-features'
import { ensureFeaturesTables, kvGet, kvSet } from './kv'

const GLOBAL_KEY = 'features:dark-global'

function cleanHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '').replace(/^www\./, '')
}

export function getGlobalPreset(): DarkPreset | null {
  const v = kvGet<unknown>(GLOBAL_KEY, null)
  return typeof v === 'string' && (DARK_PRESETS as string[]).includes(v) ? (v as DarkPreset) : null
}

export function setGlobalPreset(preset: DarkPreset | null): void {
  if (preset !== null && !(DARK_PRESETS as string[]).includes(preset)) {
    throw new Error('invalid dark preset')
  }
  kvSet(GLOBAL_KEY, preset)
}

export function getSiteRule(host: string): DarkSiteRule | null {
  const clean = cleanHost(host)
  if (!clean) return null
  try {
    ensureFeaturesTables()
    const row = getDb().prepare('SELECT mode FROM dark_sites WHERE host = ?').get(clean) as { mode: string } | undefined
    if (!row) return null
    if (row.mode === 'off') return 'off'
    if ((DARK_PRESETS as string[]).includes(row.mode)) return row.mode as DarkPreset
    return null
  } catch {
    return null
  }
}

export function setSiteRule(host: string, rule: DarkSiteRule | null): void {
  const clean = cleanHost(host)
  if (!clean) return
  if (rule !== null && rule !== 'off' && !(DARK_PRESETS as string[]).includes(rule)) {
    throw new Error('invalid dark rule')
  }
  ensureFeaturesTables()
  const db = getDb()
  if (rule === null) {
    db.prepare('DELETE FROM dark_sites WHERE host = ?').run(clean)
  } else {
    db.prepare('INSERT INTO dark_sites (host, mode) VALUES (?, ?) ON CONFLICT(host) DO UPDATE SET mode = excluded.mode')
      .run(clean, rule)
  }
}

export interface DarkResolved {
  state: DarkModeState
  rule: DarkSiteRule | null
  globalPreset: DarkPreset | null
}

/** Effective dark-mode state for a host: per-site rule wins, else global. */
export function resolveDark(host: string): DarkResolved {
  const globalPreset = getGlobalPreset()
  const rule = getSiteRule(host)
  if (rule === 'off') return { state: { preset: null, forced: true }, rule, globalPreset }
  if (rule !== null) return { state: { preset: rule, forced: true }, rule, globalPreset }
  if (globalPreset) return { state: { preset: globalPreset, forced: false }, rule, globalPreset }
  return { state: { preset: null, forced: false }, rule, globalPreset }
}

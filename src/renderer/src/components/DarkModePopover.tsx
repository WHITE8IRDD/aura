import { useCallback, useEffect, useState } from 'react'
import type { DarkPreset, DarkSiteRule } from '../../../shared/aura-features'

interface DarkGet {
  state: { preset: DarkPreset | null; forced: boolean }
  rule: DarkSiteRule | null
  globalPreset: DarkPreset | null
}

function hostnameFromHash(): string {
  try {
    const hash = window.location.hash || ''
    const q = hash.split('?')[1] ?? ''
    return new URLSearchParams(q).get('hostname') ?? ''
  } catch {
    return ''
  }
}

const OPTIONS: Array<{ id: DarkSiteRule | 'default'; label: string; desc: string }> = [
  { id: 'default', label: 'Follow default', desc: 'Use the global dark-mode setting for this site.' },
  { id: 'off', label: 'Off', desc: 'Never force dark mode on this site.' },
  { id: 'oled', label: 'OLED', desc: 'True-black inversion, best on OLED screens.' },
  { id: 'charcoal', label: 'Charcoal', desc: 'Softer dark grays, easier on the eyes.' },
  { id: 'amber', label: 'Amber', desc: 'Warm low-blue-light nighttime tone.' },
]

export default function DarkModePopover(): JSX.Element {
  const [host] = useState(hostnameFromHash)
  const [rule, setRule] = useState<DarkSiteRule | 'default'>('default')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden;user-select:none;'
  }, [])

  useEffect(() => {
    let alive = true
    if (!host) return
    window.auraFeatures?.darkMode.get(host).then((res) => {
      if (!alive) return
      const r = (res as DarkGet).rule
      setRule(r === null ? 'default' : r)
    }).catch((err) => console.error('[Aura/DarkMode] get failed:', err))
    return () => { alive = false }
  }, [host])

  const choose = useCallback(async (value: DarkSiteRule | 'default') => {
    if (!host || busy) return
    const prev = rule
    setRule(value) // instant visual feedback; rolled back if the save fails
    setBusy(true)
    try {
      await window.auraFeatures?.darkMode.setSite(host, value === 'default' ? null : value)
      window.close()
    } catch (err) {
      console.error('[Aura/DarkMode] setSite failed:', err)
      setRule(prev)
      setBusy(false)
    }
  }, [host, busy, rule])

  return (
    <div className="dm-shell">
      <style>{CSS}</style>
      <div className="dm-head">
        <div className="dm-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        </div>
        <div className="dm-title">
          <div className="dm-domain">{host || '—'}</div>
          <div className="dm-status">Dark mode for this site</div>
        </div>
      </div>
      <div className="dm-list" role="radiogroup" aria-label="Dark mode for this site">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={rule === o.id}
            className={rule === o.id ? 'on' : ''}
            onClick={() => void choose(o.id)}
            title={o.desc}
          >
            <span className="dm-dot" data-opt={o.id} />
            <span className="dm-opt-text">
              <span className="dm-opt-label">{o.label}</span>
              <span className="dm-opt-desc">{o.desc}</span>
            </span>
            {rule === o.id && <span className="dm-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

const CSS = `
.dm-shell{box-sizing:border-box;width:100vw;height:100vh;padding:16px;border-radius:20px;color:var(--text-primary,#eef0f7);font:13px/1.4 "Segoe UI Variable","Segoe UI",system-ui,sans-serif;
  background:linear-gradient(155deg,color-mix(in srgb,var(--bg-tertiary,#262a40) 94%,transparent),color-mix(in srgb,var(--bg-primary,#111320) 96%,transparent));border:1px solid var(--border-default,rgba(255,255,255,.11));
  box-shadow:var(--shadow-popover,inset 0 1px 0 rgba(255,255,255,.08));display:flex;flex-direction:column;gap:12px;overflow:hidden}
.dm-head{display:flex;align-items:center;gap:10px}
.dm-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft,rgba(255,255,255,.06));color:var(--accent,#a5b4fc)}
.dm-title{min-width:0}
.dm-domain{font-size:14px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}
.dm-status{font-size:11px;color:var(--text-tertiary,rgba(238,240,247,.55))}
.dm-list{display:flex;flex-direction:column;gap:6px;overflow-y:auto}
.dm-list button{display:flex;align-items:center;gap:10px;border:1px solid transparent;background:var(--hover-bg,rgba(255,255,255,.05));color:var(--text-primary,#eef0f7);font:inherit;text-align:left;padding:9px 10px;border-radius:12px;cursor:pointer;transition:background .15s,border-color .15s}
.dm-list button:hover{background:var(--active-bg,rgba(255,255,255,.1))}
.dm-list button.on{border-color:var(--accent,#6366f1);background:var(--accent-soft,rgba(99,102,241,.14))}
.dm-dot{width:14px;height:14px;border-radius:50%;flex:none;border:1px solid var(--border-default,rgba(255,255,255,.2))}
.dm-dot[data-opt="off"]{background:transparent}
.dm-dot[data-opt="default"]{background:linear-gradient(135deg,var(--text-tertiary,#8b90a3) 50%,transparent 50%)}
.dm-dot[data-opt="oled"]{background:#000}
.dm-dot[data-opt="charcoal"]{background:#2a2a30}
.dm-dot[data-opt="amber"]{background:#b45309}
.dm-opt-text{display:flex;flex-direction:column;min-width:0;flex:1}
.dm-opt-label{font-size:12.5px;font-weight:650}
.dm-opt-desc{font-size:11px;color:var(--text-secondary,rgba(238,240,247,.65));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dm-check{color:var(--accent,#a5b4fc);font-weight:700}
`

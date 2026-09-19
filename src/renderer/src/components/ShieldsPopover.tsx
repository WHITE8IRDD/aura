import { useCallback, useEffect, useRef, useState } from 'react'

type Level = 'off' | 'standard' | 'aggressive'
interface ShieldsState { domain: string; level: Level | 'custom'; pageCount: number; lifetimeCount: number }
interface Target { tabId: string | number | null; domain: string }

const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: 'off', label: 'Disabled', desc: 'Shields are off for this site. Ads, trackers and popups can load.' },
  { id: 'standard', label: 'Standard', desc: 'Blocks ads, trackers, popups and tracking links. Recommended for most sites.' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Strict popup control, plus removes floating widgets, banners and survey overlays. May affect some sites.' },
]

function useCountUp(value: number): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / 350)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(begin + (value - begin) * eased)
      setShown(v)
      from.current = v
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return shown
}

const fmt = (n: number): string => n.toLocaleString('en-US')

export default function ShieldsPopover(): JSX.Element {
  const [target, setTarget] = useState<Target | null>(null)
  const [state, setState] = useState<ShieldsState | null>(null)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden;user-select:none;'
  }, [])

  useEffect(() => {
    const offTarget = window.aura.shields.onTarget((t) => { setState(null); setTarget(t); setVisible(true) })
    const offHide = window.aura.shields.onHide(() => setVisible(false))
    return () => { offTarget(); offHide() }
  }, [])

  useEffect(() => {
    if (!visible || !target) return
    let alive = true
    const tick = async (): Promise<void> => {
      try {
        const s = await window.aura.shields.getState(target.tabId)
        if (alive && s) setState(s)
      } catch { /* tab closed */ }
    }
    void tick()
    const id = window.setInterval(tick, 500)
    return () => { alive = false; window.clearInterval(id) }
  }, [visible, target])

  const choose = useCallback(async (level: Level) => {
    if (!target || busy || state?.level === level) return
    setBusy(true)
    setState((prev) => (prev ? { ...prev, level } : prev))
    try {
      const next = await window.aura.shields.setLevel(target.tabId, level)
      if (next) setState(next)
    } finally {
      setBusy(false)
    }
  }, [target, busy, state?.level])

  const level = state?.level ?? 'standard'
  const idx = Math.max(0, LEVELS.findIndex((l) => l.id === level))
  const active = LEVELS[idx]
  const page = useCountUp(state?.pageCount ?? 0)
  const life = useCountUp(state?.lifetimeCount ?? 0)
  const tone = level === 'off'
    ? 'var(--text-tertiary, #8b90a3)'
    : level === 'aggressive'
      ? 'var(--warning, #ffb454)'
      : 'var(--success, #3ddc97)'

  return (
    <div className="sp-shell" data-visible={visible}>
      <style>{CSS}</style>

      <div className="sp-head">
        <div className="sp-icon" style={{ color: tone, boxShadow: `0 0 0 1px color-mix(in srgb, ${tone} 32%, transparent), 0 0 24px color-mix(in srgb, ${tone} 28%, transparent)` }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
            {level !== 'off' && <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />}
          </svg>
        </div>
        <div className="sp-title">
          <div className="sp-domain">{state?.domain || target?.domain || '\u2014'}</div>
          <div className="sp-status" style={{ color: tone }}>{level === 'off' ? 'Shields are down' : 'Shields are up'}</div>
        </div>
      </div>

      <div className="sp-stats">
        <div className="sp-tile sp-tile-main">
          <div className="sp-label">ON THIS PAGE</div>
          <div className="sp-big">{fmt(page)}</div>
        </div>
        <div className="sp-tile">
          <div className="sp-label">LIFETIME ON SITE</div>
          <div className="sp-mid">{fmt(life)}</div>
        </div>
      </div>

      <div className="sp-seg" role="radiogroup" aria-label="Shields level">
        <div className="sp-pill" style={{ transform: `translateX(${idx * 100}%)`, background: tone }} />
        {LEVELS.map((l) => (
          <button key={l.id} role="radio" aria-checked={l.id === level} className={l.id === level ? 'on' : ''} onClick={() => void choose(l.id)}>
            {l.label}
          </button>
        ))}
      </div>

      <p className="sp-desc">{active.desc}</p>
      <div className="sp-foot">Changing the level reloads this page.</div>
    </div>
  )
}

const CSS = `
.sp-shell{box-sizing:border-box;width:100vw;height:100vh;padding:18px;border-radius:20px;color:var(--text-primary,#eef0f7);font:13px/1.4 "Segoe UI Variable","Segoe UI",system-ui,sans-serif;
  background:linear-gradient(155deg,color-mix(in srgb,var(--bg-tertiary,#262a40) 94%,transparent),color-mix(in srgb,var(--bg-primary,#111320) 96%,transparent));border:1px solid var(--border-default,rgba(255,255,255,.11));
  box-shadow:var(--shadow-popover,inset 0 1px 0 rgba(255,255,255,.08));display:flex;flex-direction:column;gap:14px;
  opacity:0;transform:translateY(-6px) scale(.98);transition:opacity .14s ease,transform .14s ease}
.sp-shell[data-visible="true"]{opacity:1;transform:none}
.sp-head{display:flex;align-items:center;gap:12px}
.sp-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--accent-soft,rgba(255,255,255,.06));transition:color .2s,box-shadow .2s}
.sp-title{min-width:0}
.sp-domain{font-size:15px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}
.sp-status{font-size:12px;font-weight:600;transition:color .2s}
.sp-stats{display:grid;grid-template-columns:1fr;gap:10px}
.sp-tile{background:var(--hover-bg,rgba(255,255,255,.055));border:1px solid var(--border-subtle,rgba(255,255,255,.07));border-radius:14px;padding:12px 14px}
.sp-label{font-size:10.5px;letter-spacing:.09em;font-weight:700;color:var(--text-tertiary,rgba(238,240,247,.55))}
.sp-big{font-size:44px;line-height:1.05;font-weight:750;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.sp-mid{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px}
.sp-seg{position:relative;display:grid;grid-template-columns:repeat(3,1fr);padding:3px;border-radius:12px;background:color-mix(in srgb,var(--text-primary,#ffffff) 8%,transparent)}
.sp-pill{position:absolute;top:3px;bottom:3px;left:3px;width:calc((100% - 6px)/3);border-radius:9px;opacity:.9;transition:transform .22s cubic-bezier(.3,.9,.3,1),background .2s}
.sp-seg button{position:relative;z-index:1;border:0;background:transparent;color:var(--text-secondary,rgba(238,240,247,.75));font:600 12px inherit;padding:8px 0;cursor:pointer;border-radius:9px;transition:color .15s}
.sp-seg button.on{color:#0c0e18}
.sp-seg button:not(.on):hover{color:var(--text-primary,#fff)}
.sp-desc{margin:0;color:var(--text-secondary,rgba(238,240,247,.72));font-size:12px;min-height:50px}
.sp-foot{margin-top:auto;font-size:11px;color:var(--text-tertiary,rgba(238,240,247,.42))}
`

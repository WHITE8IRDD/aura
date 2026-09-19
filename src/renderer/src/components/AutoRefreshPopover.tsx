import { useCallback, useEffect, useState } from 'react'
import type { AutoRefreshState } from '../../../shared/aura-features'

function tabIdFromHash(): number | null {
  try {
    const hash = window.location.hash || ''
    const q = hash.split('?')[1] ?? ''
    const raw = new URLSearchParams(q).get('tabId')
    const id = raw === null ? NaN : Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

const INTERVALS = [5, 15, 30, 60, 300]
const REPEATS: Array<{ value: number | null; label: string }> = [
  { value: null, label: '∞' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
]

function fmtSecs(s: number): string {
  return s >= 60 ? `${Math.round((s / 60) * 10) / 10}m` : `${s}s`
}

function subtitle(state: AutoRefreshState | null): string {
  if (!state) return 'Stopped'
  const every = `every ${fmtSecs(state.intervalSec)}`
  if (state.maxRefreshes === null || state.remaining === null) return `Reloading ${every}`
  return `Every ${fmtSecs(state.intervalSec)} · ${state.remaining} of ${state.maxRefreshes} left`
}

export default function AutoRefreshPopover(): JSX.Element {
  const [tabId] = useState(tabIdFromHash)
  const [state, setState] = useState<AutoRefreshState | null>(null)
  const [pendingRepeat, setPendingRepeat] = useState<number | null>(null)
  const [customSecs, setCustomSecs] = useState('')
  const [customTimes, setCustomTimes] = useState('')
  const [busy, setBusy] = useState(false)
  const [errText, setErrText] = useState('')
  const [bridgeOk] = useState(() => !!window.aura?.autoRefresh)

  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden;user-select:none;'
  }, [])

  const refresh = useCallback(() => {
    if (tabId === null) return
    window.aura?.autoRefresh
      .get(tabId)
      .then((s) => {
        setState(s && typeof s.intervalSec === 'number' ? s : null)
      })
      .catch((err) => {
        console.error('[Aura/AutoRefresh] get failed:', err)
        setErrText(`Could not load: ${err instanceof Error ? err.message : String(err)}`)
      })
  }, [tabId])

  useEffect(() => {
    refresh()
    const unsub = window.aura?.autoRefresh.onChange(() => refresh())
    return () => {
      unsub?.()
    }
  }, [refresh])

  // Seed the pending repeat choice from the running timer (if any).
  useEffect(() => {
    setPendingRepeat(state?.maxRefreshes ?? null)
  }, [state?.maxRefreshes])

  const run = useCallback(
    async (seconds: number | null, max: number | null) => {
      if (tabId === null || busy) return
      setErrText('')
      setBusy(true)
      try {
        const p =
          seconds === null
            ? window.aura?.autoRefresh.stop(tabId)
            : window.aura?.autoRefresh.start(tabId, seconds, max)
        await Promise.race([
          p,
          new Promise((_, reject) =>
            window.setTimeout(() => reject(new Error('save timed out')), 5000)
          ),
        ])
        window.close()
      } catch (err) {
        console.error('[Aura/AutoRefresh] apply failed:', err)
        setErrText(
          `Could not save (${err instanceof Error ? err.message : String(err)}). Restart Aura and try again.`
        )
        setBusy(false)
      }
    },
    [tabId, busy]
  )

  const applyCustomSecs = useCallback(() => {
    const n = Number(customSecs.trim())
    if (!Number.isFinite(n) || n < 5 || n > 86400) {
      setErrText('Enter 5 – 86400 seconds.')
      return
    }
    void run(Math.round(n), pendingRepeat)
  }, [customSecs, pendingRepeat, run])

  const chooseRepeat = useCallback(
    (max: number | null) => {
      setPendingRepeat(max)
      // A running timer picks the new limit up immediately (countdown
      // restarts at N); otherwise it becomes pending for the next start.
      if (state) void run(state.intervalSec, max)
    },
    [state, run]
  )

  const applyCustomTimes = useCallback(() => {
    const n = Number(customTimes.trim())
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      setErrText('Enter 1 – 999 times.')
      return
    }
    setPendingRepeat(n)
    if (state) void run(state.intervalSec, n)
    else setErrText('')
  }, [customTimes, state, run])

  const activeInterval = state?.intervalSec ?? null
  const activeRepeat = state ? (state.maxRefreshes ?? null) : pendingRepeat

  return (
    <div className="ar-shell">
      <style>{CSS}</style>
      <div className="ar-head">
        <div className="ar-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 1 0 2.13-5.87L21 8" />
          </svg>
        </div>
        <div className="ar-title">
          <div className="ar-domain">Auto-refresh</div>
          <div className="ar-status">{subtitle(state)}</div>
        </div>
      </div>

      <div className="ar-body">
        <div className="ar-label">Interval</div>
        <div className="ar-chips" role="radiogroup" aria-label="Refresh interval">
          {INTERVALS.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={activeInterval === s}
              className={activeInterval === s ? 'on' : ''}
              onClick={() => void run(s, pendingRepeat)}
              title={`Reload every ${fmtSecs(s)}`}
            >
              {fmtSecs(s)}
            </button>
          ))}
        </div>
        <div className="ar-custom">
          <input
            type="number"
            min={5}
            max={86400}
            value={customSecs}
            onChange={(e) => setCustomSecs(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCustomSecs()
            }}
            placeholder="Custom seconds"
            aria-label="Custom interval in seconds"
          />
          <button onClick={applyCustomSecs}>Apply</button>
        </div>

        <div className="ar-label">Stop after</div>
        <div className="ar-chips" role="radiogroup" aria-label="Repeat limit">
          <button
            role="radio"
            aria-checked={activeRepeat === null}
            className={activeRepeat === null ? 'on' : ''}
            onClick={() => chooseRepeat(null)}
            title="Run forever until stopped"
          >
            Unlimited
          </button>
          {REPEATS.filter((r) => r.value !== null).map((r) => (
            <button
              key={String(r.value)}
              role="radio"
              aria-checked={activeRepeat === r.value}
              className={activeRepeat === r.value ? 'on' : ''}
              onClick={() => chooseRepeat(r.value)}
              title={`Stop after ${r.value} refreshes`}
            >
              {r.label}×
            </button>
          ))}
        </div>
        <div className="ar-custom">
          <input
            type="number"
            min={1}
            max={999}
            value={customTimes}
            onChange={(e) => setCustomTimes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCustomTimes()
            }}
            placeholder="Custom times"
            aria-label="Custom repeat limit"
          />
          <button onClick={applyCustomTimes}>Set</button>
        </div>

        <button className="ar-stop" onClick={() => void run(null, null)}>
          Stop refreshing
        </button>
      </div>

      {(!bridgeOk || errText || tabId === null) && (
        <p className="ar-err">
          {!bridgeOk || tabId === null ? 'Controls unavailable — restart Aura.' : errText}
        </p>
      )}
    </div>
  )
}

const CSS = `
.ar-shell{box-sizing:border-box;width:100vw;height:100vh;padding:14px;border-radius:20px;color:var(--text-primary,#eef0f7);font:13px/1.4 "Segoe UI Variable","Segoe UI",system-ui,sans-serif;
  background:linear-gradient(155deg,color-mix(in srgb,var(--bg-tertiary,#262a40) 94%,transparent),color-mix(in srgb,var(--bg-primary,#111320) 96%,transparent));border:1px solid var(--border-default,rgba(255,255,255,.11));
  box-shadow:var(--shadow-popover,inset 0 1px 0 rgba(255,255,255,.08));display:flex;flex-direction:column;gap:8px;overflow:hidden}
.ar-head{display:flex;align-items:center;gap:10px;flex:none}
.ar-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft,rgba(255,255,255,.06));color:var(--accent,#a5b4fc);flex:none}
.ar-title{min-width:0}
.ar-domain{font-size:13.5px;font-weight:650}
.ar-status{font-size:11px;color:var(--text-tertiary,rgba(238,240,247,.55))}
.ar-body{display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:0}
.ar-label{font-size:10.5px;font-weight:650;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary,rgba(238,240,247,.5));margin-top:2px}
.ar-chips{display:flex;flex-wrap:wrap;gap:5px}
.ar-chips button{border:1px solid transparent;background:var(--hover-bg,rgba(255,255,255,.05));color:var(--text-primary,#eef0f7);font:inherit;font-size:12px;font-weight:600;padding:5px 10px;border-radius:8px;cursor:pointer;transition:background .15s,border-color .15s}
.ar-chips button:hover{background:var(--active-bg,rgba(255,255,255,.1))}
.ar-chips button.on{border-color:var(--accent,#6366f1);background:var(--accent-soft,rgba(99,102,241,.14))}
.ar-custom{display:flex;gap:6px}
.ar-custom input{flex:1;min-width:0;background:var(--hover-bg,rgba(255,255,255,.05));border:1px solid var(--border-default,rgba(255,255,255,.11));border-radius:8px;color:var(--text-primary,#eef0f7);font:inherit;font-size:12px;padding:6px 9px;outline:none}
.ar-custom input:focus{border-color:var(--accent,#6366f1)}
.ar-custom button{border:1px solid transparent;background:var(--accent-soft,rgba(99,102,241,.14));color:var(--text-primary,#eef0f7);font:inherit;font-size:12px;font-weight:600;padding:6px 11px;border-radius:8px;cursor:pointer;flex:none}
.ar-custom button:hover{background:var(--accent-soft,rgba(99,102,241,.25))}
.ar-stop{margin-top:2px;border:1px solid var(--border-default,rgba(255,255,255,.11));background:transparent;color:var(--text-secondary,rgba(238,240,247,.65));font:inherit;font-size:12px;padding:6px;border-radius:8px;cursor:pointer}
.ar-stop:hover{background:var(--hover-bg,rgba(255,255,255,.05));color:var(--text-primary,#eef0f7)}
.ar-err{margin:0;font-size:11px;color:var(--danger,#f87171);flex:none}
`

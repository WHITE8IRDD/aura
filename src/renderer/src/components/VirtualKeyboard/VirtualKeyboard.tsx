import React, { useState, useCallback, useRef } from 'react'
import { KeysPanel } from './KeysPanel'
import { SymbolsPanel } from './SymbolsPanel'

type Mode = 'keys' | 'symbols'

export default function VirtualKeyboard() {
  const [mode, setMode] = useState<Mode>('keys')
  const [pinned, setPinned] = useState(true)
  const [copiedFlash, setCopiedFlash] = useState<string | null>(null)
  const flashTimer = useRef<NodeJS.Timeout | null>(null)

  const flash = useCallback((label: string) => {
    setCopiedFlash(label)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setCopiedFlash(null), 900)
  }, [])

  const handleTogglePin = useCallback(async () => {
    const p = !pinned
    await window.aura.keyboard.setAlwaysOnTop(p)
    setPinned(p)
  }, [pinned])

  return (
    <div className="ak-root">
      <div className="ak-titlebar">
        <div className="ak-drag-handle">
          <span className="ak-dot" /><span className="ak-dot" /><span className="ak-dot" />
        </div>
        <div className="ak-segmented">
          <button className={mode === 'keys' ? 'ak-seg-active' : ''} onClick={() => setMode('keys')}>Keys</button>
          <button className={mode === 'symbols' ? 'ak-seg-active' : ''} onClick={() => setMode('symbols')}>Symbols</button>
        </div>
        <div className="ak-titlebar-right">
          {copiedFlash && <span className="ak-flash">{copiedFlash}</span>}
          <button
            className={`ak-icon-btn${pinned ? ' ak-icon-active' : ''}`}
            onClick={handleTogglePin}
            title="Keep on top"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          </button>
          <button className="ak-icon-btn ak-icon-close" onClick={() => window.aura.keyboard.close()} title="Close (Ctrl+Alt+K)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {mode === 'keys'
        ? <KeysPanel onKeyTyped={flash} />
        : <SymbolsPanel onCharUsed={flash} />}
    </div>
  )
}

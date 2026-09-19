import React, { useState } from 'react';
import { KeysPanel } from './KeysPanel';
import { SymbolsPanel } from './SymbolsPanel';

export const VirtualKeyboard: React.FC = () => {
  const [mode, setMode] = useState<'keys' | 'symbols'>('keys');
  const [pinned, setPinned] = useState(true);
  const [flashKey, setFlashKey] = useState<string | null>(null);

  const handlePinToggle = () => {
    const next = !pinned;
    setPinned(next);
    window.aura.keyboard.setAlwaysOnTop(next);
  };

  const triggerFlash = (label: string) => {
    setFlashKey(label);
    setTimeout(() => setFlashKey(null), 800);
  };

  return (
    <div className="ak-root">
      {/* Titlebar */}
      <div className="ak-titlebar">
        <div className="ak-drag-handle">
          <span className="ak-title-icon">⌨️</span>
          <span className="ak-title-text">Aura Keys</span>
        </div>

        {/* Mode Switcher */}
        <div className="ak-segmented">
          <button
            className={`ak-segment ${mode === 'keys' ? 'active' : ''}`}
            onClick={() => setMode('keys')}
          >
            Keys
          </button>
          <button
            className={`ak-segment ${mode === 'symbols' ? 'active' : ''}`}
            onClick={() => setMode('symbols')}
          >
            Symbols
          </button>
        </div>

        {/* Action Flash Message */}
        {flashKey && <div className="ak-flash">Typed "{flashKey}"</div>}

        {/* Window Controls */}
        <div className="ak-window-actions">
          <button
            className={`ak-action-btn ${pinned ? 'pinned' : ''}`}
            onClick={handlePinToggle}
            title={pinned ? 'Unpin Always On Top' : 'Pin Always On Top'}
          >
            📌
          </button>
          <button
            className="ak-action-btn close"
            onClick={() => window.aura.keyboard.close()}
            title="Close Aura Keys"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="ak-content">
        {mode === 'keys' ? (
          <KeysPanel onTyped={triggerFlash} />
        ) : (
          <SymbolsPanel onInserted={(char) => triggerFlash(char)} />
        )}
      </div>
    </div>
  );
};

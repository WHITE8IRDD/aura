import React, { useEffect, useState } from 'react'
import { IconMinimize, IconMaximize, IconRestore, IconClose } from './Icons'

export default function WindowControls(): React.ReactElement | null {
  const [maximized, setMaximized] = useState(false)
  const [platform, setPlatform] = useState<string>('')

  useEffect(() => {
    window.aura.platform().then(setPlatform)
    window.aura.window.isMaximized().then(setMaximized)
    return window.aura.window.onMaximizedChange(setMaximized)
  }, [])

  if (platform === 'darwin' || !platform) return null

  // Use onMouseDown then immediately blur so focus ring never sticks.
  const click = (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur()
    fn()
  }

  return (
    <div className="window-controls">
      <button
        className="wc-btn"
        onClick={click(() => window.aura.window.minimize())}
        title="Minimize"
        aria-label="Minimize"
        tabIndex={-1}
      >
        <IconMinimize size={12} />
      </button>
      <button
        className="wc-btn"
        onClick={click(() => window.aura.window.maximize())}
        title={maximized ? 'Restore' : 'Maximize'}
        aria-label={maximized ? 'Restore' : 'Maximize'}
        tabIndex={-1}
      >
        {maximized ? <IconRestore size={11} /> : <IconMaximize size={10} />}
      </button>
      <button
        className="wc-btn wc-close"
        onClick={click(() => window.aura.window.close())}
        title="Close"
        aria-label="Close"
        tabIndex={-1}
      >
        <IconClose size={12} />
      </button>
    </div>
  )
}

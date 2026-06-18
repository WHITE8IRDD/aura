import React from 'react'

interface Props {
  onNavigate?: (url: string) => void
}

export default function NinjaNewTab({ onNavigate }: Props): React.ReactElement {
  return (
    <div className="ninja-newtab">
      <div className="ninja-newtab-mask">🥷</div>
      <h1 className="ninja-newtab-title">You&apos;re in Ninja Mode</h1>
      <p className="ninja-newtab-desc">
        Pages you view in this window won&apos;t appear in your browser history
        or search history, and they won&apos;t leave other traces like cookies
        on your device after you close the window.
      </p>
      <ul className="ninja-newtab-checks">
        <li><span>✓</span> No history recorded</li>
        <li><span>✓</span> No cookies saved after close</li>
        <li><span>✓</span> Isolated session</li>
      </ul>
    </div>
  )
}

import React from 'react'
import NinjaAvatar from '../components/NinjaAvatar'

interface Props {
  onNavigate?: (url: string) => void
}

export default function NinjaNewTab(_props: Props): React.ReactElement {
  return (
    <div className="ninja-newtab">
      <div className="ninja-newtab-avatar">
        <NinjaAvatar size={88} />
      </div>

      <h1 className="ninja-newtab-title">You&apos;re in Ninja Mode</h1>

      <p className="ninja-newtab-desc">
        Pages you view in this window won&apos;t appear in your browser history or
        search history, and they won&apos;t leave other traces like cookies on your
        device after you close the window.
      </p>

      <ul className="ninja-newtab-checks">
        <li>No history recorded</li>
        <li>No cookies saved after close</li>
        <li>Isolated session</li>
      </ul>
    </div>
  )
}

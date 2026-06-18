import React from 'react'
import { IconAlert } from './Icons'

interface Props {
  url: string
  onProceed: () => void
  onGoBack: () => void
}

export default function SecurityInterstitial({
  url,
  onProceed,
  onGoBack
}: Props): React.ReactElement {
  const host = (() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()

  return (
    <div className="interstitial">
      <div className="interstitial-card">
        <div className="interstitial-icon"><IconAlert size={40} /></div>
        <h1 className="interstitial-title">Your connection is not secure</h1>
        <p className="interstitial-text">
          The site <strong>{host}</strong> does not support HTTPS. Information you send or receive
          here could be intercepted. Aura defaults to HTTPS-Only mode for your safety.
        </p>
        <div className="interstitial-actions">
          <button className="interstitial-back" onClick={onGoBack}>Go back to safety</button>
          <button className="interstitial-proceed" onClick={onProceed}>
            Proceed insecurely (this session)
          </button>
        </div>
      </div>
    </div>
  )
}

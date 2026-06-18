import React, { useEffect, useState } from 'react'

interface Props {
  label: string
  url: string
  onClick: (url: string) => void
}

export default function QuickLink({ label, url, onClick }: Props): React.ReactElement {
  const [favicon, setFavicon] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const hostname = (() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  })()

  useEffect(() => {
    let cancelled = false
    window.aura.favicons
      .fetch(url)
      .then((data) => {
        if (cancelled) return
        if (data) setFavicon(data)
        else setFailed(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  const hue = Array.from(hostname).reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  return (
    <button className="quicklink" onClick={() => onClick(url)} title={url}>
      <div
        className="quicklink-icon"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 50%, 60%), hsl(${(hue + 40) % 360}, 50%, 50%))`
        }}
      >
        {favicon && !failed ? (
          <img
            src={favicon}
            alt=""
            onError={() => setFailed(true)}
            onLoad={(e) => e.currentTarget.classList.add('loaded')}
          />
        ) : (
          <span className="quicklink-initial">{label[0]}</span>
        )}
      </div>
      <span className="quicklink-label">{label}</span>
    </button>
  )
}

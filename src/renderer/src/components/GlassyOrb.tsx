import React from 'react'

interface Props {
  size?: number
}

export default function GlassyOrb({ size = 120 }: Props): React.ReactElement {
  return (
    <div className="glassy-orb-container" style={{ width: size, height: size }}>
      <div className="glassy-orb-glow" />
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        className="glassy-orb-svg"
      >
        <defs>
          <radialGradient id="orb-body" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#E8F1FF" stopOpacity="1" />
            <stop offset="35%" stopColor="#A6C0F1" stopOpacity="1" />
            <stop offset="75%" stopColor="#5970C8" stopOpacity="1" />
            <stop offset="100%" stopColor="#1A2050" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="orb-highlight" cx="35%" cy="25%" r="30%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orb-rim" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#7C9DFF" stopOpacity="0" />
            <stop offset="80%" stopColor="#A6C0F1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
          </radialGradient>
          <linearGradient id="orb-iridescence" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C6A5F1" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ABD5E9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#A6F1C9" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <rect
          x="12" y="18"
          width="96" height="84"
          rx="22" ry="22"
          fill="url(#orb-iridescence)"
          transform="rotate(-8 60 60)"
        />

        <rect
          x="18" y="22"
          width="84" height="76"
          rx="20" ry="20"
          fill="url(#orb-body)"
          transform="rotate(-6 60 60)"
        />

        <rect
          x="18" y="22"
          width="84" height="76"
          rx="20" ry="20"
          fill="url(#orb-rim)"
          transform="rotate(-6 60 60)"
        />

        <rect
          x="22" y="26"
          width="40" height="34"
          rx="14" ry="14"
          fill="url(#orb-highlight)"
          transform="rotate(-6 60 60)"
        />

        <g transform="rotate(-6 60 60)">
          <circle cx="50" cy="58" r="3" fill="#1A2050" />
          <circle cx="68" cy="58" r="3" fill="#1A2050" />
        </g>
      </svg>
    </div>
  )
}

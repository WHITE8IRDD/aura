import React from 'react'

export default function Logo({ size = 26 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Aura"
      role="img"
    >
      <defs>
        <radialGradient id="mini-orb" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#E8F1FF" />
          <stop offset="40%" stopColor="#A6C0F1" />
          <stop offset="100%" stopColor="#5970C8" />
        </radialGradient>
      </defs>
      <rect
        x="5" y="6"
        width="22" height="20"
        rx="6" ry="6"
        fill="url(#mini-orb)"
        transform="rotate(-6 16 16)"
      />
      <circle cx="13" cy="16" r="1.3" fill="#1A2050" transform="rotate(-6 16 16)" />
      <circle cx="19" cy="16" r="1.3" fill="#1A2050" transform="rotate(-6 16 16)" />
    </svg>
  )
}

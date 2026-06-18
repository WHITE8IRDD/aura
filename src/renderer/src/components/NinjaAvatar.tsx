import React from 'react'

interface Props {
  size?: number
}

export default function NinjaAvatar({ size = 48 }: Props): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="Ninja"
      role="img"
    >
      <circle cx="24" cy="24" r="24" fill="#5a5d6b" />
      <circle cx="24" cy="24" r="22" fill="#3e4150" />
      <path
        d="M 6 19 Q 24 16 42 19 L 42 27 Q 24 30 6 27 Z"
        fill="#1e2028"
      />
      <path
        d="M 8 14 Q 24 10 40 14 L 40 19 Q 24 16 8 19 Z"
        fill="#2a2d38"
      />
      <ellipse cx="17" cy="23" rx="2.8" ry="2.2" fill="#e8eaf0" />
      <ellipse cx="31" cy="23" rx="2.8" ry="2.2" fill="#e8eaf0" />
      <path
        d="M 6 19 Q 24 16 42 19 L 42 20 Q 24 17 6 20 Z"
        fill="rgba(0, 0, 0, 0.3)"
      />
      <path
        d="M 6 28 Q 12 38 24 40 Q 36 38 42 28 L 42 27 Q 24 30 6 27 Z"
        fill="#4a4d5a"
      />
      <ellipse cx="14" cy="33" rx="2" ry="1.5" fill="rgba(255, 255, 255, 0.04)" />
      <ellipse cx="34" cy="33" rx="2" ry="1.5" fill="rgba(255, 255, 255, 0.04)" />
    </svg>
  )
}

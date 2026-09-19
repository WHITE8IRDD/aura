import React from 'react'
import auraMark from '../assets/brand/aura-mark-colored.png'

export default function Logo({ size = 26 }: { size?: number }): React.ReactElement {
  return (
    <img
      src={auraMark}
      width={size}
      height={size}
      alt="Aura"
      role="img"
      className="logo-mark"
      draggable={false}
    />
  )
}

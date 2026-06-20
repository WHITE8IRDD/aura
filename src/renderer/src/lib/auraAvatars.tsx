import React from 'react'

export interface AuraAvatar {
  id: string
  name: string
  svg: React.ReactNode
}

const SvgFrame = (children: React.ReactNode) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
)

export const AURA_AVATARS: AuraAvatar[] = [
  {
    id: 'aura:default',
    name: 'Default',
    svg: SvgFrame(<>
      <circle cx="32" cy="32" r="30" fill="var(--accent-soft)" />
      <circle cx="32" cy="26" r="10" fill="var(--accent)" />
      <path d="M14 52 C 14 42, 22 38, 32 38 C 42 38, 50 42, 50 52 L 50 56 L 14 56 Z"
            fill="var(--accent)" />
    </>)
  },
  {
    id: 'aura:orb',
    name: 'Aura Orb',
    svg: SvgFrame(<>
      <defs>
        <radialGradient id="orbGrad" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3730a3" />
        </radialGradient>
        <radialGradient id="orbShine" cx="35%" cy="35%">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="40%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#orbGrad)" />
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#orbShine)" />
      <ellipse cx="25" cy="32" rx="3" ry="4" fill="white" />
      <ellipse cx="39" cy="32" rx="3" ry="4" fill="white" />
    </>)
  },
  {
    id: 'aura:ninja',
    name: 'Ninja',
    svg: SvgFrame(<>
      <circle cx="32" cy="32" r="26" fill="#2d2d33" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#94a3b8"
              strokeOpacity="0.3" strokeWidth="1.5" />
      <rect x="8" y="26" width="48" height="12" fill="#1e1e22" />
      <ellipse cx="24" cy="32" rx="3.5" ry="2" fill="white" />
      <ellipse cx="40" cy="32" rx="3.5" ry="2" fill="white" />
      <circle cx="24" cy="32" r="1" fill="#1e1e22" />
      <circle cx="40" cy="32" r="1" fill="#1e1e22" />
    </>)
  },
  {
    id: 'aura:blob',
    name: 'Blob',
    svg: SvgFrame(<>
      <defs>
        <linearGradient id="blobGrad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-hover)" />
        </linearGradient>
      </defs>
      <path d="M 32 6 C 48 6, 58 18, 58 32 C 58 50, 42 58, 30 58
               C 12 58, 6 44, 6 30 C 6 16, 18 6, 32 6 Z"
            fill="url(#blobGrad)" />
      <ellipse cx="25" cy="30" rx="2.5" ry="3.5" fill="white" />
      <ellipse cx="40" cy="30" rx="2.5" ry="3.5" fill="white" />
      <path d="M 26 40 Q 32 44 38 40" stroke="white" strokeWidth="2"
            strokeLinecap="round" fill="none" />
    </>)
  },
  {
    id: 'aura:bolt',
    name: 'Bolt',
    svg: SvgFrame(<>
      <rect x="4" y="4" width="56" height="56" rx="14"
            fill="var(--accent-soft)" />
      <path d="M 36 8 L 18 36 L 28 36 L 24 56 L 46 28 L 36 28 Z"
            fill="var(--accent)" />
    </>)
  },
  {
    id: 'aura:crystal',
    name: 'Crystal',
    svg: SvgFrame(<>
      <defs>
        <linearGradient id="crystGrad" x1="0" y1="0" x2="0" y2="64">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#1c1c24" />
      <path d="M 32 10 L 50 26 L 32 56 L 14 26 Z" fill="url(#crystGrad)" />
      <path d="M 32 10 L 50 26 L 32 30 Z" fill="white" fillOpacity="0.3" />
      <path d="M 14 26 L 32 30 L 32 56 Z" fill="black" fillOpacity="0.2" />
    </>)
  },
  {
    id: 'aura:moon',
    name: 'Crescent',
    svg: SvgFrame(<>
      <rect x="4" y="4" width="56" height="56" rx="14"
            fill="#1a1b2e" />
      <circle cx="40" cy="32" r="20" fill="#e2e8f0" />
      <circle cx="48" cy="28" r="18" fill="#1a1b2e" />
      <circle cx="20" cy="18" r="1" fill="white" />
      <circle cx="14" cy="34" r="1" fill="white" />
      <circle cx="18" cy="48" r="1" fill="white" />
    </>)
  },
  {
    id: 'aura:ghost',
    name: 'Pixel Ghost',
    svg: SvgFrame(<>
      <rect x="4" y="4" width="56" height="56" rx="14"
            fill="var(--accent-soft)" />
      <path d="M 18 22 C 18 14, 24 10, 32 10 C 40 10, 46 14, 46 22
               L 46 50 L 42 46 L 38 50 L 34 46 L 30 50 L 26 46 L 22 50
               L 18 46 Z"
            fill="var(--accent)" />
      <circle cx="26" cy="28" r="3" fill="white" />
      <circle cx="38" cy="28" r="3" fill="white" />
      <circle cx="26" cy="28" r="1.5" fill="#1e1e22" />
      <circle cx="38" cy="28" r="1.5" fill="#1e1e22" />
    </>)
  }
]

export function getAvatarById(id: string): AuraAvatar | undefined {
  return AURA_AVATARS.find(a => a.id === id)
}

export function isAuraAvatarId(value: string): boolean {
  return value.startsWith('aura:')
}

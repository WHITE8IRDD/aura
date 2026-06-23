import React from 'react'

interface IconProps {
  size?: number
  className?: string
}

const I = ({
  children,
  size = 16,
  className,
  viewBox = '0 0 24 24'
}: IconProps & { children: React.ReactNode; viewBox?: string }): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const IconBack = (p: IconProps): React.ReactElement => (
  <I {...p}><path d="M15 18l-6-6 6-6" /></I>
)
export const IconForward = (p: IconProps): React.ReactElement => (
  <I {...p}><path d="M9 18l6-6-6-6" /></I>
)
export const IconReload = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M21 12a9 9 0 11-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </I>
)
export const IconClose = (p: IconProps): React.ReactElement => (
  <I {...p}><path d="M18 6L6 18M6 6l12 12" /></I>
)
export const IconPlus = (p: IconProps): React.ReactElement => (
  <I {...p}><path d="M12 5v14M5 12h14" /></I>
)
export const IconLock = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </I>
)
export const IconAlert = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </I>
)
export const IconMic = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
  </I>
)
export const IconSparkle = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
  </I>
)
export const IconHistory = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M3 12a9 9 0 109-9 9.74 9.74 0 00-6.74 2.74L3 8" />
    <path d="M3 3v5h5M12 7v5l4 2" />
  </I>
)
export const IconBookmark = (p: IconProps): React.ReactElement => (
  <I {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></I>
)
export const IconDownload = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </I>
)
export const IconShield = (p: IconProps): React.ReactElement => (
  <I {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></I>
)
export const IconExtension = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M20 12c0-1.1-.9-2-2-2h-1V7a2 2 0 00-2-2h-3a2 2 0 00-4 0H5a2 2 0 00-2 2v3H2a2 2 0 000 4h1v3a2 2 0 002 2h3a2 2 0 004 0h3a2 2 0 002-2v-3h1a2 2 0 002-2z" />
  </I>
)
export const IconSettings = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </I>
)
export const IconSidebar = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </I>
)
export const IconSearch = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </I>
)
export const IconUser = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </I>
)
export const IconMore = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </I>
)
export const IconMinimize = (p: IconProps): React.ReactElement => (
  <I {...p}><line x1="5" y1="12" x2="19" y2="12" /></I>
)
export const IconMaximize = (p: IconProps): React.ReactElement => (
  <I {...p}><rect x="4" y="4" width="16" height="16" rx="1" /></I>
)
export const IconRestore = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <rect x="7" y="3" width="14" height="14" rx="1" />
    <path d="M17 7H5a2 2 0 00-2 2v12" />
  </I>
)
export const IconHome = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </I>
)
export const IconActivity = (p: IconProps): React.ReactElement => (
  <I {...p}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </I>
)

interface SplitIconProps extends IconProps {
  filled?: boolean
}
export const IconReader: React.FC<{ size?: number; filled?: boolean }> = ({
  size = 16,
  filled = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z" />
    <path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="13" y2="15" />
  </svg>
)

export const IconSplit: React.FC<SplitIconProps> = ({ size = 16, filled = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
)


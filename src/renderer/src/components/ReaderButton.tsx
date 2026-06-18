import React from 'react'

interface Props {
  active: boolean
  onClick: () => void
}

/**
 * "Reader Mode" toggle button — small book icon shown in the address bar
 * next to the bookmark star.
 */
export default function ReaderButton({ active, onClick }: Props): React.ReactElement {
  return (
    <button
      type="button"
      className={`ab-reader${active ? ' active' : ''}`}
      title={active ? 'Exit reader mode' : 'Toggle reader mode (Ctrl+Shift+R)'}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      tabIndex={-1}
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    </button>
  )
}

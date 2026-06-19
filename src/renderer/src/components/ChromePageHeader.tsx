import React from 'react'

interface Props {
  title: string
  badge?: string
  onBack: () => void
}

export const ChromePageHeader: React.FC<Props> = ({ title, badge, onBack }) => (
  <div className="chrome-page-header">
    <button
      className="chrome-page-back-btn"
      onClick={onBack}
      aria-label="Back to page"
      title="Back (Alt+Left)"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
    <h1 className="chrome-page-title">
      {title}
      {badge && <span className="chrome-page-badge">{badge}</span>}
    </h1>
  </div>
)

import React from 'react'

interface IconProps {
  size?: number
}

export function GoogleIcon({ size = 16 }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Google">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export function DuckDuckGoIcon({ size = 16 }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="DuckDuckGo">
      <circle cx="12" cy="12" r="11" fill="#DE5833"/>
      <path d="M14.5 9.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S12.17 8 13 8s1.5.67 1.5 1.5z" fill="#fff"/>
      <circle cx="13" cy="9.5" r="0.6" fill="#000"/>
      <path d="M7 16c1.5-2 3.5-3 5-3s3.5 1 5 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M9 12c-.5-1.5-.5-3 .5-4.5 1-1.5 2.5-2 4-1.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export function BingIcon({ size = 16 }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Bing">
      <defs>
        <linearGradient id="bing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00CACC"/>
          <stop offset="100%" stopColor="#048CB1"/>
        </linearGradient>
      </defs>
      <path
        fill="url(#bing-grad)"
        d="M5 2v16.5l5-2.2v-7l6 2.5c.5.2.8.7.8 1.2 0 .5-.3 1-.8 1.2L10 16l-5 2.2L17 22l5-2.2v-6l-12-5V2H5z"
      />
    </svg>
  )
}

export function BraveIcon({ size = 16 }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Brave">
      <defs>
        <linearGradient id="brave-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FB542B"/>
          <stop offset="100%" stopColor="#E2461C"/>
        </linearGradient>
      </defs>
      <path
        fill="url(#brave-grad)"
        d="M12 2L7 4.5 4 4l1 3-1.5 1.5L5 11l-1 4 3.5 2 4.5 5 4.5-5 3.5-2-1-4 1.5-2.5L19 7l1-3-3 .5L12 2zm0 4l4 2-1 4-3 4-3-4-1-4 4-2z"
      />
    </svg>
  )
}

export function StartpageIcon({ size = 16 }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Startpage">
      <circle cx="12" cy="12" r="11" fill="#3B49DF"/>
      <path
        fill="#fff"
        d="M8 8c0-1.1.9-2 2-2h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2v4H8V8zm4 4h2c.55 0 1-.45 1-1s-.45-1-1-1h-2v2z"
      />
    </svg>
  )
}

export function getEngineIcon(
  id: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'startpage',
  size = 16
): React.ReactElement {
  switch (id) {
    case 'google':     return <GoogleIcon size={size} />
    case 'duckduckgo': return <DuckDuckGoIcon size={size} />
    case 'bing':       return <BingIcon size={size} />
    case 'brave':      return <BraveIcon size={size} />
    case 'startpage':  return <StartpageIcon size={size} />
  }
}

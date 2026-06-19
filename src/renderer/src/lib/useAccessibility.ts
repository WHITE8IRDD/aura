import { useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'

export function useAccessibility(): void {
  const { settings } = useSettings()

  useEffect(() => {
    const root = document.documentElement

    if (settings?.a11yReduceMotion) {
      root.setAttribute('data-reduce-motion', 'true')
    } else {
      root.removeAttribute('data-reduce-motion')
    }

    if (settings?.a11yAlwaysShowFocus) {
      root.setAttribute('data-always-focus', 'true')
    } else {
      root.removeAttribute('data-always-focus')
    }

    if (settings?.a11yLargerCursor) {
      root.setAttribute('data-larger-cursor', 'true')
    } else {
      root.removeAttribute('data-larger-cursor')
    }
  }, [
    settings?.a11yReduceMotion,
    settings?.a11yAlwaysShowFocus,
    settings?.a11yLargerCursor
  ])
}

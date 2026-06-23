import React, { useEffect, useState } from 'react'
import DashboardLight from './DashboardLight'
import DashboardDark from './DashboardDark'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  onNavigate: (url: string) => void
}

type LayoutMode = 'light' | 'dark' | 'auto'

function getCurrentBrowserTheme(): 'light' | 'dark' {
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'light' ? 'light' : 'dark'
}

export default function NewTabDashboard({ onNavigate }: Props): React.ReactElement {
  // 'auto' means follow browser theme. Default is auto.
  const [layout, setLayout] = useLocalStorage<LayoutMode>('aura:dash-layout', 'auto')
  const [browserTheme, setBrowserTheme] = useState<'light' | 'dark'>(getCurrentBrowserTheme())

  // One-time migration: legacy 'dark'/'light' values become 'auto'
  // so existing installs benefit from automatic theme tracking.
  useEffect(() => {
    try {
      const migrated = localStorage.getItem('aura:dash-layout-migrated-v1')
      if (migrated) return
      const current = localStorage.getItem('aura:dash-layout')
      if (current === '"dark"' || current === '"light"' || current === 'dark' || current === 'light') {
        localStorage.setItem('aura:dash-layout', JSON.stringify('auto'))
        setLayout('auto')
      }
      localStorage.setItem('aura:dash-layout-migrated-v1', 'true')
    } catch { /* ignore */ }
  }, [setLayout])

  // Watch for browser theme changes via MutationObserver on data-theme attribute
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setBrowserTheme(getCurrentBrowserTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    return () => observer.disconnect()
  }, [])

  // Resolve the effective layout: explicit setting wins, otherwise follow browser theme
  const effectiveLayout: 'light' | 'dark' =
    layout === 'auto' ? browserTheme : layout

  const toggle = (): void => {
    // Cycle: auto -> light -> dark -> auto
    setLayout((m) =>
      m === 'auto' ? 'light' : m === 'light' ? 'dark' : 'auto'
    )
  }

  return effectiveLayout === 'light' ? (
    <DashboardLight onNavigate={onNavigate} onSwitchLayout={toggle} />
  ) : (
    <DashboardDark onNavigate={onNavigate} onSwitchLayout={toggle} />
  )
}

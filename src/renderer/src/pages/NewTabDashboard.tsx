import React from 'react'
import DashboardLight from './DashboardLight'
import DashboardDark from './DashboardDark'
import { useLocalStorage } from '../hooks/useLocalStorage'

type LayoutMode = 'light' | 'dark'

interface Props {
  onNavigate: (url: string) => void
}

export default function NewTabDashboard({ onNavigate }: Props): React.ReactElement {
  const [layout, setLayout] = useLocalStorage<LayoutMode>('aura:dash-layout', 'dark')

  const toggle = (): void => setLayout((m) => (m === 'light' ? 'dark' : 'light'))

  return layout === 'light' ? (
    <DashboardLight onNavigate={onNavigate} onSwitchLayout={toggle} />
  ) : (
    <DashboardDark onNavigate={onNavigate} onSwitchLayout={toggle} />
  )
}

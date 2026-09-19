import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import ShieldsPopover from './components/ShieldsPopover'
import { getPresetById, applyPresetToDOM } from './lib/themePresets'
import '@/styles/theme.css'
import '@/styles/theme-vars.css'

// Standalone popover windows never run App's useTheme(), so mirror it here:
// read the saved preset and keep the CSS vars in sync while open.
function PopoverThemeSync(): null {
  useEffect(() => {
    let alive = true
    const apply = async (): Promise<void> => {
      try {
        const presetId = (await window.aura.settings.get('themePreset')) as string
        const preset = getPresetById(presetId) ?? getPresetById('aura-dark')!
        if (alive) applyPresetToDOM(preset)
      } catch { /* theme-vars.css fallbacks cover it */ }
    }
    void apply()
    const cleanups: Array<() => void> = []
    try {
      cleanups.push(window.aura.theme.onChanged(() => { void apply() }))
      cleanups.push(
        window.aura.settings.onChanged((data: { key: string }) => {
          if (data.key === 'themeMode' || data.key === 'themePreset') void apply()
        })
      )
    } catch { /* listeners unavailable */ }
    return () => {
      alive = false
      for (const fn of cleanups) {
        try { fn() } catch { /* already torn down */ }
      }
    }
  }, [])
  return null
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Aura Shields Popover Error]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#f87171', background: '#0f1015', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Aura Shields Popover Error</h2>
          <pre style={{ background: '#1e1e24', padding: '16px', borderRadius: '8px', color: '#fca5a5', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found. Check shieldsPopover.html.')

createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PopoverThemeSync />
      <ShieldsPopover />
    </ErrorBoundary>
  </React.StrictMode>
)
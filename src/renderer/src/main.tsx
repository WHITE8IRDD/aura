import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/theme.css'
import './styles/theme-vars.css'
import './components/ChromePageHeader.css'

window.addEventListener('error', (e) => {
  console.error('[renderer error]', e.error ?? e.message)
  e.preventDefault()
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('[renderer unhandledRejection]', e.reason)
  e.preventDefault()
})

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Aura React Error]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#f87171', background: '#0f1015', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Aura UI Render Error</h2>
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

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found. Check index.html.')

createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
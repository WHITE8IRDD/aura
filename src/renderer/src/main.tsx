import React from 'react'
import { createRoot } from 'react-dom/client'

window.addEventListener('error', (e) => {
  console.error('[renderer error]', e.error ?? e.message)
  e.preventDefault()
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('[renderer unhandledRejection]', e.reason)
  e.preventDefault()
})

import App from './App'
import './styles/theme.css'
import './styles/theme-vars.css'
import './components/ChromePageHeader.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found. Check index.html.')

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

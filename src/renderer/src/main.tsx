import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/theme.css'
import './components/ChromePageHeader.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found. Check index.html.')

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

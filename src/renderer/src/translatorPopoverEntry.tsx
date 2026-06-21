import React from 'react'
import { createRoot } from 'react-dom/client'
import { TranslatorPopoverContent } from './components/TranslatorPopoverContent'
import './styles/theme-vars.css'
import './styles/theme.css'

async function init() {
  try {
    const resolved = await window.aura.theme.getResolved()
    document.documentElement.setAttribute('data-theme', resolved)
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  document.documentElement.style.setProperty('--bg-elevated', 'rgba(28, 28, 32, 0.85)')

  const root = createRoot(document.getElementById('root')!)
  root.render(<TranslatorPopoverContent />)
}

init()

import React from 'react'
import { createRoot } from 'react-dom/client'
import { MediaHubPopoverContent } from './components/MediaHubPopoverContent'
import './styles/theme-vars.css'
import './styles/theme.css'
import './components/MediaHub.css'

async function init() {
  try {
    const resolved = await window.aura.theme.getResolved()
    document.documentElement.setAttribute('data-theme', resolved)
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  const root = createRoot(document.getElementById('root')!)
  root.render(<MediaHubPopoverContent />)
}

init()

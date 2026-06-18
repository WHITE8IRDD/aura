import React, { useState } from 'react'
import WidgetGrid from '../widgets/WidgetGrid'
import { IconSparkle, IconMic, IconPlus, IconMore } from '../components/Icons'

interface Props {
  onNavigate: (url: string) => void
  onSwitchLayout: () => void
}

export default function DashboardLight({
  onNavigate,
  onSwitchLayout
}: Props): React.ReactElement {
  const [prompt, setPrompt] = useState('')
  const [editing, setEditing] = useState(false)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return
    onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`)
    setPrompt('')
  }

  return (
    <div className="dash-light">
      <header className="dash-light-header">
        <div>
          <h1 className="dash-greeting">Hi there, I&apos;m Aura</h1>
          <p className="dash-tagline">Ask me anything, or pick up where you left off.</p>
        </div>
        <button className="layout-toggle" onClick={onSwitchLayout} title="Switch to dark layout">
          Switch layout
        </button>
      </header>

      <form className="prompt-box" onSubmit={handleSubmit}>
        <textarea
          className="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask me anything or type a command&hellip;"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <div className="prompt-actions">
          <div className="prompt-selectors">
            <select className="prompt-select" defaultValue="balanced">
              <option value="balanced">Balanced</option>
              <option value="fast">Fast</option>
              <option value="deep">Deep</option>
            </select>
            <select className="prompt-select" defaultValue="auto">
              <option value="auto">Auto model</option>
              <option value="gpt">GPT</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div className="prompt-buttons">
            <button type="button" className="prompt-icon-btn" title="Attach">
              <IconPlus size={15} />
            </button>
            <button type="button" className="prompt-icon-btn" title="Voice">
              <IconMic size={15} />
            </button>
            <button type="submit" className="prompt-send" title="Send">
              <IconSparkle size={14} />
              <span>Ask</span>
            </button>
          </div>
        </div>
      </form>

      <div className="dash-widgets-bar">
        <h2 className="dash-section-title">Your space</h2>
        <button
          className="edit-widgets-btn"
          onClick={() => setEditing((v) => !v)}
        >
          <IconMore size={14} />
          {editing ? 'Done' : 'Edit widgets'}
        </button>
      </div>

      <WidgetGrid onNavigate={onNavigate} editing={editing} />
    </div>
  )
}

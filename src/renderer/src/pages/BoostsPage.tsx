import React, { useEffect, useState } from 'react'
import type { Boost } from '../types'
import { IconClose, IconPlus } from '../components/Icons'

export default function BoostsPage(): React.ReactElement {
  const [boosts, setBoosts] = useState<Boost[]>([])
  const [editing, setEditing] = useState<Boost | null>(null)
  const [creating, setCreating] = useState(false)

  const load = (): void => { window.aura.boosts.list().then(setBoosts) }

  useEffect(() => {
    load()
    return window.aura.boosts.onUpdate(load)
  }, [])

  return (
    <div className="data-page">
      <header className="data-header">
        <div className="data-header-title">
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <div>
            <h1>Boosts</h1>
            <p>{boosts.length} custom site styles</p>
          </div>
        </div>
        <div className="data-header-actions">
          <button className="data-btn primary" onClick={() => setCreating(true)}>
            <IconPlus size={13} /> New Boost
          </button>
        </div>
      </header>

      {(creating || editing) && (
        <BoostEditor
          existing={editing}
          onSave={async (host, name, css) => {
            if (editing) {
              await window.aura.boosts.update(editing.id, { host, name, css })
            } else {
              await window.aura.boosts.add(host, name, css)
            }
            setEditing(null)
            setCreating(false)
          }}
          onCancel={() => { setEditing(null); setCreating(false) }}
        />
      )}

      <div className="data-list">
        {boosts.length === 0 && !creating ? (
          <div className="data-empty">
            No boosts yet. Click &quot;New Boost&quot; to inject custom CSS into a specific website.
            Example: hide YouTube sidebar, clean up Twitter, make Wikipedia wider.
          </div>
        ) : (
          boosts.map((b) => (
            <div key={b.id} className="data-row boost-row">
              <label className="boost-toggle">
                <input
                  type="checkbox"
                  checked={b.enabled}
                  onChange={(e) => window.aura.boosts.update(b.id, { enabled: e.target.checked })}
                />
                <span />
              </label>
              <div className="data-row-main" onClick={() => setEditing(b)}>
                <div className="data-row-title">{b.name}</div>
                <div className="data-row-meta">
                  <span className="boost-host">{b.host}</span>
                  <span className="data-row-sep">&middot;</span>
                  <span>{b.css.length} chars of CSS</span>
                </div>
              </div>
              <button className="data-row-delete"
                onClick={() => window.aura.boosts.delete(b.id)}>
                <IconClose size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

interface EditorProps {
  existing: Boost | null
  onSave: (host: string, name: string, css: string) => void
  onCancel: () => void
}

function BoostEditor({ existing, onSave, onCancel }: EditorProps): React.ReactElement {
  const [host, setHost] = useState(existing?.host ?? '')
  const [name, setName] = useState(existing?.name ?? '')
  const [css, setCss] = useState(existing?.css ?? '/* Your custom CSS here */\n')

  return (
    <div className="boost-editor">
      <div className="boost-editor-row">
        <label>Hostname</label>
        <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
          placeholder="youtube.com" />
      </div>
      <div className="boost-editor-row">
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Clean YouTube" />
      </div>
      <div className="boost-editor-row">
        <label>CSS</label>
        <textarea value={css} onChange={(e) => setCss(e.target.value)}
          rows={10} spellCheck={false} />
      </div>
      <div className="boost-editor-actions">
        <button className="data-btn" onClick={onCancel}>Cancel</button>
        <button className="data-btn primary"
          onClick={() => onSave(host.trim(), name.trim() || host.trim(), css)}
          disabled={!host.trim() || !css.trim()}>
          {existing ? 'Save' : 'Create'}
        </button>
      </div>
    </div>
  )
}

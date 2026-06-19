import React, { useEffect, useState } from 'react'
import { Toggle, Button } from './SettingsControls'
import { useSettings } from '../../hooks/useSettings'
import type { AiProviderConfig } from '../../types'

const PROVIDERS: { id: AiProviderConfig['id']; label: string; desc: string }[] = [
  { id: 'mock', label: 'Mock AI', desc: 'Built-in mock provider for testing — no API key needed' },
  { id: 'openai', label: 'OpenAI', desc: 'GPT-4o, GPT-4o-mini, o3, and more' },
  { id: 'anthropic', label: 'Anthropic Claude', desc: 'Claude 3.5 Sonnet, Claude 3 Opus, and more' },
  { id: 'ollama', label: 'Ollama', desc: 'Local models via Ollama (requires Ollama running on your machine)' }
]

export function AiSection(): React.ReactElement {
  const { settings, set, loaded } = useSettings()
  if (!loaded || !settings) return <div className="sett-card">Loading…</div>
  const [config, setConfig] = useState<AiProviderConfig | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [apiKey, setApiKey] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    window.aura.ai.getConfig().then(setConfig)
  }, [])

  useEffect(() => {
    window.aura.ai.listModels().then((m: string[]) => setModels(m))
  }, [config?.id])

  const handleSelectProvider = async (id: AiProviderConfig['id']) => {
    await window.aura.ai.setProvider({ ...config, id, hasKey: false })
    const c = await window.aura.ai.getConfig()
    setConfig(c)
  }

  const handleSaveKey = async () => {
    if (!config) return
    await window.aura.ai.setProvider({ ...config, hasKey: true })
    const c = await window.aura.ai.getConfig()
    setConfig(c)
    setApiKey('')
  }

  const handleTest = async () => {
    if (!config) return
    setTesting(true)
    setTestResult(null)
    try {
      const ready = await window.aura.ai.isReady()
      setTestResult(ready ? 'Connection successful' : 'Provider is not ready')
    } catch (err: unknown) {
      setTestResult(String(err))
    }
    setTesting(false)
  }

  return (
    <div className="sett-section" id="sett-ai">
      <h2 className="sett-section-title">AI Assistant</h2>

      <div className="sett-card">
        <h3 className="sett-card-title">AI provider</h3>
        <div className="sett-provider-grid">
          {PROVIDERS.map((p) => (
            <button key={p.id}
              className={`sett-provider-card${config?.id === p.id ? ' active' : ''}`}
              onClick={() => handleSelectProvider(p.id)}>
              <div className="sett-provider-name">{p.label}</div>
              <div className="sett-provider-desc">{p.desc}</div>
            </button>
          ))}
        </div>

        {config && config.id !== 'mock' && (
          <div className="sett-field">
            <div className="sett-field-label">API Key</div>
            <div className="sett-password-row">
              <input className="sett-text-input" type="password" value={apiKey}
                placeholder={config.hasKey ? 'API key saved (enter to replace)' : 'sk-...'}
                onChange={(e) => setApiKey(e.target.value)} />
              <button className="sett-btn" disabled={!apiKey.trim()} onClick={handleSaveKey}>
                Save
              </button>
            </div>
          </div>
        )}

        {config && models.length > 0 && (
          <div className="sett-field">
            <div className="sett-field-label">Model</div>
            <div className="sett-select-wrap">
              <select value={config.defaultModel ?? models[0] ?? ''}
                onChange={async (e) => {
                  await window.aura.ai.setProvider({ ...config, defaultModel: e.target.value })
                  const c = await window.aura.ai.getConfig()
                  setConfig(c)
                }}>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {config && (
          <Button label={testing ? 'Testing...' : 'Test connection'}
            disabled={testing}
            onClick={handleTest} />
        )}
        {testResult && <div className="sett-test-result">{testResult}</div>}
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Defaults</h3>
        <Toggle label="Include page context by default"
          description="Automatically send page content to AI for context-aware answers"
          checked={settings.aiIncludePageContextDefault}
          onChange={(v) => set('aiIncludePageContextDefault', v)} />
        <Toggle label="Remember conversations"
          description="Save AI conversations for later reference"
          checked={settings.aiRememberConversations}
          onChange={(v) => set('aiRememberConversations', v)} />
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import type { AiProviderConfig } from '../types'

interface Props {
  onOpenSettings: () => void
}

export default function ProviderBadge({ onOpenSettings }: Props): React.ReactElement {
  const [config, setConfig] = useState<AiProviderConfig | null>(null)

  useEffect(() => {
    void window.aura.ai.getConfig().then(setConfig)
  }, [])

  if (!config) return <></>

  const label = (() => {
    switch (config.id) {
      case 'mock': return 'Demo mode'
      case 'openai': return config.hasKey ? 'OpenAI' : 'OpenAI (needs key)'
      case 'anthropic': return config.hasKey ? 'Claude' : 'Claude (needs key)'
      case 'ollama': return 'Ollama (local)'
    }
  })()

  return (
    <button className="ai-provider-badge" onClick={onOpenSettings}>
      <span className={`ai-provider-dot ${config.id}`} />
      {label}
    </button>
  )
}

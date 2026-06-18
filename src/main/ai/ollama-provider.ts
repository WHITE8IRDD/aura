import type { AiProvider, AiCompletionOptions } from './types'

export class OllamaProvider implements AiProvider {
  id = 'ollama' as const
  label = 'Ollama (local)'
  private baseUrl: string
  private defaultModel: string

  constructor(baseUrl = 'http://localhost:11434', defaultModel = 'llama3.2') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.defaultModel = defaultModel
  }

  async isReady(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      })
      return res.ok
    } catch {
      return false
    }
  }

  async *complete(options: AiCompletionOptions): AsyncIterable<string> {
    const body = {
      model: options.model || this.defaultModel,
      messages: options.messages,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 1024
      }
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      throw new Error(`Ollama ${res.status}: ${await res.text().catch(() => '')}`)
    }

    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const json = JSON.parse(line)
          if (json.message?.content) yield json.message.content
          if (json.done) return
        } catch {
          // ignore
        }
      }
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      if (!res.ok) return []
      const data = await res.json() as { models?: Array<{ name: string }> }
      return (data.models || []).map((m) => m.name)
    } catch {
      return []
    }
  }
}

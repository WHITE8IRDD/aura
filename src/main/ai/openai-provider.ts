import type { AiProvider, AiCompletionOptions } from './types'

export class OpenAiProvider implements AiProvider {
  id = 'openai' as const
  label = 'OpenAI'
  private apiKey: string
  private defaultModel: string

  constructor(apiKey: string, defaultModel = 'gpt-4o-mini') {
    this.apiKey = apiKey
    this.defaultModel = defaultModel
  }

  async isReady(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.startsWith('sk-'))
  }

  async *complete(options: AiCompletionOptions): AsyncIterable<string> {
    const body = {
      model: options.model || this.defaultModel,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      stream: true
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`)
    }

    yield* parseSSE(res)
  }

  async listModels(): Promise<string[]> {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  }
}

async function* parseSSE(res: Response): AsyncIterable<string> {
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
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const chunk = json.choices?.[0]?.delta?.content
        if (chunk) yield chunk
      } catch {
        // ignore malformed lines
      }
    }
  }
}

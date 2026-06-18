import type { AiProvider, AiCompletionOptions } from './types'

export class AnthropicProvider implements AiProvider {
  id = 'anthropic' as const
  label = 'Anthropic Claude'
  private apiKey: string
  private defaultModel: string

  constructor(apiKey: string, defaultModel = 'claude-3-5-sonnet-latest') {
    this.apiKey = apiKey
    this.defaultModel = defaultModel
  }

  async isReady(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.startsWith('sk-ant-'))
  }

  async *complete(options: AiCompletionOptions): AsyncIterable<string> {
    const systemMessages = options.messages.filter((m) => m.role === 'system')
    const chatMessages = options.messages.filter((m) => m.role !== 'system')

    const body = {
      model: options.model || this.defaultModel,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      stream: true,
      ...(systemMessages.length > 0 && {
        system: systemMessages.map((m) => m.content).join('\n\n')
      }),
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`)
    }

    yield* parseAnthropicSSE(res)
  }

  async listModels(): Promise<string[]> {
    return [
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-opus-latest'
    ]
  }
}

async function* parseAnthropicSSE(res: Response): AsyncIterable<string> {
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
      try {
        const json = JSON.parse(data)
        if (json.type === 'content_block_delta' && json.delta?.text) {
          yield json.delta.text
        }
      } catch {
        // ignore
      }
    }
  }
}

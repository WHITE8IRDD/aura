export type Role = 'system' | 'user' | 'assistant'

export interface AiMessage {
  role: Role
  content: string
}

export interface AiCompletionOptions {
  messages: AiMessage[]
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AiProvider {
  id: ProviderId
  label: string
  isReady(): Promise<boolean>
  complete(options: AiCompletionOptions): AsyncIterable<string>
  listModels?(): Promise<string[]>
}

export type ProviderId = 'mock' | 'openai' | 'anthropic' | 'ollama'

export interface ProviderConfig {
  id: ProviderId
  apiKey?: string
  baseUrl?: string
  defaultModel?: string
}

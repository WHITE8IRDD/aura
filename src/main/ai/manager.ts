import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { AiProvider, ProviderId, ProviderConfig } from './types'
import { MockProvider } from './mock-provider'
import { OpenAiProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'
import { OllamaProvider } from './ollama-provider'

class AiManager {
  private active: AiProvider = new MockProvider()
  private config: ProviderConfig = { id: 'mock' }

  async init(): Promise<void> {
    await this.loadConfig()
    await this.rebuildProvider()
  }

  getActive(): AiProvider {
    return this.active
  }

  getConfig(): { id: ProviderId; hasKey: boolean; defaultModel?: string; baseUrl?: string } {
    return {
      id: this.config.id,
      hasKey: Boolean(this.config.apiKey),
      defaultModel: this.config.defaultModel,
      baseUrl: this.config.baseUrl
    }
  }

  async setProvider(config: ProviderConfig): Promise<void> {
    this.config = { ...config }
    await this.saveConfig()
    await this.rebuildProvider()
  }

  async listModels(): Promise<string[]> {
    if (this.active.listModels) return this.active.listModels()
    return []
  }

  private async rebuildProvider(): Promise<void> {
    switch (this.config.id) {
      case 'openai':
        if (this.config.apiKey) {
          this.active = new OpenAiProvider(this.config.apiKey, this.config.defaultModel)
          return
        }
        break
      case 'anthropic':
        if (this.config.apiKey) {
          this.active = new AnthropicProvider(this.config.apiKey, this.config.defaultModel)
          return
        }
        break
      case 'ollama':
        this.active = new OllamaProvider(this.config.baseUrl, this.config.defaultModel)
        return
    }
    this.active = new MockProvider()
  }

  private configPath(): string {
    return join(app.getPath('userData'), 'ai-config.json')
  }

  private async loadConfig(): Promise<void> {
    const path = this.configPath()
    if (!existsSync(path)) return
    try {
      const raw = await readFile(path)
      const parsed = JSON.parse(raw.toString()) as {
        id: ProviderId
        apiKeyEncrypted?: string
        baseUrl?: string
        defaultModel?: string
      }

      let apiKey: string | undefined
      if (parsed.apiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
        try {
          apiKey = safeStorage.decryptString(
            Buffer.from(parsed.apiKeyEncrypted, 'base64')
          )
        } catch {
          // decrypt failed — ignore
        }
      }

      this.config = {
        id: parsed.id,
        apiKey,
        baseUrl: parsed.baseUrl,
        defaultModel: parsed.defaultModel
      }
    } catch (err) {
      console.warn('[Aura/ai] Failed to load config:', err)
    }
  }

  private async saveConfig(): Promise<void> {
    const path = this.configPath()
    const out: Record<string, unknown> = {
      id: this.config.id,
      baseUrl: this.config.baseUrl,
      defaultModel: this.config.defaultModel
    }
    if (this.config.apiKey && safeStorage.isEncryptionAvailable()) {
      out.apiKeyEncrypted = safeStorage
        .encryptString(this.config.apiKey)
        .toString('base64')
    }
    await writeFile(path, JSON.stringify(out, null, 2))
  }
}

export const aiManager = new AiManager()

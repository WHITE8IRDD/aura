import type { AiProvider, AiCompletionOptions } from './types'

export class MockProvider implements AiProvider {
  id = 'mock' as const
  label = 'Aura (offline demo)'

  async isReady(): Promise<boolean> { return true }

  async *complete(options: AiCompletionOptions): AsyncIterable<string> {
    const lastUser = [...options.messages].reverse().find((m) => m.role === 'user')
    const prompt = lastUser?.content ?? ''

    const response = generateMockResponse(prompt, options.messages)

    const words = response.split(' ')
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 60))
      yield word + ' '
    }
  }
}

function generateMockResponse(prompt: string, history: { role: string; content: string }[]): string {
  const lower = prompt.toLowerCase()
  const hasPageContext = history.some(
    (m) => m.role === 'system' && m.content.includes('PAGE CONTENT:')
  )

  if (hasPageContext) {
    if (lower.includes('summar')) {
      return "Here's a summary based on the page content I can see:\n\nThis page covers the main topic with several key points. The author presents their argument with supporting evidence and concludes with practical takeaways.\n\n(This is a demo response from Aura's mock AI provider. Configure OpenAI, Anthropic, or Ollama in Settings to get real summaries.)"
    }
    if (lower.includes('what') || lower.includes('explain') || lower.includes('?')) {
      return "Based on the page content, here's what I can tell you:\n\nThe page discusses this topic in detail. Key points include the main concepts, important details, and any conclusions the author draws.\n\n(Demo response — configure a real AI provider in Settings for actual answers grounded in the page.)"
    }
  }

  if (lower.includes('hello') || lower.includes('hi')) {
    return "Hello! I'm Aura's AI assistant. I'm currently running in offline demo mode. To unlock real AI capabilities, head to Settings → AI Assistant and add an API key for OpenAI, Anthropic, or connect to a local Ollama instance."
  }

  if (lower.includes('help')) {
    return "Here's what I can help with once you configure a real AI provider:\n\n• Summarize any web page\n• Answer questions about page content\n• Rewrite selected text\n• Smart search with direct answers\n• Chat with conversation memory\n\nGo to Settings → AI Assistant to get started."
  }

  if (lower.length < 20) {
    return `You said: "${prompt}"\n\nThis is a demo response. Aura's AI features work best when you connect a real provider. Open Settings → AI Assistant to add your API key.`
  }

  return "Thanks for trying Aura's AI assistant. I'm running in offline demo mode right now and can't give you a real response to that. To unlock genuinely useful AI — summaries, chat with pages, smart search — open Settings → AI Assistant and add an OpenAI, Anthropic, or local Ollama provider. It takes about 30 seconds to set up."
}

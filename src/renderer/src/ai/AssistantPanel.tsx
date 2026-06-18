import React, { useCallback, useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import AssistantInput from './AssistantInput'
import ProviderBadge from './ProviderBadge'
import type { TabState, AiConversation, AiConversationMessage } from '../types'

interface Props {
  open: boolean
  activeTab: TabState | undefined
  onClose: () => void
}

interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export default function AssistantPanel({
  open, activeTab, onClose
}: Props): React.ReactElement | null {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showProviderInfo, setShowProviderInfo] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const streamIdRef = useRef<string | null>(null)

  const pageAvailable = !!activeTab && !activeTab.internal

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadConversations = useCallback(() => {
    void window.aura.ai.listConversations().then(setConversations)
  }, [])

  useEffect(() => { if (open) loadConversations() }, [open, loadConversations])

  useEffect(() => {
    const unsubChunk = window.aura.ai.onStreamChunk(({ streamId, chunk }) => {
      if (streamId !== streamIdRef.current) return
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + chunk }
        }
        return copy
      })
    })
    const unsubDone = window.aura.ai.onStreamDone(({ streamId, conversationId: cid }) => {
      if (streamId !== streamIdRef.current) return
      setIsStreaming(false)
      streamIdRef.current = null
      setConversationId(cid)
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })))
      loadConversations()
    })
    const unsubError = window.aura.ai.onStreamError(({ streamId, error: err }) => {
      if (streamId !== streamIdRef.current) return
      setIsStreaming(false)
      streamIdRef.current = null
      setError(err)
    })
    return () => { unsubChunk(); unsubDone(); unsubError() }
  }, [loadConversations])

  const handleSubmit = useCallback((text: string, includePageContext: boolean) => {
    setError(null)
    const streamId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    streamIdRef.current = streamId

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: text },
      { id: `a-${Date.now()}`, role: 'assistant', content: '', streaming: true }
    ])
    setIsStreaming(true)

    void window.aura.ai.stream({
      streamId,
      conversationId,
      userMessage: text,
      includePageContext,
      tabId: activeTab?.id
    })
  }, [conversationId, activeTab])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }, [])

  const handleOpenConversation = useCallback(async (id: number) => {
    const msgs = await window.aura.ai.getMessages(id)
    setMessages(
      msgs
        .filter((m: AiConversationMessage) => m.role !== 'system')
        .map((m: AiConversationMessage) => ({
          id: `m-${m.id}`,
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
    )
    setConversationId(id)
    setShowHistory(false)
  }, [])

  const handleDeleteConversation = useCallback(async (id: number) => {
    await window.aura.ai.deleteConversation(id)
    loadConversations()
    if (conversationId === id) handleNewChat()
  }, [conversationId, handleNewChat, loadConversations])

  const handleSummarize = useCallback(() => {
    if (!pageAvailable) return
    handleSubmit('Summarize this page in 3-5 bullet points.', true)
  }, [pageAvailable, handleSubmit])

  useEffect(() => {
    if (showProviderInfo && open) {
      void window.aura.layout.hideView()
    } else if (!open) {
      void window.aura.layout.showView()
    }
  }, [showProviderInfo, open])

  if (!open) return null

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
          </svg>
          <span>Assistant</span>
        </div>
        <div className="ai-panel-actions">
          <button className="ai-icon-btn" onClick={() => setShowHistory((v) => !v)}
            title="Conversations">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 109-9 9.74 9.74 0 00-6.74 2.74L3 8" />
              <path d="M3 3v5h5M12 7v5l4 2" />
            </svg>
          </button>
          <button className="ai-icon-btn" onClick={handleNewChat} title="New chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button className="ai-icon-btn" onClick={onClose} title="Close (Ctrl+J)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="ai-history">
          {conversations.length === 0 ? (
            <div className="ai-history-empty">No past conversations</div>
          ) : (
            conversations.map((c) => (
              <div key={c.id} className="ai-history-item">
                <button
                  className="ai-history-main"
                  onClick={() => handleOpenConversation(c.id)}
                  title={c.title}
                >
                  <div className="ai-history-title">{c.title}</div>
                  <div className="ai-history-meta">
                    {new Date(c.updatedAt).toLocaleString()}
                  </div>
                </button>
                <button
                  className="ai-history-del"
                  onClick={() => handleDeleteConversation(c.id)}
                  title="Delete"
                >×</button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="ai-panel-body" ref={scrollRef}>
        {messages.length === 0 && !showHistory ? (
          <div className="ai-welcome">
            <div className="ai-welcome-glow" />
            <div className="ai-welcome-title">How can I help you?</div>
            <div className="ai-welcome-sub">
              Ask anything, summarize the current page, or paste text to discuss.
            </div>
            {pageAvailable && (
              <button className="ai-quick-action" onClick={handleSummarize}>
                ✨ Summarize this page
              </button>
            )}
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              streaming={m.streaming}
            />
          ))
        )}
        {error && (
          <div className="ai-error">
            ⚠️ {error}
          </div>
        )}
      </div>

      <div className="ai-panel-footer">
        <ProviderBadge onOpenSettings={() => setShowProviderInfo(true)} />
        <AssistantInput
          disabled={isStreaming}
          onSubmit={handleSubmit}
          pageAvailable={pageAvailable}
        />
      </div>

      {showProviderInfo && (
        <div className="ai-provider-info-overlay" onClick={() => setShowProviderInfo(false)}>
          <div className="ai-provider-info" onClick={(e) => e.stopPropagation()}>
            <div className="ai-provider-info-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
              </svg>
            </div>
            <h2 className="ai-provider-info-title">Connect a Real AI Provider</h2>
            <p className="ai-provider-info-text">
              The full Settings page ships with Stage 10. For now you can configure
              a real provider via DevTools console (open with <kbd>F12</kbd>):
            </p>

            <div className="ai-provider-info-code">
              <div className="ai-provider-info-code-label">OpenAI</div>
              <code>{'window.aura.ai.setProvider({ id: "openai", apiKey: "sk-...", defaultModel: "gpt-4o-mini" })'}</code>
            </div>

            <div className="ai-provider-info-code">
              <div className="ai-provider-info-code-label">Anthropic Claude</div>
              <code>{'window.aura.ai.setProvider({ id: "anthropic", apiKey: "sk-ant-...", defaultModel: "claude-3-5-sonnet-latest" })'}</code>
            </div>

            <div className="ai-provider-info-code">
              <div className="ai-provider-info-code-label">Ollama (local, 100% private)</div>
              <code>{'window.aura.ai.setProvider({ id: "ollama", baseUrl: "http://localhost:11434", defaultModel: "llama3.2" })'}</code>
            </div>

            <button className="ai-provider-info-close"
              onClick={() => setShowProviderInfo(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

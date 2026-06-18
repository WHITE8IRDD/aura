import React, { useEffect, useRef, useState } from 'react'

interface Props {
  disabled: boolean
  onSubmit: (text: string, includePageContext: boolean) => void
  pageAvailable: boolean
}

export default function AssistantInput({
  disabled, onSubmit, pageAvailable
}: Props): React.ReactElement {
  const [text, setText] = useState('')
  const [includePage, setIncludePage] = useState(true)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = Math.min(ref.current.scrollHeight, 160) + 'px'
  }, [text])

  const handleKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = (): void => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed, includePage && pageAvailable)
    setText('')
  }

  return (
    <div className="ai-input">
      {pageAvailable && (
        <label className="ai-input-context">
          <input
            type="checkbox"
            checked={includePage}
            onChange={(e) => setIncludePage(e.target.checked)}
          />
          <span>Include current page as context</span>
        </label>
      )}
      <div className="ai-input-row">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={disabled ? 'Thinking…' : 'Ask anything…'}
          disabled={disabled}
          spellCheck
        />
        <button
          className="ai-send"
          onClick={submit}
          disabled={disabled || !text.trim()}
          title="Send (Enter)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

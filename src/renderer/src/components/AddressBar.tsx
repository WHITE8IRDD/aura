import React, { useEffect, useRef, useState } from 'react'

interface Props {
  url: string
  onSubmit: (value: string) => void
}

// Local copy — renderer must not import from src/main
function isSecure(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('aura://')
}

export default function AddressBar({ url, onSubmit }: Props): React.ReactElement {
  const [value, setValue] = useState<string>('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) {
      setValue(url === 'aura://newtab' ? '' : url)
    }
  }, [url, focused])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSubmit(value.trim())
    inputRef.current?.blur()
  }

  const secure = isSecure(url)

  return (
    <form className="addressbar" onSubmit={handleSubmit}>
      <span
        className={`lock-icon${secure ? '' : ' insecure'}`}
        title={secure ? 'Connection is secure' : 'Connection is not secure'}
        aria-label={secure ? 'Secure' : 'Not secure'}
      >
        {secure ? '🔒' : '⚠️'}
      </span>

      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="Ask Aura or type a URL"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => {
          setFocused(true)
          e.target.select()
        }}
        onBlur={() => {
          setFocused(false)
          setValue(url === 'aura://newtab' ? '' : url)
        }}
        aria-label="Address bar"
      />

      <button
        type="button"
        className="mic-btn"
        title="Voice input (coming in Stage 7)"
        aria-label="Voice input"
      >
        🎙
      </button>
    </form>
  )
}

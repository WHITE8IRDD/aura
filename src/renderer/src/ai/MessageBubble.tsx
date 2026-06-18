import React from 'react'

interface Props {
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming?: boolean
}

export default function MessageBubble({
  role, content, streaming
}: Props): React.ReactElement | null {
  if (role === 'system') return null

  return (
    <div className={`ai-msg ai-msg-${role}`}>
      <div className="ai-msg-bubble">
        {content.split('\n').map((line, i) => (
          <p key={i}>{line || '\u00A0'}</p>
        ))}
        {streaming && <span className="ai-msg-cursor">▍</span>}
      </div>
    </div>
  )
}

import React from 'react'

interface UnicodeChar {
  char: string
  name: string
  code: string
  category: string
}

interface Props {
  char: UnicodeChar | null
}

export default function CharacterDetail({ char }: Props) {
  if (!char) return <div className="vk-detail vk-detail-empty">Hover a character</div>
  return (
    <div className="vk-detail">
      <span className="vk-detail-char">{char.char}</span>
      <span className="vk-detail-name">{char.name}</span>
      <span className="vk-detail-code">{char.code}</span>
    </div>
  )
}

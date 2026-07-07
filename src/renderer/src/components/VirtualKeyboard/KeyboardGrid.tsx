import React, { memo } from 'react'

interface UnicodeChar {
  char: string
  name: string
  code: string
  category: string
  subcategory?: string
}

interface Props {
  chars: UnicodeChar[]
  favorites: string[]
  copiedCode: string | null
  onCharClick: (char: string) => void
  onCopy: (char: string) => void
  onToggleFavorite: (code: string) => void
  onCharHover: (char: UnicodeChar | null) => void
}

const CharKey = memo(function CharKey({
  entry, isFav, isCopied, onClick, onCopy, onToggleFavorite, onEnter, onLeave
}: {
  entry: UnicodeChar
  isFav: boolean
  isCopied: boolean
  onClick: () => void
  onCopy: (e: React.MouseEvent) => void
  onToggleFavorite: () => void
  onEnter: () => void
  onLeave: () => void
}) {
  return (
    <button
      className={`vk-key${isCopied ? ' vk-key-copied' : ''}${isFav ? ' vk-key-fav' : ''}`}
      onClick={onClick}
      onContextMenu={onCopy}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      title={`${entry.name} (${entry.code})\nClick: insert · Right-click: copy · ★: favorite`}
    >
      <span className="vk-key-char">{entry.char}</span>
      <button
        className="vk-key-star"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
        tabIndex={-1}
      >
        {isFav ? '\u2605' : '\u2606'}
      </button>
      {isCopied && <span className="vk-key-check">\u2713</span>}
    </button>
  )
})

export default memo(function KeyboardGrid({ chars, favorites, copiedCode, onCharClick, onCopy, onToggleFavorite, onCharHover }: Props) {
  if (chars.length === 0) {
    return <div className="vk-grid-empty">No characters found</div>
  }
  return (
    <div className="vk-grid">
      {chars.map((c) => (
        <CharKey
          key={c.code}
          entry={c}
          isFav={favorites.includes(c.code)}
          isCopied={copiedCode === c.code}
          onClick={() => onCharClick(c.char)}
          onCopy={(e) => { e.preventDefault(); onCopy(c.char) }}
          onToggleFavorite={() => onToggleFavorite(c.code)}
          onEnter={() => onCharHover(c)}
          onLeave={() => onCharHover(null)}
        />
      ))}
    </div>
  )
})

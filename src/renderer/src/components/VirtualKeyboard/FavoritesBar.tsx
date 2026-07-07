import React, { memo } from 'react'

interface UnicodeChar {
  char: string
  name: string
  code: string
  category: string
}

interface Props {
  favorites: UnicodeChar[]
  onCharClick: (char: string) => void
  onRemoveFavorite: (code: string) => void
}

export default memo(function FavoritesBar({ favorites, onCharClick, onRemoveFavorite }: Props) {
  if (favorites.length === 0) return null
  return (
    <div className="vk-favs">
      <span className="vk-favs-label">Favorites</span>
      <div className="vk-favs-list">
        {favorites.map((c) => (
          <button
            key={c.code}
            className="vk-fav-cell"
            onClick={() => onCharClick(c.char)}
            title={c.name}
            onContextMenu={(e) => {
              e.preventDefault()
              onRemoveFavorite(c.code)
            }}
          >
            {c.char}
          </button>
        ))}
      </div>
    </div>
  )
})

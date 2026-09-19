import React from 'react';

export const FavoritesBar: React.FC<{
  favorites: string[];
  onInsert: (char: string) => void;
  onRemove: (code: string) => void;
}> = ({ favorites, onInsert, onRemove }) => {
  if (favorites.length === 0) return null;

  return (
    <div className="vk-favorites-bar">
      <span className="vk-fav-label">Favorites:</span>
      <div className="vk-fav-list">
        {favorites.map((code) => {
          const char = String.fromCodePoint(parseInt(code.replace('U+', ''), 16));
          return (
            <button
              key={code}
              className="vk-fav-chip"
              onClick={() => onInsert(char)}
              onContextMenu={(e) => {
                e.preventDefault();
                onRemove(code);
              }}
              title={`${char} (${code}) - Right click to remove`}
            >
              {char}
            </button>
          );
        })}
      </div>
    </div>
  );
};

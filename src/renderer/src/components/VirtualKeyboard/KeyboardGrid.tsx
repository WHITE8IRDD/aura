import React from 'react';

interface KeyboardGridProps {
  chars: any[];
  favorites: string[];
  onInsert: (char: string) => void;
  onToggleFavorite: (code: string) => void;
  onHoverChar: (char: any) => void;
}

export const KeyboardGrid: React.FC<KeyboardGridProps> = ({
  chars,
  favorites,
  onInsert,
  onToggleFavorite,
  onHoverChar,
}) => {
  return (
    <div className="vk-grid">
      {chars.map((item) => {
        const isFav = favorites.includes(item.code);
        return (
          <div
            key={item.code}
            className="vk-grid-cell"
            onClick={() => onInsert(item.char)}
            onContextMenu={(e) => {
              e.preventDefault();
              window.aura.keyboard.copy(item.char);
            }}
            onMouseEnter={() => onHoverChar(item)}
          >
            <span className="vk-char">{item.char}</span>
            <button
              className={`vk-fav-btn ${isFav ? 'fav' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.code);
              }}
              title={isFav ? 'Remove Favorite' : 'Add Favorite'}
            >
              {isFav ? '★' : '☆'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

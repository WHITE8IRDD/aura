import React from 'react';

export const SearchBar: React.FC<{
  query: string;
  onSearch: (q: string) => void;
}> = ({ query, onSearch }) => {
  return (
    <div className="vk-search-wrapper">
      <span className="vk-search-icon">🔍</span>
      <input
        type="text"
        className="vk-search-input"
        placeholder="Search symbols..."
        value={query}
        onChange={(e) => onSearch(e.target.value)}
      />
      {query && (
        <button className="vk-search-clear" onClick={() => onSearch('')}>
          ✕
        </button>
      )}
    </div>
  );
};

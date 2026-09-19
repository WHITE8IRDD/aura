import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { CategoryTabs } from './CategoryTabs';
import { FavoritesBar } from './FavoritesBar';
import { KeyboardGrid } from './KeyboardGrid';
import { CharacterDetail } from './CharacterDetail';

export const SymbolsPanel: React.FC<{ onInserted: (char: string) => void }> = ({ onInserted }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('common');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [chars, setChars] = useState<any[]>([]);
  const [hoveredChar, setHoveredChar] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.aura.keyboard.getCategories().then(setCategories);
    window.aura.keyboard.getFavorites().then(setFavorites);
    loadCategory('common');
  }, []);

  const loadCategory = (catId: string) => {
    setActiveCategory(catId);
    setSearchQuery('');
    window.aura.keyboard.getCategory(catId).then(setChars);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadCategory(activeCategory);
    } else {
      window.aura.keyboard.search(query).then(setChars);
    }
  };

  const toggleFavorite = async (code: string) => {
    if (favorites.includes(code)) {
      const updated = await window.aura.keyboard.removeFavorite(code);
      setFavorites(updated);
    } else {
      const updated = await window.aura.keyboard.addFavorite(code);
      setFavorites(updated);
    }
  };

  const handleInsert = (char: string) => {
    window.aura.keyboard.insert(char);
    onInserted(char);
  };

  return (
    <div className="vk-symbols-container">
      {/* Top Search & Category Navigation */}
      <div className="vk-top-bar">
        <SearchBar query={searchQuery} onSearch={handleSearch} />
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={loadCategory}
        />
      </div>

      {/* Favorites Quick Bar */}
      <FavoritesBar
        favorites={favorites}
        onInsert={handleInsert}
        onRemove={(code) => toggleFavorite(code)}
      />

      {/* Main Grid */}
      <KeyboardGrid
        chars={chars}
        favorites={favorites}
        onInsert={handleInsert}
        onToggleFavorite={toggleFavorite}
        onHoverChar={setHoveredChar}
      />

      {/* Character Info Footer */}
      <CharacterDetail item={hoveredChar} />
    </div>
  );
};

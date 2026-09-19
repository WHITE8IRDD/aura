import React from 'react';

export const CategoryTabs: React.FC<{
  categories: any[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}> = ({ categories, activeCategory, onSelectCategory }) => {
  return (
    <div className="vk-category-tabs">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`vk-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
          onClick={() => onSelectCategory(cat.id)}
          title={cat.name}
        >
          <span className="vk-cat-icon">{cat.icon}</span>
          <span className="vk-cat-name">{cat.name}</span>
        </button>
      ))}
    </div>
  );
};

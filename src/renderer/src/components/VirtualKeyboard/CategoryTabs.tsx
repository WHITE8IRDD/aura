import React, { memo } from 'react'

interface Category {
  id: string
  label: string
}

interface Props {
  categories: Category[]
  active: string
  onSelect: (id: string) => void
}

export default memo(function CategoryTabs({ categories, active, onSelect }: Props) {
  return (
    <div className="vk-cats">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`vk-cat-btn${active === cat.id ? ' vk-cat-active' : ''}`}
          onClick={() => onSelect(cat.id)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
})

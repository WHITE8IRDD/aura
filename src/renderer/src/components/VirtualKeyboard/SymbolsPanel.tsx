import React, { useState, useEffect, useCallback } from 'react'
import SearchBar from './SearchBar'
import CategoryTabs from './CategoryTabs'
import KeyboardGrid from './KeyboardGrid'
import FavoritesBar from './FavoritesBar'
import CharacterDetail from './CharacterDetail'

interface UnicodeChar {
  char: string
  name: string
  code: string
  category: string
  subcategory?: string
}

interface Category {
  id: string
  label: string
}

interface Props {
  onCharUsed: (label: string) => void
}

export function SymbolsPanel({ onCharUsed }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState('common')
  const [chars, setChars] = useState<UnicodeChar[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnicodeChar[]>([])
  const [favorites, setFavorites] = useState<UnicodeChar[]>([])
  const [favCodes, setFavCodes] = useState<string[]>([])
  const [hoveredChar, setHoveredChar] = useState<UnicodeChar | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const refreshFavs = useCallback(() => {
    window.aura.keyboard.getFavorites().then((favs) => {
      setFavorites(favs)
      setFavCodes(favs.map((f: UnicodeChar) => f.code))
    })
  }, [])

  useEffect(() => {
    window.aura.keyboard.getCategories().then(setCategories)
    refreshFavs()
    loadCategory('common')
  }, [])

  const loadCategory = useCallback(async (catId: string) => {
    const result = await window.aura.keyboard.getCategory(catId)
    setChars(result)
    setSearchResults([])
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      loadCategory(activeCategory)
      return
    }
    const results = await window.aura.keyboard.search(query)
    setSearchResults(results)
  }, [activeCategory, loadCategory])

  const handleCategorySelect = useCallback((catId: string) => {
    setActiveCategory(catId)
    setSearchQuery('')
    loadCategory(catId)
  }, [loadCategory])

  const handleCharClick = useCallback(async (char: string) => {
    await window.aura.keyboard.insert(char)
    onCharUsed(char)
  }, [onCharUsed])

  const handleCopy = useCallback(async (char: string) => {
    await window.aura.keyboard.copy(char)
    const entry = chars.find(c => c.char === char) ?? searchResults.find(c => c.char === char)
    if (entry) {
      setCopiedCode(entry.code)
      setTimeout(() => setCopiedCode(null), 800)
    }
    onCharUsed(char)
  }, [chars, searchResults, onCharUsed])

  const handleToggleFavorite = useCallback((code: string) => {
    const isFav = favCodes.includes(code)
    if (isFav) {
      window.aura.keyboard.removeFavorite(code).then(refreshFavs)
    } else {
      window.aura.keyboard.addFavorite(code).then(refreshFavs)
    }
  }, [favCodes, refreshFavs])

  const handleRemoveFavorite = useCallback((code: string) => {
    window.aura.keyboard.removeFavorite(code).then(refreshFavs)
  }, [refreshFavs])

  const displayChars = searchQuery.trim() ? searchResults : chars

  return (
    <div className="ak-symbols">
      <div className="ak-search">
        <SearchBar value={searchQuery} onChange={handleSearch} />
      </div>
      <div className="ak-favorites">
        <FavoritesBar
          favorites={favorites}
          onCharClick={handleCharClick}
          onRemoveFavorite={handleRemoveFavorite}
        />
      </div>
      <div className="ak-tabs-wrapper">
        <CategoryTabs
          categories={categories}
          active={searchQuery.trim() ? '' : activeCategory}
          onSelect={handleCategorySelect}
        />
      </div>
      <div className="ak-grid-scroll">
        <KeyboardGrid
          chars={displayChars}
          favorites={favCodes}
          copiedCode={copiedCode}
          onCharClick={handleCharClick}
          onCopy={handleCopy}
          onToggleFavorite={handleToggleFavorite}
          onCharHover={setHoveredChar}
        />
      </div>
      <div className="ak-status">
        <CharacterDetail char={hoveredChar} />
      </div>
    </div>
  )
}

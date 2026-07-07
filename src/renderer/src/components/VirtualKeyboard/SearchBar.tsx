import React, { useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div className="vk-search-wrap">
      <svg className="vk-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        ref={ref}
        className="vk-search"
        type="text"
        placeholder="Search characters..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="vk-search-clear" onClick={() => onChange('')}>
          &times;
        </button>
      )}
    </div>
  )
}

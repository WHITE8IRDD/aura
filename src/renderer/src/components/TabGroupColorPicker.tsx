import React from 'react'

export const GROUP_COLORS = [
  { name: 'Blue',   value: '#A6C0F1' },
  { name: 'Purple', value: '#C6A5F1' },
  { name: 'Green',  value: '#A6F1C9' },
  { name: 'Cyan',   value: '#ABD5E9' },
  { name: 'Pink',   value: '#F1A5D6' },
  { name: 'Orange', value: '#F1C6A5' },
  { name: 'Red',    value: '#F1A5A5' },
  { name: 'Yellow', value: '#F1E9A5' }
]

interface Props {
  selected: string
  onSelect: (color: string) => void
}

export default function TabGroupColorPicker({ selected, onSelect }: Props): React.ReactElement {
  return (
    <div className="group-color-picker">
      {GROUP_COLORS.map((c) => (
        <button
          key={c.value}
          className={`group-color-dot${selected === c.value ? ' selected' : ''}`}
          style={{ background: c.value }}
          title={c.name}
          onClick={() => onSelect(c.value)}
        />
      ))}
    </div>
  )
}

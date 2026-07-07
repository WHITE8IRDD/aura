import React, { useState, useEffect, useCallback } from 'react'

interface KeyDef {
  label: string
  value: string
  code?: string
  width?: number
  isModifier?: boolean
}

interface LayoutData {
  functionRow: KeyDef[]
  numberRow: KeyDef[]
  qwertyRows: KeyDef[][]
  bottomRow: KeyDef[]
  arrowCluster: KeyDef[]
}

const SHIFTED_NUMBERS: Record<string, string> = {
  '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^',
  '7': '&', '8': '*', '9': '(', '0': ')', '-': '_', '=': '+',
  '[': '{', ']': '}', '\\': '|', ';': ':', '\'': '"', ',': '<', '.': '>', '/': '?',
}

interface Props {
  onKeyTyped: (label: string) => void
}

export function KeysPanel({ onKeyTyped }: Props) {
  const [layout, setLayout] = useState<LayoutData | null>(null)
  const [shifted, setShifted] = useState(false)

  useEffect(() => {
    window.aura.keyboard.getLayout().then(setLayout)
  }, [])

  const handleKey = useCallback((key: KeyDef) => {
    if (key.isModifier) return
    const val = shifted && SHIFTED_NUMBERS[key.value] ? SHIFTED_NUMBERS[key.value] : key.value
    const code = key.code
    if (code) {
      window.aura.keyboard.sendKey(code)
    } else if (val) {
      window.aura.keyboard.type(val)
    }
    if (shifted && val.match(/[a-zA-Z]/)) setShifted(false)
    onKeyTyped(key.label)
  }, [shifted, onKeyTyped])

  const handleShift = useCallback(() => {
    setShifted(s => !s)
  }, [])

  if (!layout) return <div className="ak-keys" />

  const widthClass = (w?: number): string => {
    if (!w || w <= 1) return ''
    if (w >= 5) return ' ak-key-wide-5'
    if (w >= 1.3) return ' ak-key-wide-1_4'
    return ''
  }

  const renderRow = (row: KeyDef[], keyPrefix: string) => (
    <div className="ak-row" key={keyPrefix}>
      {row.map((k, i) => (
        <button
          key={`${keyPrefix}-${i}`}
          className={`ak-key${widthClass(k.width)}${k.code === 'Escape' ? ' ak-key-fn' : ''}`}
          onClick={() => handleKey(k)}
        >
          {k.label}
        </button>
      ))}
    </div>
  )

  const renderQwertyRow = (row: KeyDef[], rowIndex: number) => (
    <div className="ak-row" key={`q-${rowIndex}`}>
      {rowIndex === 1 && <button className="ak-key ak-key-fn" style={{ flex: 1.2 }} onClick={() => {/* no-op */}}>&nbsp;</button>}
      {row.map((k, i) => (
        <button
          key={`q-${rowIndex}-${i}`}
          className={`ak-key${widthClass(k.width)}`}
          onClick={() => handleKey(shifted && k.value.match(/[a-z]/) ? { ...k, value: k.value.toUpperCase() } : k)}
        >
          {shifted && k.value.match(/[a-z]/) ? k.value.toUpperCase() : k.label}
        </button>
      ))}
      {rowIndex === 1 && (
        <button
          className={`ak-key ak-key-fn${shifted ? ' ak-key-modifier-active' : ''}`}
          style={{ flex: 1.4 }}
          onClick={handleShift}
        >
          Shift
        </button>
      )}
    </div>
  )

  return (
    <div className="ak-keys">
      {renderRow(layout.functionRow, 'fn')}
      {renderRow(layout.numberRow, 'num')}
      {layout.qwertyRows.map((row, ri) => renderQwertyRow(row, ri))}
      <div className="ak-row">
        <button
          className={`ak-key ak-key-fn${shifted ? ' ak-key-modifier-active' : ''}`}
          style={{ flex: 1.2 }}
          onClick={handleShift}
        >
          Shift
        </button>
        {renderRow(layout.bottomRow, 'bottom')}
      </div>
      <div className="ak-row">
        {layout.arrowCluster.map((k, i) => (
          <button
            key={`arrow-${i}`}
            className="ak-key ak-key-fn"
            onClick={() => handleKey(k)}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}

import React, { type ReactNode } from 'react'

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}
export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className={`sett-toggle${disabled ? ' disabled' : ''}`}>
      <div className="sett-toggle-body">
        <div className="sett-toggle-label">{label}</div>
        {description && <div className="sett-toggle-desc">{description}</div>}
      </div>
      <div className={`sett-toggle-switch${checked ? ' on' : ''}`}>
        <input type="checkbox" checked={checked} disabled={disabled}
          onChange={(e) => onChange(e.target.checked)} />
        <span className="sett-toggle-knob" />
      </div>
    </label>
  )
}

interface RadioGroupProps {
  label: string
  description?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}
export function RadioGroup({ label, description, value, options, onChange }: RadioGroupProps) {
  return (
    <div className="sett-field">
      <div className="sett-field-label">{label}</div>
      {description && <div className="sett-field-desc">{description}</div>}
      <div className="sett-radio-group">
        {options.map((o) => (
          <label key={o.value} className={`sett-radio${value === o.value ? ' active' : ''}`}
            onClick={() => onChange(o.value)}>
            <div className="sett-radio-dot">
              {value === o.value && <div className="sett-radio-fill" />}
            </div>
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

interface SelectProps {
  label: string
  description?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}
export function Select({ label, description, value, options, onChange }: SelectProps) {
  return (
    <div className="sett-field">
      <div className="sett-field-label">{label}</div>
      {description && <div className="sett-field-desc">{description}</div>}
      <div className="sett-select-wrap">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

interface SliderProps {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}
export function Slider({ label, description, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div className="sett-field">
      <div className="sett-field-row">
        <div>
          <div className="sett-field-label">{label}</div>
          {description && <div className="sett-field-desc">{description}</div>}
        </div>
        <div className="sett-slider-value">{value}{unit ?? ''}</div>
      </div>
      <input type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

interface ButtonProps {
  label: string
  description?: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  icon?: ReactNode
}
export function Button({ label, description, onClick, disabled, variant, icon }: ButtonProps) {
  return (
    <div className="sett-field">
      {description && <div className="sett-field-desc">{description}</div>}
      <button className={`sett-btn${variant === 'danger' ? ' danger' : ''}`}
        onClick={onClick} disabled={disabled}>
        {icon && <span className="sett-btn-icon">{icon}</span>}
        {label}
      </button>
    </div>
  )
}

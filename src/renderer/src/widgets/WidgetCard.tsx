import React from 'react'

interface Props {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  loading?: boolean
  size: 1 | 2 | 3
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  children: React.ReactNode
}

export default function WidgetCard({
  title,
  subtitle,
  icon,
  action,
  loading,
  size,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children
}: Props): React.ReactElement {
  return (
    <div
      className={`widget widget-size-${size}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="widget-header">
        <div className="widget-title-group">
          {icon && <span className="widget-icon">{icon}</span>}
          <div>
            <div className="widget-title">{title}</div>
            {subtitle && <div className="widget-subtitle">{subtitle}</div>}
          </div>
        </div>
        {action && <div className="widget-action">{action}</div>}
      </div>

      <div className="widget-body">
        {loading ? <div className="widget-loading">Loading&hellip;</div> : children}
      </div>
    </div>
  )
}

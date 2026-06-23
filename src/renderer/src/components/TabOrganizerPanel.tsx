import React, { useState } from 'react'
import { TabState } from '../types'
import type { TabGroupData } from './VerticalTabGroup'

interface TabOrganizerPanelProps {
  groups: TabGroupData[]
  tabs: TabState[]
  onClose: () => void
  onCreateGroup: () => Promise<string | null>
  onRenameGroup: (groupId: string, name: string) => void
  onChangeGroupColor: (groupId: string, color: string) => void
  onDeleteGroup: (groupId: string) => void
  onRemoveTabFromGroup: (tabId: number) => void
  onSelectTab: (tabId: number) => void
}

const GROUP_COLORS = [
  '#9ca3af', '#3b82f6', '#ef4444', '#eab308',
  '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'
]

export function TabOrganizerPanel({
  groups,
  tabs,
  onClose,
  onCreateGroup,
  onRenameGroup,
  onChangeGroupColor,
  onDeleteGroup,
  onRemoveTabFromGroup,
  onSelectTab
}: TabOrganizerPanelProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<Record<string, string>>({})

  const handleCreate = async () => {
    const newId = await onCreateGroup()
    if (newId) {
      setExpandedGroupId(newId)
      setEditingName(prev => ({ ...prev, [newId]: '' }))
    }
  }

  const handleNameChange = (groupId: string, value: string) => {
    setEditingName(prev => ({ ...prev, [groupId]: value }))
  }

  const handleNameBlur = (groupId: string) => {
    const value = editingName[groupId]
    if (value !== undefined) {
      onRenameGroup(groupId, value)
      setEditingName(prev => {
        const next = { ...prev }
        delete next[groupId]
        return next
      })
    }
  }

  const handleNameKey = (e: React.KeyboardEvent<HTMLInputElement>, groupId: string) => {
    if (e.key === 'Enter') {
      handleNameBlur(groupId)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="tab-organizer-panel">
      <div className="tab-organizer-header">
        <h3 className="tab-organizer-title">Tab organizer</h3>
        <button
          className="tab-organizer-close"
          onClick={onClose}
          title="Close"
        >
          ×
        </button>
      </div>

      <button
        className="tab-organizer-create-btn"
        onClick={handleCreate}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 5 V11 M5 8 H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span>Create new tab group</span>
      </button>

      <div className="tab-organizer-list">
        {groups.map(group => {
          const isExpanded = expandedGroupId === group.id
          const groupTabs = tabs.filter(t => group.tabIds.includes(t.id))
          const nameValue = editingName[group.id] !== undefined
            ? editingName[group.id]
            : group.name

          return (
            <div
              key={group.id}
              className={`tab-organizer-group ${isExpanded ? 'tab-organizer-group-expanded' : ''}`}
            >
              <button
                className="tab-organizer-group-row"
                onClick={() => setExpandedGroupId(prev => prev === group.id ? null : group.id)}
              >
                <div
                  className="tab-organizer-dot"
                  style={{ background: group.color }}
                />
                <span className="tab-organizer-group-label">
                  {group.name || `${group.tabIds.length} tab${group.tabIds.length !== 1 ? 's' : ''}`}
                </span>
                {group.name && (
                  <span className="tab-organizer-group-count">
                    {group.tabIds.length}
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="tab-organizer-group-detail">
                  <input
                    className="tab-organizer-name-input"
                    type="text"
                    placeholder="Name this group"
                    value={nameValue}
                    onChange={(e) => handleNameChange(group.id, e.target.value)}
                    onBlur={() => handleNameBlur(group.id)}
                    onKeyDown={(e) => handleNameKey(e, group.id)}
                    autoFocus
                  />

                  <div className="tab-organizer-color-swatches">
                    {GROUP_COLORS.map(color => (
                      <button
                        key={color}
                        className={`tab-organizer-color-swatch ${group.color === color ? 'tab-organizer-color-active' : ''}`}
                        style={{ background: color }}
                        onClick={() => onChangeGroupColor(group.id, color)}
                      />
                    ))}
                  </div>

                  {groupTabs.length > 0 && (
                    <div className="tab-organizer-group-tabs">
                      {groupTabs.map(tab => (
                        <div key={tab.id} className="tab-organizer-tab-row">
                          <button
                            className="tab-organizer-tab-main"
                            onClick={() => onSelectTab(tab.id)}
                          >
                            {tab.favicon && (
                              <img src={tab.favicon} alt="" width="14" height="14" />
                            )}
                            <span>{tab.title || tab.url}</span>
                          </button>
                          <button
                            className="tab-organizer-tab-remove"
                            onClick={() => onRemoveTabFromGroup(tab.id)}
                            title="Remove from group"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="tab-organizer-delete-btn"
                    onClick={() => onDeleteGroup(group.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 4 H11 M5 4 V11 M9 4 V11 M4 4 V2 H10 V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Delete group</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {groups.length === 0 && (
          <div className="tab-organizer-empty">
            No tab groups yet. Click above to create one.
          </div>
        )}
      </div>
    </div>
  )
}

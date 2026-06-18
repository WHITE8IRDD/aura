import React, { useEffect, useRef, useState } from 'react'
import type { BookmarkFolder } from '../types'

interface Props {
  url: string
  initialTitle: string
  anchorRect: DOMRect | null
  existingBookmarkId: number | null
  onSaved: () => void
  onRemoved: () => void
  onClose: () => void
}

export default function BookmarkDialog({
  url, initialTitle, anchorRect, existingBookmarkId,
  onSaved, onRemoved, onClose
}: Props): React.ReactElement {
  const [name, setName] = useState(initialTitle)
  const [folderId, setFolderId] = useState<number | null>(null)
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.aura.bookmarks.listFolders().then(setFolders)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
        if (e.target === inputRef.current) handleSave()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (): Promise<void> => {
    const finalName = name.trim() || url
    if (existingBookmarkId !== null) {
      await window.aura.bookmarks.update(existingBookmarkId, { title: finalName, folderId })
    } else {
      await window.aura.bookmarks.add(url, finalName, folderId)
    }
    onSaved()
    onClose()
  }

  const handleRemove = async (): Promise<void> => {
    if (existingBookmarkId !== null) {
      await window.aura.bookmarks.delete(existingBookmarkId)
      onRemoved()
    }
    onClose()
  }

  const handleCreateFolder = async (): Promise<void> => {
    const trimmed = newFolderName.trim()
    if (!trimmed) return
    const folder = await window.aura.bookmarks.addFolder(trimmed)
    setFolders((prev) => [...prev, folder])
    setFolderId(folder.id)
    setCreatingFolder(false)
    setNewFolderName('')
  }

  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.bottom + 8,
        right: Math.max(20, window.innerWidth - anchorRect.right - 100),
        zIndex: 9999
      }
    : { position: 'fixed', top: 100, right: 40, zIndex: 9999 }

  return (
    <div ref={ref} className="bookmark-dialog" style={style}>
      <div className="bookmark-dialog-title">
        {existingBookmarkId !== null ? 'Edit bookmark' : 'Add bookmark'}
      </div>

      <label className="bookmark-dialog-label">Name</label>
      <input
        ref={inputRef}
        type="text"
        className="bookmark-dialog-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Bookmark name"
      />

      <label className="bookmark-dialog-label">Folder</label>
      {!creatingFolder ? (
        <div className="bookmark-dialog-folder-row">
          <select
            className="bookmark-dialog-select"
            value={folderId === null ? '' : String(folderId)}
            onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All Bookmarks</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="bookmark-dialog-newfolder"
            onClick={() => setCreatingFolder(true)}
            title="New folder"
          >+</button>
        </div>
      ) : (
        <div className="bookmark-dialog-folder-row">
          <input
            type="text"
            className="bookmark-dialog-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateFolder() }}
          />
          <button type="button" className="bookmark-dialog-newfolder"
            onClick={handleCreateFolder}>✓</button>
          <button type="button" className="bookmark-dialog-newfolder"
            onClick={() => setCreatingFolder(false)}>×</button>
        </div>
      )}

      <div className="bookmark-dialog-actions">
        {existingBookmarkId !== null && (
          <button
            className="bookmark-dialog-btn danger"
            onClick={handleRemove}
          >Remove</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="bookmark-dialog-btn" onClick={onClose}>Cancel</button>
        <button className="bookmark-dialog-btn primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  )
}

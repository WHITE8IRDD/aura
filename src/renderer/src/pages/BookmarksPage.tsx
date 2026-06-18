import React, { useEffect, useState } from 'react'
import { IconBookmark, IconClose, IconPlus } from '../components/Icons'
import type { Bookmark, BookmarkFolder } from '../types'

interface Props {
  onNavigate: (url: string) => void
}

export default function BookmarksPage({ onNavigate }: Props): React.ReactElement {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const load = (): void => {
    window.aura.bookmarks.list(activeFolderId).then(setBookmarks)
    window.aura.bookmarks.listFolders().then(setFolders)
  }

  useEffect(load, [activeFolderId])

  const handleAdd = async (): Promise<void> => {
    const url = newUrl.trim()
    if (!url) return
    await window.aura.bookmarks.add(url, newTitle.trim() || url, activeFolderId)
    setNewUrl('')
    setNewTitle('')
    setAdding(false)
    load()
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.aura.bookmarks.delete(id)
    load()
  }

  const handleAddFolder = async (): Promise<void> => {
    const name = prompt('Folder name:')?.trim()
    if (!name) return
    await window.aura.bookmarks.addFolder(name)
    load()
  }

  return (
    <div className="data-page">
      <header className="data-header">
        <div className="data-header-title">
          <IconBookmark size={24} />
          <div>
            <h1>Bookmarks</h1>
            <p>{bookmarks.length} saved</p>
          </div>
        </div>
        <div className="data-header-actions">
          <button className="data-btn" onClick={() => setAdding((v) => !v)}>
            <IconPlus size={13} /> Add bookmark
          </button>
          <button className="data-btn" onClick={handleAddFolder}>
            <IconPlus size={13} /> New folder
          </button>
        </div>
      </header>

      {folders.length > 0 && (
        <div className="folder-pills">
          <button
            className={`folder-pill${activeFolderId === null ? ' active' : ''}`}
            onClick={() => setActiveFolderId(null)}
          >
            All
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={`folder-pill${activeFolderId === f.id ? ' active' : ''}`}
              onClick={() => setActiveFolderId(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {adding && (
        <div className="data-add-row">
          <input
            type="text"
            placeholder="https://example.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder="Title (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button className="data-btn primary" onClick={handleAdd}>Save</button>
          <button className="data-btn" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}

      <div className="data-list">
        {bookmarks.length === 0 ? (
          <div className="data-empty">No bookmarks here yet. Click "Add bookmark" above.</div>
        ) : (
          bookmarks.map((b) => (
            <div key={b.id} className="data-row">
              <button className="data-row-main" onClick={() => onNavigate(b.url)}>
                <div className="data-row-title">{b.title}</div>
                <div className="data-row-meta">
                  <span>{b.url}</span>
                </div>
              </button>
              <button className="data-row-delete" onClick={() => handleDelete(b.id)} title="Delete">
                <IconClose size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

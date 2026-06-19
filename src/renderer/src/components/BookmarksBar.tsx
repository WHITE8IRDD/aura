import React, { useCallback, useEffect, useState } from 'react'
import type { Bookmark } from '../types'
import BookmarkBarItem from './BookmarkBarItem'
import BookmarkContextMenu, { type BookmarkMenuItem } from './BookmarkContextMenu'
import { IconBookmark } from './Icons'
import { showToolbarMenu } from '../lib/showToolbarMenu'

interface ToolbarMenuHandlers {
  bookmarksBarVisible: boolean
  sidebarVisible: boolean
  onToggleBookmarksBar: () => void
  onToggleSidebar: () => void
  onOpenSettings: () => void
}

interface Props {
  visible: boolean
  onNavigate: (url: string) => void
  onOpenBookmarksPage: () => void
  onToggleVisible: () => void
  toolbarMenuHandlers: ToolbarMenuHandlers
}

interface ContextMenuState {
  x: number
  y: number
  items: BookmarkMenuItem[]
}

export default function BookmarksBar({
  visible, onNavigate, onOpenBookmarksPage, onToggleVisible, toolbarMenuHandlers
}: Props): React.ReactElement | null {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null)
  const [clipboardId, setClipboardId] = useState<number | null>(null)
  const [clipboardMode, setClipboardMode] = useState<'cut' | 'copy' | null>(null)

  const load = (): void => {
    window.aura.bookmarks.listBar().then(setBookmarks).catch(() => {})
  }

  useEffect(() => {
    load()
    return window.aura.bookmarks.onUpdate(load)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, bookmark: Bookmark) => {
    setDraggingId(bookmark.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(bookmark.id))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, bookmark: Bookmark) => {
    if (draggingId === null || draggingId === bookmark.id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(bookmark.id)
  }, [draggingId])

  const handleDragLeave = useCallback((_e: React.DragEvent) => {
    setDropTargetId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, target: Bookmark) => {
    e.preventDefault()
    if (draggingId === null || draggingId === target.id) {
      setDraggingId(null)
      setDropTargetId(null)
      return
    }

    const fromIdx = bookmarks.findIndex((b) => b.id === draggingId)
    const toIdx = bookmarks.findIndex((b) => b.id === target.id)
    if (fromIdx === -1 || toIdx === -1) return

    const next = [...bookmarks]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)

    setBookmarks(next)
    setDraggingId(null)
    setDropTargetId(null)

    void window.aura.bookmarks.reorder(next.map((b) => b.id))
  }, [draggingId, bookmarks])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDropTargetId(null)
  }, [])

  const handleItemContextMenu = useCallback((e: React.MouseEvent, bookmark: Bookmark) => {
    e.preventDefault()
    e.stopPropagation()

    const isSeparator = bookmark.url === 'aura://separator'

    const items: BookmarkMenuItem[] = isSeparator
      ? [
          { label: 'Delete Separator', danger: true, onClick: () =>
            window.aura.bookmarks.delete(bookmark.id) },
          { separator: true },
          { label: 'Add Bookmark\u2026', onClick: () => {
            const url = prompt('URL:')?.trim()
            if (!url) return
            const title = prompt('Name:', url)?.trim() ?? url
            void window.aura.bookmarks.add(url, title, null)
          }},
          { label: 'Add Folder\u2026', onClick: () => {
            const name = prompt('Folder name:')?.trim()
            if (name) void window.aura.bookmarks.addFolder(name)
          }},
          { label: 'Add Separator', onClick: () => {
            void window.aura.bookmarks.addSeparator(null)
          }},
          { separator: true },
          { label: 'Manage Bookmarks', onClick: onOpenBookmarksPage }
        ]
      : [
          {
            label: 'Open in New Tab',
            onClick: () => window.aura.tabs.create(bookmark.url)
          },
          {
            label: 'Open in New Window',
            onClick: () => window.aura.tabs.create(bookmark.url)
          },
          {
            label: 'Open in New Private Window',
            onClick: () => {
              void window.aura.ninja.launch()
            }
          },
          { separator: true },
          {
            label: 'Edit Bookmark\u2026',
            onClick: () => {
              const newTitle = prompt('Edit name:', bookmark.title)?.trim()
              if (newTitle && newTitle !== bookmark.title) {
                void window.aura.bookmarks.update(bookmark.id, { title: newTitle })
              }
            }
          },
          {
            label: 'Delete Bookmark',
            danger: true,
            onClick: () => window.aura.bookmarks.delete(bookmark.id)
          },
          { separator: true },
          {
            label: 'Cut',
            onClick: () => {
              setClipboardId(bookmark.id)
              setClipboardMode('cut')
            }
          },
          {
            label: 'Copy',
            onClick: () => {
              setClipboardId(bookmark.id)
              setClipboardMode('copy')
              navigator.clipboard?.writeText(bookmark.url).catch(() => {})
            }
          },
          {
            label: 'Paste',
            disabled: clipboardId === null,
            onClick: async () => {
              if (clipboardId === null) return
              const list = await window.aura.bookmarks.list()
              const src = list.find((b) => b.id === clipboardId)
              if (!src) return
              if (clipboardMode === 'cut') {
                const reordered = [...bookmarks]
                const fromIdx = reordered.findIndex((b) => b.id === src.id)
                const toIdx = reordered.findIndex((b) => b.id === bookmark.id)
                if (fromIdx >= 0 && toIdx >= 0) {
                  const [moved] = reordered.splice(fromIdx, 1)
                  reordered.splice(toIdx + 1, 0, moved)
                  void window.aura.bookmarks.reorder(reordered.map((b) => b.id))
                }
                setClipboardId(null)
                setClipboardMode(null)
              } else {
                void window.aura.bookmarks.add(src.url, src.title, null)
              }
            }
          },
          { separator: true },
          {
            label: 'Add Bookmark\u2026',
            onClick: () => {
              const url = prompt('URL:')?.trim()
              if (!url) return
              const title = prompt('Name:', url)?.trim() ?? url
              void window.aura.bookmarks.add(url, title, null)
            }
          },
          {
            label: 'Add Folder\u2026',
            onClick: () => {
              const name = prompt('Folder name:')?.trim()
              if (name) void window.aura.bookmarks.addFolder(name)
            }
          },
          {
            label: 'Add Separator',
            onClick: () => { void window.aura.bookmarks.addSeparator(null) }
          },
          { separator: true },
          {
            label: 'Bookmarks Toolbar',
            submenu: [
              {
                label: visible ? 'Hide Bookmarks Toolbar' : 'Show Bookmarks Toolbar',
                onClick: onToggleVisible,
                checked: visible
              }
            ]
          },
          { separator: true },
          {
            label: 'Manage Bookmarks',
            onClick: onOpenBookmarksPage
          }
        ]

    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }, [bookmarks, clipboardId, clipboardMode, onOpenBookmarksPage, onToggleVisible, visible])

  const handleBarContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const items: BookmarkMenuItem[] = [
      { label: 'Add Bookmark\u2026', onClick: () => {
        const url = prompt('URL:')?.trim()
        if (!url) return
        const title = prompt('Name:', url)?.trim() ?? url
        void window.aura.bookmarks.add(url, title, null)
      }},
      { label: 'Add Folder\u2026', onClick: () => {
        const name = prompt('Folder name:')?.trim()
        if (name) void window.aura.bookmarks.addFolder(name)
      }},
      { label: 'Add Separator', onClick: () => {
        void window.aura.bookmarks.addSeparator(null)
      }},
      { separator: true },
      {
        label: 'Bookmarks Toolbar',
        submenu: [
          {
            label: visible ? 'Hide Bookmarks Toolbar' : 'Show Bookmarks Toolbar',
            onClick: onToggleVisible,
            checked: visible
          }
        ]
      },
      { separator: true },
      { label: 'Manage Bookmarks', onClick: onOpenBookmarksPage }
    ]
    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }, [onOpenBookmarksPage, onToggleVisible, visible])

  if (!visible) return null
  if (bookmarks.length === 0) return null

  return (
    <div className="bookmarks-bar" onContextMenu={(e) => showToolbarMenu(e, toolbarMenuHandlers)}>
      <div className="bm-scroll">
        {bookmarks.map((b) => (
          <BookmarkBarItem
            key={b.id}
            bookmark={b}
            isDragging={draggingId === b.id}
            isDropTarget={dropTargetId === b.id && draggingId !== b.id}
            onNavigate={onNavigate}
            onContextMenu={handleItemContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      <button
        className="bm-manage-btn"
        onClick={onOpenBookmarksPage}
        title="Manage all bookmarks"
      >
        <IconBookmark size={13} />
      </button>

      {contextMenu && (
        <BookmarkContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export async function showToolbarMenu(
  e: React.MouseEvent,
  ctx: {
    bookmarksBarVisible: boolean
    sidebarVisible: boolean
    onToggleBookmarksBar: () => void
    onToggleSidebar: () => void
    onOpenSettings: () => void
  }
): Promise<void> {
  if (e.target !== e.currentTarget) return

  e.preventDefault()
  e.stopPropagation()

  const action = await window.aura.toolbarContextMenu.show({
    bookmarksBarVisible: ctx.bookmarksBarVisible,
    sidebarVisible: ctx.sidebarVisible
  })

  if (!action) return

  switch (action.type) {
    case 'toggle-bookmarks-bar':
      ctx.onToggleBookmarksBar()
      break
    case 'toggle-sidebar':
      ctx.onToggleSidebar()
      break
    case 'open-settings':
      ctx.onOpenSettings()
      break
  }
}

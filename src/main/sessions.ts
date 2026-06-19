import { getDb } from './db'

export interface SavedTab {
  url: string
  title: string | null
  pinned: boolean
  groupId: number | null
}

export function saveTabs(tabs: { url: string; title: string; pinned: boolean; active: boolean; order: number }[], windowId: number = 0): void {
  const db = getDb()
  const persistable = tabs.filter(t => {
    if (!t.url) return false
    if (t.url === 'aura://newtab') return false
    return /^https?:\/\//i.test(t.url)
  })

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM tab_sessions WHERE window_id = ?').run(windowId)
    const insert = db.prepare(`
      INSERT INTO tab_sessions (window_id, tab_order, url, title, pinned, group_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch())
    `)
    persistable.forEach((tab, index) => {
      insert.run(windowId, index, tab.url, tab.title ?? null, tab.pinned ? 1 : 0, null)
    })
  })
  tx()
}

export function loadTabs(windowId: number = 0): SavedTab[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT url, title, pinned, group_id as groupId
    FROM tab_sessions
    WHERE window_id = ?
    ORDER BY pinned DESC, tab_order ASC
  `).all(windowId) as Array<{
    url: string
    title: string | null
    pinned: number
    groupId: number | null
  }>

  return rows.map(r => ({
    url: r.url,
    title: r.title,
    pinned: r.pinned === 1,
    groupId: r.groupId
  }))
}

export function loadPinnedTabsOnly(windowId: number = 0): SavedTab[] {
  return loadTabs(windowId).filter(t => t.pinned)
}

/**
 * In-memory tab group manager. Stage 10 migrates to SQLite.
 *
 * A group is just a color + name + ordered list of tab IDs.
 * Tabs that aren't in any group are "ungrouped".
 */

export interface TabGroup {
  id: string
  name: string
  color: string // hex
  collapsed: boolean
  tabIds: number[]
}

const groups = new Map<string, TabGroup>()
let nextGroupNum = 1

export function createGroup(name: string, color: string): TabGroup {
  const id = `g-${Date.now()}-${nextGroupNum++}`
  const group: TabGroup = {
    id,
    name: name || `Group ${nextGroupNum}`,
    color,
    collapsed: false,
    tabIds: []
  }
  groups.set(id, group)
  return group
}

export function deleteGroup(id: string): void {
  groups.delete(id)
}

export function renameGroup(id: string, name: string): void {
  const g = groups.get(id)
  if (g) g.name = name
}

export function setGroupColor(id: string, color: string): void {
  const g = groups.get(id)
  if (g) g.color = color
}

export function toggleCollapsed(id: string): void {
  const g = groups.get(id)
  if (g) g.collapsed = !g.collapsed
}

export function addTabToGroup(groupId: string, tabId: number): void {
  const g = groups.get(groupId)
  if (!g) return
  // Remove from any other group first
  removeTabFromAnyGroup(tabId)
  if (!g.tabIds.includes(tabId)) g.tabIds.push(tabId)
}

export function removeTabFromAnyGroup(tabId: number): void {
  for (const g of groups.values()) {
    g.tabIds = g.tabIds.filter((id) => id !== tabId)
  }
}

export function getGroupForTab(tabId: number): TabGroup | null {
  for (const g of groups.values()) {
    if (g.tabIds.includes(tabId)) return g
  }
  return null
}

export function listGroups(): TabGroup[] {
  return Array.from(groups.values())
}

export function snapshot(): { groups: TabGroup[]; tabGroupMap: Record<number, string> } {
  const tabGroupMap: Record<number, string> = {}
  const groupList: TabGroup[] = []
  for (const g of groups.values()) {
    groupList.push({ ...g, tabIds: [...g.tabIds] })
    for (const tid of g.tabIds) tabGroupMap[tid] = g.id
  }
  return { groups: groupList, tabGroupMap }
}

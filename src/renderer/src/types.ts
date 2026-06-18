import type { AuraApi } from '../../preload/index'

declare global {
  interface Window {
    aura: AuraApi
  }
}

export interface TabState {
  id: number
  url: string
  title: string
  favicon: string | null
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  internal: boolean
}

export interface HistoryEntry {
  url: string
  title: string
  visitedAt: number
  visitCount: number
}

export interface Suggestion {
  type: 'history' | 'search' | 'url'
  label: string
  hint?: string
  url: string
  favicon?: string
}

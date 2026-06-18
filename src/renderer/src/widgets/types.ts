export type WidgetType = 'news' | 'sticky' | 'stocks' | 'privacy'

export interface WidgetConfig {
  id: string
  type: WidgetType
  size: 1 | 2 | 3
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w-news-1', type: 'news', size: 2 },
  { id: 'w-sticky-1', type: 'sticky', size: 1 },
  { id: 'w-stocks-1', type: 'stocks', size: 2 },
  { id: 'w-privacy-1', type: 'privacy', size: 1 }
]

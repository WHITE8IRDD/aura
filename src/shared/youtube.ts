export interface YtFeedItem {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: number
  thumbnailUrl: string
  duration?: string
  views: number
  boosted?: boolean
  watched?: boolean
  inWatchLater?: boolean
}

export interface YtChannel {
  channel_id: string
  title: string
  handle?: string
  avatar_url?: string
  created_at?: number
}

export interface YtWatchLaterItem {
  video_id: string
  title: string
  channel_title?: string
  thumbnail_url: string
  added_at: number
}

export type YtRuleType = 'block_keyword' | 'block_channel' | 'priority_topic'

export interface YtRule {
  id: number
  rule_type: YtRuleType
  value: string
}

export interface YtSettings {
  hideShorts: boolean
  hideHomeFeed: boolean
  focusMode: boolean
  hideWatched: boolean
}

export const DEFAULT_YT_SETTINGS: YtSettings = {
  hideShorts: true,
  hideHomeFeed: true,
  focusMode: false,
  hideWatched: false,
}

export const YT_IPC = {
  isSubscribed: 'yt:is-subscribed',
  subscribe: 'yt:subscribe',
  unsubscribe: 'yt:unsubscribe',
  subscriptionsChanged: 'yt:subscriptions-changed', // main → Aura UI
} as const

export interface YtChannelRef {
  channelId: string | null // "UC" + 22 chars when known
  handle: string | null // without '@'
  title: string
  avatarUrl: string | null
}

export type YtSubResult =
  | { ok: true; subscribed: boolean; channelId: string | null }
  | { ok: false; error: 'bad-input' | 'bad-sender' | 'resolve-failed' | 'db-error' }

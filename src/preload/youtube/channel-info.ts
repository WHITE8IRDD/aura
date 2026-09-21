import type { YtChannelRef } from '../../shared/youtube-ipc'

const UC_RE = /^UC[\w-]{22}$/

function handleFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/\/@([^/?#]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

function ucFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/\/channel\/(UC[\w-]{22})/)
  return m ? m[1] : null
}

export function refKey(r: YtChannelRef): string {
  return r.channelId ?? `@${(r.handle ?? '').toLowerCase()}`
}

/** Channel that owns the current watch page. null until YouTube has rendered owner. */
export function readChannelRef(): YtChannelRef | null {
  const owner =
    document.querySelector('ytd-watch-metadata ytd-video-owner-renderer') ??
    document.querySelector('ytd-video-owner-renderer')
  if (!owner) return null

  const link = owner.querySelector<HTMLAnchorElement>('a[href*="/@"], a[href*="/channel/"]')
  if (!link) return null

  const handle = handleFromUrl(link.href)
  let channelId = ucFromUrl(link.href)

  // meta channelId can be stale after SPA nav — trust only if author URL matches handle
  if (!channelId && handle) {
    const metaId =
      document.querySelector<HTMLMetaElement>('meta[itemprop="channelId"]')?.content?.trim() ?? ''
    const authorUrl = document.querySelector<HTMLLinkElement>(
      'span[itemprop="author"] link[itemprop="url"]',
    )?.href
    const authorHandle = handleFromUrl(authorUrl)
    if (UC_RE.test(metaId) && authorHandle && authorHandle.toLowerCase() === handle.toLowerCase()) {
      channelId = metaId
    }
  }

  if (!channelId && !handle) return null

  const title =
    owner.querySelector('ytd-channel-name a')?.textContent?.trim() ||
    link.textContent?.trim() ||
    handle ||
    'YouTube channel'

  const img = owner.querySelector<HTMLImageElement>('img')?.src ?? ''
  return { channelId, handle, title, avatarUrl: img.startsWith('https://') ? img : null }
}

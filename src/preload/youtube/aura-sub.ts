import { createAuraSubButton, type AuraSubButton } from './aura-sub-button'
import { resolveAnchor, probeAnchors } from './anchors'
import { readChannelRef } from './channel-info'

const TAG = '[Aura YT]'
const MAX_MOUNTS_PER_VIDEO = 25

let button: AuraSubButton | null = null
let lastVideo = ''
let mounts = 0
let warnedFor = ''

function currentVideoId(): string | null {
  return location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null
}

function unmount(): void {
  button?.destroy()
  button = null
}

function tick(): void {
  const vid = currentVideoId()
  if (!vid) {
    unmount()
    return
  }

  if (vid !== lastVideo) {
    lastVideo = vid
    mounts = 0
    warnedFor = ''
  }

  const ref = readChannelRef()
  if (!ref) return

  if (!button || !button.host.isConnected) {
    if (mounts > MAX_MOUNTS_PER_VIDEO) return
    if (mounts === MAX_MOUNTS_PER_VIDEO) {
      console.error(`${TAG} node wiped ${MAX_MOUNTS_PER_VIDEO}x on ${vid}; giving up for this video`)
      mounts++
      return
    }
    const anchor = resolveAnchor()
    if (!anchor) {
      if (warnedFor !== vid) {
        warnedFor = vid
        console.warn(`${TAG} no anchor found for ${vid}`, probeAnchors())
      }
      return
    }
    button?.destroy()
    button = createAuraSubButton()
    anchor.place(button.host)
    mounts++
    console.log(`${TAG} mounted via "${anchor.name}" for ${ref.title}`)
  }
  button.sync(ref)
}

export function initAuraSub(): void {
  if (window.top !== window) return
  if (!/^(www\.)?youtube\.com$/.test(location.hostname)) return
  console.log(`${TAG} preload active on ${location.href}`)

  let timer: number | undefined
  const schedule = (): void => {
    if (timer !== undefined) return
    timer = window.setTimeout(() => {
      timer = undefined
      tick()
    }, 120)
  }

  const start = (): void => {
    window.addEventListener('yt-navigate-start', unmount, true)
    window.addEventListener('yt-navigate-finish', schedule, true)
    window.addEventListener('yt-page-data-updated', schedule, true)
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
    window.setInterval(() => {
      if (currentVideoId() && !button?.host.isConnected) schedule()
    }, 2000)
    schedule()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}

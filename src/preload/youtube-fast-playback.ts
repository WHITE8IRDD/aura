/**
 * YouTube Ad Skip & Freeze-Recovery Engine
 * Runs in the preload context (isolated per tab) to bypass YouTube's CSP.
 *
 * Design goals (fixing the previous version):
 *  - Never touch currentTime/duration directly — that's what froze the player before.
 *  - Prefer clicking the real Skip button; escalate to a full reload only as a last resort.
 *  - Detect an actual freeze (ad currentTime stalled) instead of guessing from elapsed time.
 *  - Distinguish "skip button not ready yet" from "this ad has no skip option at all" —
 *    the previous 800ms threshold refreshed the page on almost every normal skippable ad,
 *    since most skip buttons don't appear until ~5s in.
 *  - One ordered control loop instead of two timers racing each other.
 *  - Stop entirely when the tab is hidden or torn down.
 */

const AD_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com']
// music.youtube.com uses a different ad/player pipeline; the selectors below don't apply
// there, so it's intentionally excluded rather than silently doing nothing on that host.

const TAG = '[Aura YT Playback]'

export function isYouTubePage(): boolean {
  return AD_HOSTS.includes(window.location.hostname)
}

const CONFIG = {
  loopIntervalMs: 200,
  cleanTrackMinIntervalMs: 500,
  // A true "no skip option" ad still reserves the skip-button *slot*; only the clickable
  // button is delayed on normal skippable ads. Wait out the longest common YouTube skip
  // delay (~5-6s) before concluding an ad is genuinely unskippable.
  unskippableGraceMs: 6500,
  // If the ad's own currentTime hasn't moved at all in this window, the player is frozen
  // regardless of the ad's nominal length — recover immediately rather than waiting.
  freezeStallMs: 2500,
  maxRefreshesPerVideo: 2,
  // Fast, but far less likely to desync/stutter the ad player's internal state than 16x.
  adPlaybackRate: 8,
  // Auto-resume is only allowed right as an ad ends, or briefly after our own forced
  // refresh lands. Outside that window a paused video is assumed to be a deliberate user
  // pause and must never be overridden.
  resumeWindowMs: 5000,
} as const

interface LoopState {
  videoId: string | null
  lastCleanTime: number
  adSeenAt: number // 0 = no ad currently in progress
  lastAdCurrentTime: number
  lastAdTimeSeenAt: number
  refreshing: boolean
  mutedByUs: boolean
  loadedAt: number
  wasAdShowing: boolean
}

const state: LoopState = {
  videoId: null,
  lastCleanTime: 0,
  adSeenAt: 0,
  lastAdCurrentTime: -1,
  lastAdTimeSeenAt: 0,
  refreshing: false,
  mutedByUs: false,
  loadedAt: 0,
  wasAdShowing: false,
}

let loopTimer: ReturnType<typeof setInterval> | null = null
let lastCleanTrackAt = 0
let started = false

function getVideoId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('v')
  } catch {
    return null
  }
}

function getVideoEl(): HTMLVideoElement | null {
  return document.querySelector('video')
}

function getPlayerEl(): Element | null {
  return document.querySelector('#movie_player') ?? document.querySelector('.html5-video-player')
}

/** An element only counts as an ad signal if it's actually on screen. YouTube frequently
 *  leaves ad containers in the DOM — hidden, not removed — after an ad ends; checking mere
 *  existence (as the previous version did) makes every ad "never end," which is what was
 *  causing the rest of the real video to get muted and sped up too. */
function isVisible(el: Element | null): boolean {
  if (!el) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)
    return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/** True while an ad is actually showing. The player's own ad-showing/ad-interrupting class
 *  is the authoritative, reliably-toggled signal — trust it first. The overlay selectors are
 *  only a fallback for the moment right before that class lands, so they require visibility. */
function isAdShowing(): boolean {
  const player = getPlayerEl()
  const classAd =
    !!player &&
    (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))
  if (classAd) return true

  const overlaySelectors = [
    '.ytp-ad-player-overlay',
    '.ytp-ad-text',
    '.ytp-ad-module',
    '.ytp-ad-skip-button-slot',
  ]
  return overlaySelectors.some((sel) => isVisible(document.querySelector(sel)))
}

function findSkipButton(): HTMLElement | null {
  const selectors = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button',
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-text',
    '[class*="ytp-ad-skip-button"]:not([class*="slot"])',
  ]
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel)
    // A real, clickable skip button has layout; the reserved slot exists before the button
    // is actually clickable and must not be mistaken for it.
    if (el && el.offsetParent !== null && el.getBoundingClientRect().width > 0) return el
  }
  return null
}

/** A visibly-present skip *slot* means YouTube intends to offer a skip eventually — that's
 *  the signal used to grant the longer grace period, rather than assuming "unskippable". */
function hasSkipSlot(): boolean {
  return isVisible(document.querySelector('.ytp-ad-skip-button-slot, .ytp-ad-skip-button-container'))
}

function dismissAdBlockWarning(): void {
  const dismiss = document.querySelector<HTMLElement>(
    'ytd-enforcement-message-view-model #dismiss-button, tp-yt-paper-dialog #dismiss-button',
  )
  if (dismiss) {
    dismiss.click()
    console.log(`${TAG} dismissed ad-block warning dialog`)
  }
}

function refreshCountFor(videoId: string): number {
  try {
    return parseInt(sessionStorage.getItem(`aura_yt_refresh_${videoId}`) || '0', 10)
  } catch {
    // sessionStorage unavailable (e.g. restricted preload context) — worst
    // case we refresh more than the cap rather than crashing the loop.
    return 0
  }
}

function bumpRefreshCount(videoId: string): void {
  try {
    sessionStorage.setItem(`aura_yt_refresh_${videoId}`, String(refreshCountFor(videoId) + 1))
  } catch {
    /* sessionStorage unavailable (e.g. private mode) — worst case we refresh more than the cap */
  }
}

function forceReloadAt(resumeSeconds: number): void {
  const url = new URL(window.location.href)
  url.searchParams.set('t', `${Math.max(0, Math.floor(resumeSeconds))}s`)
  console.warn(`${TAG} forcing reload, resuming at ${resumeSeconds}s`)
  window.location.href = url.toString()
}

function onNavigate(): void {
  const id = getVideoId()
  if (id === state.videoId) return
  console.log(`${TAG} navigated to ${id ?? '(no video)'}`)
  state.videoId = id
  state.lastCleanTime = 0
  state.adSeenAt = 0
  state.lastAdCurrentTime = -1
  state.lastAdTimeSeenAt = 0
  state.refreshing = false
  state.mutedByUs = false
  state.loadedAt = Date.now()
  state.wasAdShowing = false
}

function restoreRateAndMute(video: HTMLVideoElement): void {
  if (video.playbackRate !== 1) video.playbackRate = 1
  if (state.mutedByUs) {
    video.muted = false
    state.mutedByUs = false
  }
}

/** Resumes playback ONLY in the two cases this feature exists for: the instant an ad ends,
 *  or briefly after our own forced refresh lands. Outside those, a paused video is a
 *  deliberate user action and must be left alone — this is what previously made the player
 *  impossible to pause, since it ran unconditionally on every tick. */
function maybeAutoResume(video: HTMLVideoElement, now: number, adJustEnded: boolean): void {
  if (!video.paused || video.ended || video.readyState < 2) return
  const withinLoadWindow = now - state.loadedAt <= CONFIG.resumeWindowMs
  if (!adJustEnded && !withinLoadWindow) return
  video.play().catch(() => {
    // Autoplay can be blocked while unmuted; a muted retry at least keeps it moving.
    video.muted = true
    video.play().catch(() => {})
  })
}

function escalateToRefresh(video: HTMLVideoElement): void {
  const videoId = state.videoId
  if (!videoId) return
  const count = refreshCountFor(videoId)
  if (count >= CONFIG.maxRefreshesPerVideo) {
    console.warn(`${TAG} refresh cap reached for ${videoId}; letting the ad play out`)
    return
  }
  state.refreshing = true
  bumpRefreshCount(videoId)
  forceReloadAt(state.lastCleanTime > 0 ? state.lastCleanTime - 1 : video.currentTime)
}

function handleAd(video: HTMLVideoElement, now: number): void {
  if (state.refreshing) return
  if (state.adSeenAt === 0) state.adSeenAt = now

  // Speed through the ad's own audio without disturbing the main video's mute state later.
  if (!video.muted) {
    video.muted = true
    state.mutedByUs = true
  }
  if (video.playbackRate !== CONFIG.adPlaybackRate) {
    video.playbackRate = CONFIG.adPlaybackRate
  }

  const skipBtn = findSkipButton()
  if (skipBtn) {
    skipBtn.click()
    return
  }

  // Freeze detection: if the ad's own currentTime genuinely isn't moving, waiting out the
  // grace period won't help — recover immediately.
  if (video.currentTime !== state.lastAdCurrentTime) {
    state.lastAdCurrentTime = video.currentTime
    state.lastAdTimeSeenAt = now
  } else if (now - state.lastAdTimeSeenAt > CONFIG.freezeStallMs) {
    console.warn(`${TAG} ad appears frozen (currentTime stalled ${CONFIG.freezeStallMs}ms)`)
    escalateToRefresh(video)
    return
  }

  // Only treat as "unskippable" after the normal delayed-skip window has passed AND
  // YouTube never rendered a skip slot at all (a genuinely non-skippable ad).
  const graceElapsed = now - state.adSeenAt > CONFIG.unskippableGraceMs
  if (graceElapsed && !hasSkipSlot()) {
    escalateToRefresh(video)
  }
}

function loop(): void {
  const video = getVideoEl()
  if (!video) return
  const now = Date.now()
  const adShowing = isAdShowing()

  if (adShowing) {
    handleAd(video, now)
    state.wasAdShowing = true
  } else {
    const adJustEnded = state.wasAdShowing
    state.wasAdShowing = false
    state.adSeenAt = 0
    state.lastAdCurrentTime = -1
    restoreRateAndMute(video)
    maybeAutoResume(video, now, adJustEnded)
    if (now - lastCleanTrackAt >= CONFIG.cleanTrackMinIntervalMs) {
      lastCleanTrackAt = now
      if (video.currentTime > 0 && !video.paused) {
        state.lastCleanTime = Math.floor(video.currentTime)
      }
    }
  }

  dismissAdBlockWarning()
}

function startLoop(): void {
  if (loopTimer) return
  loopTimer = setInterval(loop, CONFIG.loopIntervalMs)
}

function stopLoop(): void {
  if (loopTimer) {
    clearInterval(loopTimer)
    loopTimer = null
  }
}

export function initYouTubeFastPlayback(): void {
  if (window.top !== window) return // never run inside embedded iframes
  if (!isYouTubePage() || started) return
  started = true

  window.addEventListener('yt-navigate-finish', onNavigate, true)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop()
    else startLoop()
  })
  window.addEventListener('pagehide', stopLoop, { once: true })

  onNavigate()
  startLoop()
  console.log(`${TAG} running`)
}

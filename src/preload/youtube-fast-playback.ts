/**
 * YouTube Super Fast Playback & Smart Ad-Refresh Engine.
 *
 * Runs DIRECTLY in the preload isolated world (NOT injected as a page
 * <script> tag) — YouTube's CSP silently blocks inline page scripts, but it
 * cannot block preload-world DOM access. Same document, same navigation,
 * zero CSP surface.
 */

const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com']

export function isYouTubePage(): boolean {
  return YOUTUBE_HOSTS.includes(window.location.hostname)
}

// Global state in preload context (isolated per tab).
let lastCleanTimestamp = 0
let adDetectedAt = 0
let isRefreshing = false
let currentVideoId: string | null = null
let cleanTrackTimer: ReturnType<typeof setInterval> | null = null
let adCheckTimer: ReturnType<typeof setInterval> | null = null
let started = false

const MAX_REFRESHES_PER_VIDEO = 2
const UNSKIPPABLE_THRESHOLD_MS = 800

// sessionStorage survives the reload loop (module state does not), so the
// per-video refresh cap lives there. Sandboxed preloads may restrict DOM
// storage — fall back to memory rather than ever throwing.
const memFallback = new Map<string, string>()

function storageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return memFallback.get(key) ?? null
  }
}

function storageSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    memFallback.set(key, value)
  }
}

function getVideoId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('v')
  } catch {
    return null
  }
}

function isAdShowing(): boolean {
  const player =
    document.querySelector('#movie_player') || document.querySelector('.html5-video-player')
  if (!player) return false

  const hasAdClass =
    player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')
  const hasAdOverlay = !!(
    document.querySelector('.ytp-ad-text') ||
    document.querySelector('.ytp-ad-skip-button-container') ||
    document.querySelector('.ytp-ad-skip-button-slot') ||
    document.querySelector('.ytp-ad-player-overlay') ||
    document.querySelector('.ytp-ad-module')
  )

  return hasAdClass || hasAdOverlay
}

function handleNavigation(): void {
  const newId = getVideoId()
  if (newId !== currentVideoId) {
    currentVideoId = newId
    lastCleanTimestamp = 0
    adDetectedAt = 0
    isRefreshing = false
  }
}

function trackCleanPosition(): void {
  try {
    const video = document.querySelector('video')
    if (!video) return

    // Record timestamp ONLY when playing normal video content (NO ad).
    if (!isAdShowing() && video.currentTime > 0 && !video.paused) {
      lastCleanTimestamp = Math.floor(video.currentTime)
      adDetectedAt = 0
    }
  } catch {
    /* DOM in flux — next tick retries */
  }
}

function checkAndBypassAd(): void {
  try {
    if (isRefreshing) return

    const video = document.querySelector('video') as HTMLVideoElement | null
    if (!video) return

    const videoId = getVideoId()
    if (!videoId) return

    if (isAdShowing()) {
      // 1. FAST-FORWARD & MUTE AD.
      video.muted = true
      video.playbackRate = 16.0
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration - 0.05
      }

      // 2. CLICK MODERN YOUTUBE SKIP BUTTONS IMMEDIATELY.
      const skipButtonSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        'button.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-text',
        '[class*="ytp-ad-skip-button"]',
      ]

      for (const selector of skipButtonSelectors) {
        const btn = document.querySelector(selector) as HTMLElement | null
        if (btn) {
          btn.click()
          return
        }
      }

      // Track how long the unskippable ad has been playing.
      if (adDetectedAt === 0) {
        adDetectedAt = Date.now()
      }

      // 3. UNSKIPPABLE AD STUCK > 800MS -> FORCE REFRESH & RESUME AT TIMESTAMP.
      if (Date.now() - adDetectedAt > UNSKIPPABLE_THRESHOLD_MS) {
        const refreshKey = 'aura_yt_refresh_' + videoId
        const refreshCount = parseInt(storageGet(refreshKey) || '0', 10)

        if (refreshCount < MAX_REFRESHES_PER_VIDEO) {
          isRefreshing = true
          storageSet(refreshKey, String(refreshCount + 1))

          const resumeTime = Math.max(0, lastCleanTimestamp - 1)
          const currentUrl = new URL(window.location.href)
          currentUrl.searchParams.set('t', resumeTime + 's')

          console.log(
            `[Aura/YouTube] Unskippable ad detected! Refreshing & resuming at ${resumeTime}s...`,
          )
          window.location.href = currentUrl.toString()
        }
      }
    }

    // Auto-close "Ad blocker detected" warning dialog.
    const dismissBtn = document.querySelector(
      'ytd-enforcement-message-view-model #dismiss-button, tp-yt-paper-dialog #dismiss-button',
    ) as HTMLElement | null

    if (dismissBtn) {
      dismissBtn.click()
      if (video && video.paused) void video.play().catch(() => {})
    }
  } catch {
    /* DOM in flux — next tick retries */
  }
}

function startTimers(): void {
  stopTimers()
  cleanTrackTimer = setInterval(trackCleanPosition, 500)
  adCheckTimer = setInterval(checkAndBypassAd, 150)
}

function stopTimers(): void {
  if (cleanTrackTimer) clearInterval(cleanTrackTimer)
  if (adCheckTimer) clearInterval(adCheckTimer)
  cleanTrackTimer = null
  adCheckTimer = null
}

export function initYouTubeFastPlayback(debug = false): void {
  if (!isYouTubePage()) return
  if (started) return
  started = true

  // SPA navigation listener (page-dispatched events reach isolated worlds).
  window.addEventListener('yt-navigate-finish', () => {
    handleNavigation()
  })

  // Pause timers when tab is hidden to save CPU/battery.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimers()
    } else {
      startTimers()
    }
  })

  handleNavigation()
  startTimers()
  console.log('[Aura/YouTube] Fast Playback Engine running directly in Preload Context')
  if (debug) console.log('[Aura/YouTube] debug logging enabled for', currentVideoId)
}

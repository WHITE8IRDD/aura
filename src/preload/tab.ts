import { contextBridge, ipcRenderer } from 'electron'
import { setupAutofillCapture, setupAutofillSuggestions } from './autofillFormWatcher'
import './pageTranslator'
import './videoDownloadDetector'
import { initYouTubeFastPlayback, isYouTubePage as isYTPage1 } from './youtube-fast-playback'
import { initYouTubeMaxQuality, isYouTubePage as isYTPage2 } from './youtube-max-quality'
import { initShieldsScriptlets } from './shields-scriptlets'
import { initVideoGestures } from './video-gestures'
import { initDarkMode } from './dark-mode'

initShieldsScriptlets()

/* ── Universal video gestures (skips YouTube internally) ── */
try {
  initVideoGestures()
} catch {}

/* ── Native per-site dark mode ── */
try {
  initDarkMode()
} catch {}

/* ── YouTube Performance + Quality ── */
if (isYTPage1()) {
  initYouTubeFastPlayback()
  initYouTubeMaxQuality()
}

/* ── Video timestamp tracking + resume ── */

const isPrivateTab = (() => {
  try {
    const fromArgv = process.argv.includes('--aura-private-tab')
    return fromArgv
  } catch {
    return false
  }
})()

if (!isPrivateTab) {
  const VIDEO_UPDATE_INTERVAL_MS = 5000
  const VIDEO_RESUME_THRESHOLD_SEC = 3
  const trackedVideos = new WeakSet<HTMLVideoElement>()
  const resumedUrls = new Set<string>()

  function getFavicon(): string {
    const link = document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null
    return link?.href || ''
  }

  function saveToLocalBackup(url: string, currentTime: number, duration: number, title: string, favicon: string) {
    try {
      const data = JSON.stringify({ ct: currentTime, dur: duration, ts: Date.now(), title, favicon })
      localStorage.setItem('aura:resume:' + url, data)
    } catch {}
  }

  function readLocalBackup(url: string): { currentTime: number; duration: number | null } | null {
    try {
      const raw = localStorage.getItem('aura:resume:' + url)
      if (!raw) return null
      const data = JSON.parse(raw)
      if (typeof data.ct === 'number' && isFinite(data.ct) && data.ct >= VIDEO_RESUME_THRESHOLD_SEC) {
        return { currentTime: data.ct, duration: typeof data.dur === 'number' ? data.dur : null }
      }
    } catch {}
    return null
  }

  function sendTimeUpdate(url: string, currentTime: number, duration: number, title: string, favicon: string) {
    saveToLocalBackup(url, currentTime, duration, title, favicon)
    ipcRenderer.send('media:timeUpdate', { url, currentTime, duration, title, favicon })
  }

  function sendTimeUpdateSync(url: string, currentTime: number, duration: number, title: string, favicon: string) {
    saveToLocalBackup(url, currentTime, duration, title, favicon)
    ipcRenderer.sendSync('media:timeUpdateSync', { url, currentTime, duration, title, favicon })
  }

  function reportCurrentTime(video: HTMLVideoElement) {
    if (!isFinite(video.duration)) return
    const url = location.href
    const ct = video.currentTime
    sendTimeUpdate(url, ct, video.duration, document.title, getFavicon())
  }

  function reportCurrentTimeSync(video: HTMLVideoElement) {
    if (!isFinite(video.duration)) return
    const url = location.href
    const ct = video.currentTime
    sendTimeUpdateSync(url, ct, video.duration, document.title, getFavicon())
  }

  function attachVideoTracking(video: HTMLVideoElement) {
    if (trackedVideos.has(video)) return
    trackedVideos.add(video)

    let lastTimeupdate = 0
    video.addEventListener('timeupdate', () => {
      const now = Date.now()
      if (now - lastTimeupdate < VIDEO_UPDATE_INTERVAL_MS) return
      lastTimeupdate = now
      reportCurrentTime(video)
    })

    video.addEventListener('seeked', () => {
      reportCurrentTime(video)
    })

    video.addEventListener('pause', () => {
      reportCurrentTime(video)
    })

    video.addEventListener('loadedmetadata', () => maybeResume(video), { once: true })
    video.addEventListener('canplay', () => maybeResume(video), { once: true })
    video.addEventListener('playing', () => maybeResume(video), { once: true })
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }

  function reseekUntilStable(video: HTMLVideoElement, targetTime: number): void {
    const DRIFT_THRESHOLD = 2.5
    const delays = [100, 300, 700, 1500, 3000]
    delays.forEach((delay) => {
      setTimeout(() => {
        const drift = Math.abs(video.currentTime - targetTime)
        if (drift > DRIFT_THRESHOLD) {
          video.currentTime = targetTime
        }
      }, delay)
    })
  }

  function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      if (video.readyState >= 1 && video.duration > 0) {
        resolve()
        return
      }
      const onReady = () => {
        video.removeEventListener('loadedmetadata', onReady)
        resolve()
      }
      video.addEventListener('loadedmetadata', onReady)
      setTimeout(() => {
        video.removeEventListener('loadedmetadata', onReady)
        resolve()
      }, 4000)
    })
  }

  async function maybeResume(video: HTMLVideoElement) {
    const currentUrl = location.href
    if (resumedUrls.has(currentUrl)) return
    resumedUrls.add(currentUrl)

    await waitForVideoReady(video)

    for (let attempt = 0; attempt < 5; attempt++) {
      if (!isFinite(video.duration) || video.duration < 60) {
        await sleep(500)
        continue
      }
      if (attempt > 0) await sleep(500)
      try {
        let saved = await ipcRenderer.invoke('media:lookupTime', location.href) as
          { currentTime: number; duration: number | null } | null

        if (!saved) {
          saved = readLocalBackup(location.href)
        }

        if (!saved) {
          return
        }
        if (saved.currentTime < VIDEO_RESUME_THRESHOLD_SEC) return
        if (saved.duration && saved.currentTime / saved.duration >= 0.95) return

        const targetTime = saved.currentTime

        video.currentTime = targetTime
        reseekUntilStable(video, targetTime)

        // Show resume overlay
        showResumeOverlay(video, targetTime)

        return
      } catch {
        await sleep(500)
      }
    }
  }

  function showResumeOverlay(video: HTMLVideoElement, targetTime: number): void {
    const formatTime = (s: number): string => {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = Math.floor(s % 60)
      if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
      return m + ':' + String(sec).padStart(2, '0')
    }

    const overlay = document.createElement('div')
    overlay.id = 'aura-resume-overlay'
    overlay.style.cssText =
      'position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:99999;cursor:pointer;transition:opacity 0.3s ease;border-radius:8px'

    overlay.innerHTML =
      '<div style="background:rgba(20,22,30,0.85);backdrop-filter:blur(16px);border-radius:14px;padding:14px 24px;' +
      'display:flex;flex-direction:column;align-items:center;gap:6px;border:1px solid rgba(255,255,255,0.1);' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.4);font-family:system-ui">' +
      '<div style="font-size:24px;color:#fff">▶</div>' +
      '<div style="color:#e4e4e7;font-size:13px;font-weight:600">Resume at ' + formatTime(targetTime) + '</div>' +
      '<div style="color:#71717a;font-size:11px">Click to continue playing</div>' +
      '</div>'

    overlay.addEventListener('click', () => {
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), 300)
      if (Math.abs(video.currentTime - targetTime) > 2.5) {
        video.currentTime = targetTime
      }
      video.play().catch(() => {
        setTimeout(() => video.play().catch(() => {}), 100)
      })
    })

    const container = video.closest('.html5-video-player') ||
                      video.closest('.video-container') ||
                      video.parentElement
    if (container) {
      ;(container as HTMLElement).style.position = 'relative'
      container.appendChild(overlay)
    }

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.style.opacity = '0'
        setTimeout(() => overlay.remove(), 300)
      }
    }, 30000)
  }

  function observeVideos() {
    document.querySelectorAll('video').forEach((v) => attachVideoTracking(v as HTMLVideoElement))

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLVideoElement) {
            attachVideoTracking(node)
          } else if (node instanceof Element) {
            node.querySelectorAll('video').forEach((v) => attachVideoTracking(v as HTMLVideoElement))
          }
        })
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeVideos, { once: true })
  } else {
    observeVideos()
  }

  function reportAllVideos(reportFn: (v: HTMLVideoElement) => void) {
    document.querySelectorAll('video').forEach((v) => {
      const video = v as HTMLVideoElement
      if (video.currentTime > 3 && isFinite(video.duration) && video.duration > 60) {
        reportFn(video)
      }
    })
  }

  window.addEventListener('pagehide', () => {
    resumedUrls.clear()
    reportAllVideos(reportCurrentTimeSync)
  })

  window.addEventListener('beforeunload', () => {
    reportAllVideos(reportCurrentTimeSync)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportAllVideos(reportCurrentTimeSync)
    }
  })

  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      const videos = document.querySelectorAll('video')
      videos.forEach((v) => {
        const video = v as HTMLVideoElement
        if (video.readyState >= 1) maybeResume(video)
      })
    }
  }, 1000)
}

const zoomApi = {
  zoom: (dir: 'in' | 'out') => ipcRenderer.send('tab:wheelZoom', dir)
}

contextBridge.exposeInMainWorld('__aura_internal', zoomApi)

// ─────────────────────────────────────────────────────────────────
// Stage 16d: Minimal extensions bridge for Chrome Web Store injection
// ─────────────────────────────────────────────────────────────────
// Exposes ONLY installFromStoreId. Authorization is enforced in the
// main process via senderFrame URL validation (cannot be forged by
// a renderer). This bridge provides transport, not trust.
//
// Why renderer-side validation exists despite main process re-checking:
//   - Fail fast: reject malformed input before IPC round-trip
//   - Consistent contract: guarantee {success, id, error} shape
//   - Prevent unhandled rejections if IPC channel itself fails
//   - Defense in depth — never trust ANY single layer
contextBridge.exposeInMainWorld('aura', {
  extensions: {
    installFromStoreId: async (extensionId: unknown) => {
      // Type guard: reject non-strings before any processing
      if (typeof extensionId !== 'string') {
        return {
          success: false,
          id: null,
          error: 'Invalid extension id: expected string'
        }
      }

      // Trim and validate format
      // Chrome extension IDs are exactly 32 chars, letters a-p only
      const id = extensionId.trim()
      if (!/^[a-p]{32}$/.test(id)) {
        return {
          success: false,
          id: null,
          error: 'Invalid extension id format'
        }
      }

      // Bridge to main process with proper error containment
      try {
        return await ipcRenderer.invoke(
          'extensions:installFromStoreId',
          id
        )
      } catch (err) {
        return {
          success: false,
          id: null,
          error:
            err instanceof Error
              ? err.message
              : 'IPC invocation failed'
        }
      }
    }
  }
})
// ─────────────────────────────────────────────────────────────────

window.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  e.stopPropagation()
  zoomApi.zoom(e.deltaY < 0 ? 'in' : 'out')
}, { passive: false, capture: true })

setupAutofillCapture()
setupAutofillSuggestions()

/* ── Stage 22: Password Manager — Secure Form Capture ── */

function getOrigin(): string {
  try { return new URL(window.location.href).origin }
  catch { return window.location.origin }
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    (el as HTMLInputElement).disabled !== true &&
    el.offsetParent !== null
  )
}

function findLoginForms(): HTMLFormElement[] {
  return Array.from(document.querySelectorAll('form')).filter(form => {
    const pw = form.querySelector('input[type="password"]') as HTMLInputElement | null
    return !!pw && isVisible(pw)
  })
}

function getFormData(form: HTMLFormElement): { username: string; password: string } | null {
  const pw = form.querySelector('input[type="password"]') as HTMLInputElement | null
  if (!pw || !pw.value || !isVisible(pw)) return null

  const un =
    (form.querySelector('input[type="email"]') as HTMLInputElement | null) ||
    (form.querySelector('input[type="text"]') as HTMLInputElement | null) ||
    (form.querySelector(
      'input:not([type="password"]):not([type="hidden"]):not([type="submit"])'
    ) as HTMLInputElement | null)

  return { username: un?.value ?? '', password: pw.value }
}

let lastSent = 0
function sendCapture(data: { username: string; password: string }): void {
  const now = Date.now()
  if (now - lastSent < 1000) return
  lastSent = now

  ipcRenderer.send('passwords:formSubmitted', {
    origin: getOrigin(),
    username: data.username,
    password: data.password,
    title: document.title,
    frameIsMain: window === window.top,
  })
}

function attachFormListeners(): void {
  findLoginForms().forEach(form => {
    if ((form as any).__auraWatched) return
    ;(form as any).__auraWatched = true

    form.addEventListener('submit', () => {
      const data = getFormData(form)
      if (data) sendCapture(data)
    })
  })
}

function checkAndNotifyFillAvailable(): void {
  if (findLoginForms().length > 0 && window === window.top) {
    ipcRenderer.send('passwords:pageHasLoginForm', { origin: getOrigin() })
  }
}

function initPasswords(): void {
  attachFormListeners()
  checkAndNotifyFillAvailable()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPasswords)
} else {
  initPasswords()
}

let lastHref = window.location.href
new MutationObserver(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href
    setTimeout(initPasswords, 500)
  }
}).observe(document.body, { childList: true, subtree: true })

/* ── Streaming/Anime Site Ad Defuser: Invisible Overlays, Popunders, Click-Jacking ── */
function injectStreamingAdDefuser() {
  const script = document.createElement('script')
  script.textContent = `
    (function() {
      'use strict'

      // 1. Defuse window.open popunder click-jacking
      const origOpen = window.open
      let lastClickTime = 0
      document.addEventListener('click', () => { lastClickTime = Date.now() }, true)

      window.open = function(url, target, features) {
        const timeSinceClick = Date.now() - lastClickTime
        const strUrl = String(url || '').toLowerCase()

        // If window.open is called automatically or on an ad redirect -> BLOCK
        const isAdDomain = ['pop', 'ad', 'bet', 'click', 'cash', 'redirect', 'link', 'promo']
          .some(k => strUrl.includes(k))

        if (isAdDomain || timeSinceClick > 1000 || !url) {
          console.log('[Aura/Shields] Defused popunder window.open call:', url)
          return null
        }

        return origOpen.apply(window, arguments)
      }

      // 2. Remove invisible player click-jacking overlays
      function nukeInvisibleOverlays() {
        const overlays = document.querySelectorAll('div, a, span, iframe')
        overlays.forEach(el => {
          const style = window.getComputedStyle(el)
          const isFixed = style.position === 'fixed' || style.position === 'absolute'
          const highZ = parseInt(style.zIndex || '0', 10) > 100
          const isTransparent = style.opacity === '0' || style.backgroundColor === 'transparent' || style.visibility === 'hidden'

          // If element is a transparent full-page overlay sitting on top of a video
          if (isFixed && highZ && isTransparent && el.tagName !== 'VIDEO') {
            const rect = el.getBoundingClientRect()
            if (rect.width > 300 && rect.height > 200 && !el.querySelector('video')) {
              (el as HTMLElement).style.setProperty('display', 'none', 'important')
              (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important')
            }
          }
        })

        // Specific streaming ad container classes
        const adSelectors = [
          '[id*="popunder"]', '[class*="popunder"]',
          '[id*="adsterra"]', '[class*="adsterra"]',
          '[id*="propeller"]', '[class*="propeller"]',
          '#player-overlay', '.player-overlay',
          '.video-ad-overlay', '#video-ad-overlay'
        ]
        adSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            (el as HTMLElement).style.setProperty('display', 'none', 'important')
            (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important')
          })
        })
      }

      // Loop overlay defuser during initial page load & player mount
      setInterval(nukeInvisibleOverlays, 300)
    })()
  `

  ;(document.head || document.documentElement).appendChild(script)
  script.remove()
}

injectStreamingAdDefuser()

import { contextBridge, ipcRenderer } from 'electron'
import { setupAutofillCapture, setupAutofillSuggestions } from './autofillFormWatcher'
import './pageTranslator'
import './videoDownloadDetector'

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

        return
      } catch {
        await sleep(500)
      }
    }
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

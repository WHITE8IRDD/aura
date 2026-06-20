import { ipcRenderer } from 'electron'

const SCAN_INTERVAL_MS = 3000
const OVERLAY_CLASS = 'aura-video-dl-overlay'

function isDownloadable(src: string): boolean {
  if (!src || src === '') return false
  if (src.startsWith('blob:')) return false
  if (src.startsWith('data:')) return false
  return true
}

function injectOverlay(video: HTMLVideoElement): void {
  if (video.dataset.auraDlInjected) return
  video.dataset.auraDlInjected = 'true'

  const parent = video.parentElement
  if (!parent) return

  if (parent.style.position !== 'relative' && parent.style.position !== 'absolute' && parent.style.position !== 'fixed') {
    parent.style.position = 'relative'
  }

  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASS
  overlay.textContent = '\u2B07 Save video'
  overlay.style.cssText = `
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 999999;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    color: #fff;
    font: 12px/1.4 system-ui, sans-serif;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    pointer-events: auto;
    transition: background 0.15s;
  `

  overlay.addEventListener('mouseenter', () => {
    overlay.style.background = 'rgba(79,70,229,0.8)'
  })
  overlay.addEventListener('mouseleave', () => {
    overlay.style.background = 'rgba(0,0,0,0.55)'
  })

  overlay.addEventListener('click', async (e) => {
    e.stopPropagation()
    e.preventDefault()

    const src = video.currentSrc || video.src
    if (!src || !isDownloadable(src)) return

    overlay.textContent = '...'
    overlay.style.pointerEvents = 'none'

    ipcRenderer.send('videoDl:request', {
      url: src,
      filename: video.title || document.title || 'video'
    })

    overlay.textContent = '\u2B07 Save video'
    overlay.style.pointerEvents = 'auto'
  })

  parent.appendChild(overlay)
}

function scanForVideos(): void {
  if (!document.body) return
  const videos = document.querySelectorAll<HTMLVideoElement>('video')
  for (const video of videos) {
    const src = video.currentSrc || video.src
    if (isDownloadable(src)) {
      injectOverlay(video)
    }
  }
}

setInterval(scanForVideos, SCAN_INTERVAL_MS)

document.addEventListener('DOMContentLoaded', () => {
  scanForVideos()
})

scanForVideos()

import { ipcRenderer } from 'electron'
import type { GestureSettings } from '../shared/aura-features'

const HUD_ATTR = 'data-aura-hud'
const SKIP_SELECTORS = [
  '[data-uia="player-skip-intro"]',
  '[data-uia="player-skip-recap"]',
  '[data-uia="player-skip-credits"]',
  '.skip-button',
  '.skip-intro',
  '.skipButton',
  'button[class*="skip-intro" i]',
  'button[class*="skipIntro" i]',
]
const SKIP_TEXT = /skip\s(intro|recap|credits|opening)|intro\sab überspringen|オープニングをスキップ/i

interface Cfg extends GestureSettings {
  disabled: boolean
}

function loadConfig(): Cfg | null {
  let raw: GestureSettings | null = null
  try {
    raw = ipcRenderer.sendSync('features:gestures-get-sync') as GestureSettings | null
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const host = location.hostname.toLowerCase()
  const disabled =
    !raw.enabled || raw.disabledHosts.some((d) => host === d || host.endsWith('.' + d))
  return { ...raw, disabled }
}

function ensureHud(): { root: HTMLElement; label: HTMLElement } {
  let root = document.querySelector<HTMLElement>(`div[${HUD_ATTR}="gestures"]`)
  if (root) return { root, label: root.querySelector<HTMLElement>('[data-hud-label]') ?? root }
  root = document.createElement('div')
  root.setAttribute(HUD_ATTR, 'gestures')
  root.setAttribute('data-hud-label', '')
  root.style.cssText =
    'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:2147483646;' +
    'pointer-events:none;background:rgba(10,10,14,0.82);color:#fff;font:600 14px/1.4 system-ui,sans-serif;' +
    'padding:8px 16px;border-radius:999px;border:1px solid rgba(255,255,255,0.14);' +
    'opacity:0;transition:opacity 0.18s ease;white-space:nowrap;'
  document.documentElement.appendChild(root)
  return { root, label: root }
}

let hudTimer = 0
function flash(text: string): void {
  try {
    const { root, label } = ensureHud()
    label.textContent = text
    root.style.opacity = '1'
    if (hudTimer) window.clearTimeout(hudTimer)
    hudTimer = window.setTimeout(() => {
      root.style.opacity = '0'
    }, 1200)
  } catch { /* never break playback */ }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

const attachedVideos = new WeakSet<HTMLVideoElement>()
const introChips = new WeakMap<HTMLVideoElement, HTMLElement>()
const chipShownFor = new WeakSet<HTMLVideoElement>()
// Players that rebuild the <video> element (e.g. on fullscreen toggles or
// server switches) must not resurrect the chip: one appearance per document.
let introChipShownThisDocument = false

function dismissChip(video: HTMLVideoElement): void {
  const chip = introChips.get(video)
  if (chip) {
    chip.remove()
    introChips.delete(video)
  }
}

function maybeShowIntroChip(video: HTMLVideoElement, cfg: Cfg): void {
  try {
    if (introChipShownThisDocument || chipShownFor.has(video) || introChips.has(video)) return
    const dur = video.duration
    if (!Number.isFinite(dur) || dur < 480) return
    if (video.currentTime > 10) return
    chipShownFor.add(video)
    introChipShownThisDocument = true
    const chip = document.createElement('button')
    chip.setAttribute(HUD_ATTR, 'gestures-intro')
    chip.type = 'button'
    chip.textContent = `Skip intro (${cfg.skipIntroSeconds}s)`
    chip.style.cssText =
      'position:fixed;right:24px;bottom:18%;z-index:2147483646;cursor:pointer;' +
      'background:rgba(10,10,14,0.88);color:#fff;font:600 13px/1 system-ui,sans-serif;' +
      'padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);'
    chip.addEventListener('click', (ev) => {
      ev.stopPropagation()
      try {
        video.currentTime = Math.min(cfg.skipIntroSeconds, Math.max(0, dur - 15))
        flash('Intro skipped')
      } catch { /* ignore */ }
      dismissChip(video)
    }, { once: false })
    document.documentElement.appendChild(chip)
    introChips.set(video, chip)
    window.setTimeout(() => {
      try {
        if (video.currentTime > cfg.skipIntroSeconds + 5) dismissChip(video)
      } catch { /* ignore */ }
    }, (cfg.skipIntroSeconds + 10) * 1000)
  } catch { /* never break playback */ }
}

function clickVisibleSkipButton(): boolean {
  try {
    const els: Element[] = []
    for (const sel of SKIP_SELECTORS) {
      try {
        document.querySelectorAll(sel).forEach((el) => els.push(el))
      } catch { /* bad selector in this document */ }
    }
    // Generic text fallback (throttled by callers).
    try {
      document.querySelectorAll('button').forEach((b) => {
        if (SKIP_TEXT.test(b.textContent || '')) els.push(b)
      })
    } catch { /* ignore */ }
    for (const el of els) {
      const h = el as HTMLElement
      if (!h.isConnected) continue
      const r = h.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const cs = getComputedStyle(h)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      h.click()
      flash('Intro skipped')
      return true
    }
  } catch { /* never break playback */ }
  return false
}

function attachVideo(video: HTMLVideoElement, cfg: Cfg): void {
  if (attachedVideos.has(video)) return
  attachedVideos.add(video)

  video.addEventListener('dblclick', (ev) => {
    try {
      const r = video.getBoundingClientRect()
      if (r.width === 0) return
      const x = (ev.clientX - r.left) / r.width
      const edge = (1 - cfg.centerDeadZone) / 2
      if (x > edge && x < 1 - edge) return // center dead zone: let the page handle it
      const dir = x <= edge ? -1 : 1
      const target = Math.min(Math.max(0, video.currentTime + dir * cfg.doubleTapSeekSeconds), video.duration || 0)
      if (Number.isFinite(target)) video.currentTime = target
      flash(`${dir < 0 ? '−' : '+'}${cfg.doubleTapSeekSeconds}s`)
      ev.preventDefault()
      ev.stopPropagation()
    } catch { /* ignore */ }
  })

  video.addEventListener('wheel', (ev) => {
    try {
      if (ev.shiftKey) {
        const next = Math.min(cfg.maxSpeed, Math.max(cfg.minSpeed, video.playbackRate + (ev.deltaY < 0 ? cfg.speedStep : -cfg.speedStep)))
        video.playbackRate = Math.round(next * 100) / 100
        flash(`Speed ${video.playbackRate}×`)
      } else {
        const next = clamp01(video.volume + (ev.deltaY < 0 ? cfg.volumeStep : -cfg.volumeStep))
        video.volume = Math.round(next * 100) / 100
        if (video.muted && next > 0) video.muted = false
        flash(`Volume ${Math.round(video.volume * 100)}%`)
      }
      ev.preventDefault()
      ev.stopPropagation()
    } catch { /* ignore */ }
  }, { passive: false })

  video.addEventListener('loadedmetadata', () => maybeShowIntroChip(video, cfg), { once: false })
  video.addEventListener('play', () => maybeShowIntroChip(video, cfg), { once: false })
  if (video.readyState >= 1) maybeShowIntroChip(video, cfg)
}

function scanVideos(cfg: Cfg): void {
  try {
    document.querySelectorAll('video').forEach((v) => attachVideo(v, cfg))
  } catch { /* ignore */ }
}

/**
 * Universal video gestures. Runs in every frame (iframe players need it),
 * but never on YouTube — youtube-fast-playback.ts owns that surface.
 */
export function initVideoGestures(): void {
  // Commandment #3: YouTube is handled by youtube-fast-playback.ts.
  const h = location.hostname.toLowerCase()
  if (h === 'youtube.com' || h.endsWith('.youtube.com')) return

  const cfg = loadConfig()
  if (!cfg || cfg.disabled) return

  scanVideos(cfg)
  let queued = false
  const schedule = (): void => {
    if (queued) return
    queued = true
    window.setTimeout(() => {
      queued = false
      try {
        scanVideos(cfg)
        clickVisibleSkipButton()
      } catch { /* never break the page */ }
    }, 300)
  }
  try {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  } catch { /* observe failed: interval fallback below still runs */ }
  window.setInterval(() => {
    try {
      scanVideos(cfg)
    } catch { /* ignore */ }
  }, 2000)
  window.setInterval(() => {
    try {
      clickVisibleSkipButton()
    } catch { /* ignore */ }
  }, 3000)
}

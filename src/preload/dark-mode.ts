import { ipcRenderer } from 'electron'
import type { DarkModeState, DarkPreset } from '../shared/aura-features'

const ROOT_ATTR = 'data-aura-darkmode'
const MEDIA_ATTR = 'data-aura-dm-media'
const THEME_ATTR = 'data-aura-dm-theme'
const STYLE_ID = 'aura-dark-mode-style'

interface RootFilter {
  root: string
  media: string
  pageBg: string
}

const PRESETS: Record<DarkPreset, RootFilter> = {
  oled: {
    root: 'invert(1) hue-rotate(180deg)',
    media: 'invert(1) hue-rotate(180deg)',
    pageBg: '#000000',
  },
  charcoal: {
    root: 'invert(0.93) hue-rotate(180deg) brightness(0.97) contrast(0.97)',
    media: 'invert(0.93) hue-rotate(180deg)',
    pageBg: '#141417',
  },
  amber: {
    root: 'invert(1) hue-rotate(180deg) sepia(0.4) brightness(0.98)',
    media: 'invert(1) hue-rotate(180deg)',
    pageBg: '#171008',
  },
}

function filterCss(p: DarkPreset): string {
  const { root, media, pageBg } = PRESETS[p]
  const R = `html[${ROOT_ATTR}]`
  return `
${R} { filter: ${root} !important; background: ${pageBg} !important; }
${R} img, ${R} video, ${R} canvas, ${R} iframe, ${R} embed, ${R} object,
${R} svg image, ${R} [${MEDIA_ATTR}] { filter: ${media} !important; }
${R} [${MEDIA_ATTR}] img, ${R} [${MEDIA_ATTR}] video, ${R} [${MEDIA_ATTR}] canvas,
${R} [${MEDIA_ATTR}] iframe { filter: none !important; }
${R} img[${THEME_ATTR}] { filter: none !important; }

/* AURA exemptions: keep these un-inverted */
${R} [data-aura-hud],
${R} [data-aura-gold-pulse],
${R} [data-aura-gold-shimmer],
${R} [data-aura-resume-overlay] { filter: none !important; }
`
}

function readState(): DarkModeState | null {
  try {
    const s = ipcRenderer.sendSync('features:dark-get-sync') as DarkModeState | null
    if (!s || typeof s !== 'object') return null
    return s
  } catch {
    return null
  }
}

function apply(state: DarkModeState | null): void {
  try {
    const root = document.documentElement
    if (!root) return
    const prev = document.getElementById(STYLE_ID)
    if (!state || !state.preset) {
      root.removeAttribute(ROOT_ATTR)
      prev?.remove()
      return
    }
    const css = filterCss(state.preset)
    if (prev) {
      if (prev.textContent !== css) prev.textContent = css
    } else {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = css
      ;(document.head || root).appendChild(style)
    }
    if (root.getAttribute(ROOT_ATTR) !== state.preset) {
      root.setAttribute(ROOT_ATTR, state.preset)
    }
  } catch { /* never break the page */ }
}

/**
 * Native per-site dark mode. No YouTube default (users opt in per-site);
 * the global preset simply doesn't special-case any host.
 */
export function initDarkMode(): void {
  try {
    if (!/^https?:$/i.test(location.protocol)) return
  } catch {
    return
  }
  apply(readState())
  try {
    ipcRenderer.on('features:dark-changed', () => apply(readState()))
  } catch { /* listener unavailable */ }
}

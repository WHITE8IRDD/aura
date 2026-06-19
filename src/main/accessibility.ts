import { webContents, type WebContents } from 'electron'
import { getSetting } from './settings'

function percentToZoomLevel(percent: number): number {
  return Math.log(percent / 100) / Math.log(1.2)
}

export function applyDefaultZoom(wc: WebContents): void {
  const percent = getSetting('a11yDefaultZoom')
  if (percent === 100) return
  try {
    wc.setZoomLevel(percentToZoomLevel(percent))
  } catch (err) {
    console.error('[Aura/a11y] setZoomLevel failed:', err)
  }
}

export function getAccessibilityWebPreferences(): Partial<Electron.WebPreferences> {
  const minFontSize = getSetting('a11yMinFontSize')
  if (minFontSize > 0) {
    return { minimumFontSize: minFontSize }
  }
  return {}
}

export function applyZoomToAllTabs(): void {
  const percent = getSetting('a11yDefaultZoom')
  const level = percentToZoomLevel(percent)
  const allWcs = webContents.getAllWebContents()
  for (const wc of allWcs) {
    try {
      if (percent === 100) {
        wc.setZoomLevel(0)
      } else {
        wc.setZoomLevel(level)
      }
    } catch {
      // skip
    }
  }
}

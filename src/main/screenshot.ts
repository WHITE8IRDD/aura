import { app, BrowserWindow, clipboard, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'

/**
 * Screenshot helpers — capture the active tab's WebContentsView
 * as PNG and either save to disk or copy to clipboard.
 */

interface CaptureTarget {
  win: BrowserWindow
  webContentsId: number
}

/**
 * Capture the full visible region of a tab's web view.
 * Returns the PNG as a base64 data URL.
 */
export async function captureTab(target: CaptureTarget): Promise<string | null> {
  try {
    const { webContents } = require('electron')
    const wc = webContents.fromId(target.webContentsId)
    if (!wc) return null
    const image = await wc.capturePage()
    return image.toDataURL()
  } catch (err) {
    console.warn('[Aura/screenshot] Capture failed:', err)
    return null
  }
}

/**
 * Save a captured screenshot to disk via the OS save-file dialog.
 * Returns the chosen file path, or null if user cancelled.
 */
export async function saveScreenshot(
  win: BrowserWindow,
  dataUrl: string,
  suggestedName: string
): Promise<string | null> {
  const safeName = suggestedName.replace(/[^a-z0-9-_]/gi, '_').slice(0, 80)
  const defaultPath = join(
    app.getPath('downloads'),
    `aura-${safeName}-${Date.now()}.png`
  )

  const result = await dialog.showSaveDialog(win, {
    title: 'Save screenshot',
    defaultPath,
    filters: [{ name: 'PNG Image', extensions: ['png'] }]
  })

  if (result.canceled || !result.filePath) return null

  // Strip the "data:image/png;base64," prefix
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  await writeFile(result.filePath, buffer)
  return result.filePath
}

/**
 * Copy a captured screenshot to the system clipboard as an image.
 */
export function copyScreenshotToClipboard(dataUrl: string): void {
  const image = nativeImage.createFromDataURL(dataUrl)
  clipboard.writeImage(image)
}

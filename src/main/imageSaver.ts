import { ipcMain, dialog, nativeImage, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf)
}

export async function saveImageWithFormat(
  parentWindow: BrowserWindow | null,
  url: string,
  format: 'png' | 'jpg',
  quality: number
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const buf = await downloadBuffer(url)
    const img = nativeImage.createFromBuffer(buf)

    if (img.isEmpty()) {
      return { success: false, error: 'Decoded image is empty' }
    }

    let ext: string
    let encoded: Buffer

    if (format === 'png') {
      ext = 'png'
      encoded = img.toPNG()
    } else {
      ext = 'jpg'
      encoded = img.toJPEG(quality / 100)
    }

    const now = Date.now()
    const defaultName = `image_${now}.${ext}`

    const result = await dialog.showSaveDialog(parentWindow!, {
      defaultPath: defaultName,
      filters: [{ name: format === 'png' ? 'PNG Image' : 'JPEG Image', extensions: [ext] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'cancelled' }
    }

    await writeFile(result.filePath, encoded)
    return { success: true, path: result.filePath }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export async function batchSavePageImages(
  parentWindow: BrowserWindow | null,
  format: 'png' | 'jpg',
  quality: number
): Promise<{ success: boolean; count: number; folder?: string; error?: string }> {
  try {
    const folderResult = await dialog.showOpenDialog(parentWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select folder to save images'
    })

    if (folderResult.canceled || !folderResult.filePaths[0]) {
      return { success: false, count: 0, error: 'cancelled' }
    }

    const folder = folderResult.filePaths[0]

    const { webContents } = require('electron')
    const wc = parentWindow?.webContents
    if (!wc) return { success: false, count: 0, error: 'no webContents' }

    const urls: string[] = await wc.executeJavaScript(`
      (() => {
        const imgs = document.querySelectorAll('img');
        const urls = [];
        for (const img of imgs) {
          const src = img.src || img.getAttribute('src');
          if (src && (src.startsWith('http') || src.startsWith('data:'))) {
            urls.push(src);
          }
        }
        return urls;
      })()
    `)

    let saved = 0
    const ext = format === 'png' ? 'png' : 'jpg'

    for (let i = 0; i < urls.length; i++) {
      try {
        const buf = await downloadBuffer(urls[i])
        const img = nativeImage.createFromBuffer(buf)
        if (img.isEmpty()) continue

        const encoded = format === 'png' ? img.toPNG() : img.toJPEG(quality / 100)
        const filename = `image_${i + 1}_${Date.now()}.${ext}`
        await writeFile(join(folder, filename), encoded)
        saved++
      } catch {
        continue
      }
    }

    return { success: true, count: saved, folder }
  } catch (err) {
    return { success: false, count: 0, error: (err as Error).message }
  }
}

export function registerImageSaverIPC(): void {
  ipcMain.handle(
    'imageSaver:saveWithFormat',
    async (e, url: string, format: 'png' | 'jpg', quality: number) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      return saveImageWithFormat(win, url, format, quality)
    }
  )

  ipcMain.handle(
    'imageSaver:batchSavePage',
    async (e, format: 'png' | 'jpg', quality: number) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      return batchSavePageImages(win, format, quality)
    }
  )
}

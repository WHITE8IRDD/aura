import { ipcMain, dialog, BrowserWindow, webContents, net } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'

function humanError(err: any): string {
  const msg = err?.message || String(err)
  if (/cancelled|cancel/i.test(msg)) return ''
  if (/CORS/i.test(msg) || /blocked|protected/i.test(msg)) return 'Image blocked by the site'
  if (/fetch|network/i.test(msg)) return 'Could not download image'
  if (/decode|format/i.test(msg) || /empty/i.test(msg)) return 'Image format not supported'
  if (/source tab/i.test(msg)) return 'Source tab closed'
  return 'Save failed — try a different format'
}

function sanitizeFilename(url: string): string {
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').pop() || ''
    return last.replace(/[^\w.-]/g, '_').slice(0, 80)
  } catch {
    return 'image'
  }
}

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = net.request(url)
    const chunks: Buffer[] = []
    req.on('response', (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      res.on('data', (c) => chunks.push(Buffer.from(c)))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

const CONVERT_SCRIPT = `
(async () => {
  const TARGET_URL = __URL__;
  const FORMAT = '__FMT__';
  const MIME = '__MIME__';
  const QUALITY = __Q__;
  const RAW_BASE64 = __RAW__;

  function imgToDataUrl(img, fmt, mime, quality) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (fmt === 'jpg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, w, h); }
    try { ctx.drawImage(img, 0, 0, w, h); return canvas.toDataURL(mime, quality); }
    catch (e) { return null; }
  }

  async function rawToDataUrl(rawBase64, mime, quality) {
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes]);
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    if (FORMAT === 'jpg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, bmp.width, bmp.height); }
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const outBlob = await canvas.convertToBlob({ type: mime, quality: quality });
    return new Promise(resolve => { const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(outBlob); });
  }

  // Strategy 1: find existing <img> on page matching this URL
  function findImg(url) {
    const imgs = Array.from(document.querySelectorAll('img'));
    let match = imgs.find(i => i.src === url || i.currentSrc === url);
    if (!match) { const base = url.split('?')[0]; match = imgs.find(i => (i.src||'').split('?')[0] === base || (i.currentSrc||'').split('?')[0] === base); }
    if (!match) { const file = url.split('/').pop().split('?')[0]; match = imgs.find(i => (i.src||'').includes(file)); }
    return match;
  }

  const existingImg = findImg(TARGET_URL);
  if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
    const dataUrl = imgToDataUrl(existingImg, FORMAT, MIME, QUALITY);
    if (dataUrl) return dataUrl;
  }

  // Strategy 2: new Image with crossOrigin anonymous
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise(resolve => { img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = TARGET_URL; setTimeout(() => resolve(false), 5000); });
    if (loaded && img.naturalWidth > 0) {
      const dataUrl = imgToDataUrl(img, FORMAT, MIME, QUALITY);
      if (dataUrl) return dataUrl;
    }
  } catch(e) {}

  // Strategy 3: if raw data was provided, decode it in renderer
  if (RAW_BASE64) {
    try { return await rawToDataUrl(RAW_BASE64, MIME, QUALITY); }
    catch(e) { return { error: String(e) }; }
  }

  // Strategy 4: last resort fetch (same-origin cache)
  try {
    const res = await fetch(TARGET_URL);
    if (res.ok) {
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = canvas.getContext('2d');
      if (FORMAT === 'jpg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, bmp.width, bmp.height); }
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      const outBlob = await canvas.convertToBlob({ type: MIME, quality: QUALITY });
      return await new Promise(resolve => { const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(outBlob); });
    }
  } catch(e) {}

  return { error: 'Image is protected by the site' };
})()
`

function makeScript(url: string, format: string, quality: number, rawBase64: string | null): string {
  let s = CONVERT_SCRIPT
    .replace('__URL__', JSON.stringify(url))
    .replace('__FMT__', format)
    .replace('__MIME__', format === 'jpg' ? 'image/jpeg' : 'image/png')
    .replace('__Q__', format === 'jpg' ? String(Math.max(0, Math.min(100, quality)) / 100) : 'undefined')
    .replace('__RAW__', rawBase64 ? JSON.stringify(rawBase64) : 'null')
  return s
}

function applyDialog(result: Electron.SaveDialogReturnValue, outBuf: Buffer): { success: boolean; path?: string; error?: string } {
  if (result.canceled || !result.filePath) {
    return { success: false, error: '' }
  }
  writeFile(result.filePath, outBuf)
  return { success: true, path: result.filePath }
}

export async function saveImageWithFormat(
  parentWindow: BrowserWindow | null,
  url: string,
  format: 'png' | 'jpg',
  quality: number,
  sourceWcId?: number
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const sourceWc = sourceWcId ? webContents.fromId(sourceWcId) : null

    if (!sourceWc || sourceWc.isDestroyed()) {
      return { success: false, error: 'Source tab closed' }
    }

    // ── Try Strategies 1 & 2 (existing img, crossOrigin Image()) ──
    const scriptWithoutRaw = makeScript(url, format, quality, null)
    let result = await sourceWc.executeJavaScript(scriptWithoutRaw, true)

    // ── If renderer strategies failed, download via main process ──
    if (typeof result !== 'string') {
      const rawBuf = await downloadBuffer(url)
      if (rawBuf.length === 0) return { success: false, error: 'Image format not supported' }

      const rawBase64 = rawBuf.toString('base64')
      const scriptWithRaw = makeScript(url, format, quality, rawBase64)
      result = await sourceWc.executeJavaScript(scriptWithRaw, true)
    }

    if (typeof result !== 'string') {
      const errMsg = (result as any)?.error || 'Image is protected by the site'
      return { success: false, error: errMsg }
    }

    const base64 = result.split(',')[1]
    if (!base64) return { success: false, error: 'Image conversion failed' }
    const outBuf = Buffer.from(base64, 'base64')

    const ext = format === 'jpg' ? 'jpg' : 'png'
    const baseName = sanitizeFilename(url).replace(/\.[^.]+$/, '')
    const suggested = `${baseName || 'image'}.${ext}`

    const dialogResult = await dialog.showSaveDialog(parentWindow!, {
      defaultPath: suggested,
      filters: [{ name: format.toUpperCase(), extensions: [ext] }]
    })

    return applyDialog(dialogResult, outBuf)
  } catch (err) {
    return { success: false, error: humanError(err) }
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
      return { success: false, count: 0, error: '' }
    }

    const folder = folderResult.filePaths[0]
    const wc = parentWindow?.webContents
    if (!wc) return { success: false, count: 0, error: 'No browser window' }

    const ext = format === 'jpg' ? 'jpg' : 'png'
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png'
    const q = format === 'jpg' ? Math.max(0, Math.min(100, quality)) / 100 : undefined
    const qStr = q != null ? String(q) : 'undefined'

    const results: Array<{ dataUrl: string | null; filename: string } | null> = await wc.executeJavaScript(`
      (async () => {
        const FORMAT = ${JSON.stringify(format)};
        const MIME = ${JSON.stringify(mime)};
        const QUALITY = ${qStr};
        const imgs = Array.from(document.querySelectorAll('img'));
        const entries = [];
        for (const img of imgs) {
          const src = img.src || img.getAttribute('src') || '';
          if (!src.startsWith('http') && !src.startsWith('data:')) continue;

          function imgToDataUrl(el, fmt, mime, quality) {
            const w = el.naturalWidth || el.width;
            const h = el.naturalHeight || el.height;
            if (!w || !h) return null;
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            if (fmt === 'jpg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, w, h); }
            try { ctx.drawImage(el, 0, 0, w, h); return canvas.toDataURL(mime, quality); }
            catch(e) { return null; }
          }

          // Try existing img first
          let dataUrl = null;
          if (img.complete && img.naturalWidth > 0) {
            dataUrl = imgToDataUrl(img, FORMAT, MIME, QUALITY);
          }

          // If tainted, try crossOrigin Image
          if (!dataUrl) {
            try {
              const newImg = new Image();
              newImg.crossOrigin = 'anonymous';
              const loaded = await new Promise(resolve => {
                newImg.onload = () => resolve(true);
                newImg.onerror = () => resolve(false);
                newImg.src = src;
                setTimeout(() => resolve(false), 3000);
              });
              if (loaded && newImg.naturalWidth > 0) {
                dataUrl = imgToDataUrl(newImg, FORMAT, MIME, QUALITY);
              }
            } catch(e) {}
          }

          const name = (src.split('/').pop() || 'image').replace(/[\\/:"*?<>|]/g, '_').split('?')[0].slice(0, 60);
          entries.push(dataUrl ? { dataUrl, filename: name.replace(/\.[^.]+$/, '') + '.' + ${JSON.stringify(ext)} } : null);
        }
        return entries;
      })()
    `, true)

    let saved = 0
    if (Array.isArray(results)) {
      for (const entry of results) {
        if (!entry?.dataUrl) continue
        const base64 = entry.dataUrl.split(',')[1]
        if (!base64) continue
        const buf = Buffer.from(base64, 'base64')
        await writeFile(join(folder, entry.filename || `image_${Date.now()}.${ext}`), buf)
        saved++
      }
    }

    return { success: saved > 0, count: saved, folder }
  } catch (err) {
    return { success: false, count: 0, error: humanError(err) }
  }
}

export function registerImageSaverIPC(): void {
  ipcMain.handle(
    'imageSaver:saveWithFormat',
    async (e, url: string, format: 'png' | 'jpg', quality: number, sourceWcId?: number) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      return saveImageWithFormat(win, url, format, quality, sourceWcId)
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

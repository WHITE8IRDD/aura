import { BrowserWindow, ipcMain, net, shell } from 'electron'
import { createWriteStream, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { mkdirSync } from 'fs'
import { TabManager } from './tabs'
import {
  listExtensions,
  getExtension,
  ensurePopupPath,
  getIconDataUrl,
  installUnpacked,
  installCrx,
  installFromStoreId,
  enableExtension,
  disableExtension,
  deleteExtension,
  pickFolder,
  pickCrx,
  reloadEnabledExtensions,
  type ExtensionRecord,
} from './extensionManager'
import { openExtensionPopup } from './extensionPopupWindow'
import type { ExtensionItem } from '../shared/aura-features'

function toItem(rec: ExtensionRecord): ExtensionItem {
  const full = ensurePopupPath(rec)
  return { ...full, popupPath: full.popup_path }
}

function parentFor(e: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender) ?? BrowserWindow.getFocusedWindow()
}

function emitChanged(): void {
  for (const m of TabManager.getAll()) {
    try {
      const w = m.getWindow()
      if (w && !w.isDestroyed()) w.webContents.send('extensions:changed')
    } catch { /* window gone */ }
  }
}

/** Wire every extensions:* channel. Call once after app is ready. */
export function registerExtensionIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('extensions:list', () => listExtensions().map(toItem))

  ipcMain.handle('extensions:get', (_e, id: string) => {
    const rec = getExtension(String(id ?? ''))
    return rec ? toItem(rec) : undefined
  })

  ipcMain.handle('extensions:getIcon', (_e, id: string) => getIconDataUrl(String(id ?? '')))

  ipcMain.handle('extensions:installFolder', async (e) => {
    const folder = await pickFolder(parentFor(e))
    if (!folder) return { success: false, error: 'No folder selected' }
    const r = await installUnpacked(folder)
    if (r.success) emitChanged()
    return r
  })

  ipcMain.handle('extensions:installCrx', async (e) => {
    const file = await pickCrx(parentFor(e))
    if (!file) return { success: false, error: 'No file selected' }
    const r = await installCrx(file)
    if (r.success) emitChanged()
    return r
  })

  ipcMain.handle('extensions:install-path', async (_e, targetPath: string) => {
    const p = String(targetPath ?? '')
    if (!p) return { success: false, error: 'No path provided' }
    const r = /\.crx$/i.test(p) ? await installCrx(p) : await installUnpacked(p)
    if (r.success) emitChanged()
    return r
  })

  ipcMain.handle('extensions:install-store-url', async (_e, input: string) => {
    const q = String(input ?? '').trim()
    const m = q.match(/([a-p]{32})/i)
    if (!m) return { success: false, error: 'Could not parse extension ID from URL' }
    const r = await installFromStoreId(m[1].toLowerCase())
    if (r.success) emitChanged()
    return r
  })

  ipcMain.handle('extensions:enable', async (_e, id: string) => {
    const r = await enableExtension(String(id ?? ''))
    if (r.success) emitChanged()
    return r
  })
  ipcMain.handle('extensions:disable', async (_e, id: string) => {
    const r = await disableExtension(String(id ?? ''))
    if (r.success) emitChanged()
    return r
  })
  ipcMain.handle('extensions:delete', async (_e, id: string) => {
    const r = await deleteExtension(String(id ?? ''))
    if (r.success) emitChanged()
    return r
  })

  ipcMain.handle('extensions:installFromStoreId', (_e, id: string) => {
    if (!/^[a-p]{32}$/.test(String(id ?? ''))) return { success: false, error: 'Invalid extension ID format' }
    return installFromStoreId(String(id))
  })

  ipcMain.handle('extensions:installFromUrl', async (_e, url: string) => {
    const href = String(url ?? '')
    if (!/^https:\/\//i.test(href)) return { success: false, error: 'Only https URLs are supported' }
    const tmp = join(app.getPath('userData'), 'extensions', `_url_${Date.now()}.crx`)
    try {
      mkdirSync(join(app.getPath('userData'), 'extensions'), { recursive: true })
    } catch { /* exists */ }
    const ok = await new Promise<boolean>((resolve) => {
      let settled = false
      const done = (v: boolean): void => { if (!settled) { settled = true; resolve(v) } }
      let out: ReturnType<typeof createWriteStream>
      try {
        out = createWriteStream(tmp)
      } catch {
        done(false)
        return
      }
      const timer = setTimeout(() => { try { req.abort() } catch {} }, 60_000)
      const req = net.request({ url: href, redirect: 'follow' })
      req.on('response', (res) => {
        if (res.statusCode !== 200) {
          clearTimeout(timer)
          out.destroy()
          try { unlinkSync(tmp) } catch {}
          done(false)
          return
        }
        res.on('data', (c) => out.write(c))
        res.on('end', () => { clearTimeout(timer); out.end() })
        res.on('error', () => { clearTimeout(timer); out.destroy(); try { unlinkSync(tmp) } catch {} done(false) })
      })
      req.on('error', () => { clearTimeout(timer); out.destroy(); try { unlinkSync(tmp) } catch {} done(false) })
      out.on('finish', () => { clearTimeout(timer); done(true) })
      out.on('error', () => { clearTimeout(timer); try { unlinkSync(tmp) } catch {} done(false) })
      req.end()
    })
    if (!ok) return { success: false, error: 'Download failed' }
    const result = await installCrx(tmp)
    try { unlinkSync(tmp) } catch {}
    return result
  })

  ipcMain.handle('extensions:search', () => ({
    success: false as const,
    results: [] as Array<{ id: string; name: string; description: string; iconUrl: string }>,
    error: 'Store search is not available in Aura yet — install via Extensions page buttons or an extension ID',
  }))

  ipcMain.handle('extensions:openStore', () => {
    const url = 'https://chromewebstore.google.com/'
    const mgr = TabManager.getAll().find((m) => !m.isPrivate) ?? TabManager.getAll()[0]
    if (mgr) {
      mgr.create(url)
      return true
    }
    void shell.openExternal(url)
    return false
  })

  ipcMain.handle(
    'extensions:open-popup',
    (e, extId: string, anchorX: number, anchorY: number) => {
      const id = String(extId ?? '')
      const rec = getExtension(id)
      const popupPath = rec ? ensurePopupPath(rec).popup_path : null
      if (!popupPath) return false
      const parent = parentFor(e) ?? getMainWindow()
      if (!parent || parent.isDestroyed()) return false
      return openExtensionPopup(parent, id, popupPath, Number(anchorX), Number(anchorY))
    }
  )

  // Load enabled extensions into the session (non-blocking, after startup).
  void reloadEnabledExtensions().catch((err) => console.error('[ext] startup reload failed:', err))
}

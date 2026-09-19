import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { ElectronBlocker } from '@ghostery/adblocker-electron'
import { POPUNDER_DOMAINS } from './constants'

const CORE_LISTS = [
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
]
const EXTRA_LISTS = [
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt',
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=0&mimetype=plaintext',
]
const EXTRA_FILTERS: string[] = POPUNDER_DOMAINS.map((d) => `||${d}^`)
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

let blocker: ElectronBlocker | null = null
let refreshing = false

const cacheDir = (): string => join(app.getPath('userData'), 'blocker-cache')
const cacheFile = (): string => join(cacheDir(), 'engine.bin')

export const getBlocker = (): ElectronBlocker | null => blocker

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch(url, { signal: controller.signal })
      return res.ok ? await res.text() : null
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

export async function refreshEngine(): Promise<boolean> {
  if (refreshing) return false
  refreshing = true
  try {
    const urls = [...CORE_LISTS, ...EXTRA_LISTS]
    const texts = await Promise.all(urls.map(fetchText))
    const coreOk = texts.slice(0, CORE_LISTS.length).every((t) => !!t)
    if (!coreOk) {
      console.warn('[Aura/Blocker] EasyList/EasyPrivacy download failed; keeping current engine')
      return false
    }
    const merged = texts.filter((t): t is string => !!t).join('\n') + '\n' + EXTRA_FILTERS.join('\n')
    const next = ElectronBlocker.parse(merged)
    await fs.mkdir(cacheDir(), { recursive: true })
    const tmp = cacheFile() + '.tmp'
    await fs.writeFile(tmp, next.serialize())
    await fs.rename(tmp, cacheFile())
    blocker = next
    console.log('[Aura/Blocker] Engine rebuilt and cached')
    return true
  } catch (err) {
    console.warn('[Aura/Blocker] Engine refresh failed:', err)
    return false
  } finally {
    refreshing = false
  }
}

export async function initEngine(): Promise<void> {
  try {
    const buf = await fs.readFile(cacheFile())
    blocker = ElectronBlocker.deserialize(new Uint8Array(buf))
  } catch {
    // no cache or incompatible cache
  }

  let stale = true
  try {
    const st = await fs.stat(cacheFile())
    stale = Date.now() - st.mtimeMs > MAX_AGE_MS
  } catch {
    // missing file
  }

  // Pop-under network rules must work immediately, even before the first download finishes.
  if (!blocker) blocker = ElectronBlocker.parse(EXTRA_FILTERS.join('\n'))

  if (stale) setTimeout(() => void refreshEngine(), 4000)
}

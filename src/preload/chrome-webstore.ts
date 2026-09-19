import { ipcRenderer } from 'electron'

// "Add to Aura" injector for the Chrome Web Store. Runs in the isolated
// preload world (NOT serialized into the page): it shares the page DOM, so
// no CustomEvent bridge is needed — the click handler calls ipcRenderer
// directly. No contextBridge here (Commandment #4).

const FLAG = '__auraStoreBtn'
const EXT_ID_RE = /\/([a-p]{32})(?:[/?#]|$)/i
const BTN_ID = 'aura-add-extension-btn'

function isStorePage(): boolean {
  try {
    const u = new URL(location.href)
    const host = u.hostname.toLowerCase()
    if (host === 'chromewebstore.google.com' || host.endsWith('.chromewebstore.google.com')) return true
    if (host === 'chrome.google.com' && u.pathname.toLowerCase().startsWith('/webstore')) return true
    return false
  } catch {
    return false
  }
}

function getExtId(): string | null {
  try {
    const m = location.href.match(EXT_ID_RE)
    return m ? m[1].toLowerCase() : null
  } catch {
    return null
  }
}

function hideGoogleNoise(): void {
  try {
    document.querySelectorAll('[role="alert"], .e-f-b, .webstore-test-button-label').forEach((el) => {
      const t = (el.textContent || '').toLowerCase()
      if (t.includes('unavailable') || t.includes('troubleshooting')) {
        ;(el as HTMLElement).style.display = 'none'
      }
    })
    document.querySelectorAll('div[role="button"], button, a').forEach((el) => {
      if (el.id === BTN_ID) return
      const t = (el.textContent || '').trim().toLowerCase()
      if (t === 'add to chrome' || t === 'remove from chrome') {
        ;(el as HTMLElement).style.display = 'none'
      }
    })
  } catch { /* never break the store page */ }
}

function setBtnState(btn: HTMLButtonElement, mode: 'idle' | 'busy' | 'done' | 'error'): void {
  if (mode === 'busy') {
    btn.disabled = true
    btn.textContent = 'Installing…'
  } else if (mode === 'done') {
    btn.disabled = true
    btn.textContent = 'Added to Aura ✓'
    btn.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
  } else if (mode === 'error') {
    btn.disabled = false
    btn.textContent = 'Install failed — try Extensions page'
  } else {
    btn.disabled = false
    btn.textContent = 'Add to Aura'
  }
}

function makeAuraButton(extId: string): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.id = BTN_ID
  btn.type = 'button'
  btn.textContent = 'Add to Aura'
  btn.style.cssText =
    'appearance:none;border:none;cursor:pointer;' +
    'background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#06b6d4 100%);' +
    'color:#fff;font:600 14px/1 system-ui,sans-serif;' +
    'padding:10px 22px;border-radius:24px;' +
    'box-shadow:0 4px 14px rgba(79,70,229,.45);' +
    'transition:transform .15s ease,box-shadow .15s ease;'
  btn.onmouseenter = () => {
    btn.style.transform = 'translateY(-1px)'
    btn.style.boxShadow = '0 6px 20px rgba(79,70,229,.6)'
  }
  btn.onmouseleave = () => {
    btn.style.transform = ''
    btn.style.boxShadow = '0 4px 14px rgba(79,70,229,.45)'
  }
  btn.onclick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setBtnState(btn, 'busy')
    void (async () => {
      try {
        const r = (await ipcRenderer.invoke('extensions:install-store-url', location.href)) as
          | { success: boolean; error?: string }
          | undefined
        if (r?.success) setBtnState(btn, 'done')
        else {
          console.warn('[Aura/Store] install failed:', r?.error)
          setBtnState(btn, 'error')
        }
      } catch (err) {
        console.warn('[Aura/Store] install failed:', err)
        setBtnState(btn, 'error')
      }
    })()
  }
  return btn
}

function mount(): void {
  try {
    hideGoogleNoise()
    const extId = getExtId()
    if (!extId) return
    if (document.getElementById(BTN_ID)) return
    const candidates: Array<Element | null> = [
      document.querySelector('.rsw-main-button-container'),
      document.querySelector('[class*="action"]'),
      document.querySelector('h1')?.parentElement ?? null,
    ]
    const host = candidates.find((el) => !!el) as HTMLElement | undefined
    const btn = makeAuraButton(extId)
    if (host) {
      host.appendChild(btn)
    } else {
      btn.style.position = 'fixed'
      btn.style.top = '100px'
      btn.style.right = '24px'
      btn.style.zIndex = '2147483647'
      document.documentElement.appendChild(btn)
    }
  } catch { /* never break the store page */ }
}

export function initStoreButton(): void {
  try {
    if (!isStorePage()) return
    const w = window as unknown as Record<string, unknown>
    if (w[FLAG]) return
    w[FLAG] = true
    mount()
    new MutationObserver(() => mount()).observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  } catch { /* never break the store page */ }
}

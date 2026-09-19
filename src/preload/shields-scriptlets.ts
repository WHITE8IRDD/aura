import { ipcRenderer, webFrame } from 'electron'

interface ScriptletConfig {
  site: string
  strict: boolean
  floating: boolean
  popunderHosts: string[]
  adFrameHosts: string[]
  popunderPath: { source: string; flags: string }
}

function stealthScriptlet(cfg: ScriptletConfig): void {
  const KEY = Symbol.for('aura.shields.active')
  if ((window as unknown as Record<symbol, unknown>)[KEY]) return
  Object.defineProperty(window, KEY, { value: true })

  const nativeToString = Function.prototype.toString
  const masked = new WeakMap<object, string>()
  const patchedToString = function (this: unknown): string {
    return masked.get(this as object) ?? nativeToString.call(this)
  }
  masked.set(patchedToString, 'function toString() { [native code] }')
  Object.defineProperty(Function.prototype, 'toString', { value: patchedToString, writable: true, configurable: true })

  const mask = <T extends object>(fn: T, name: string): T => {
    masked.set(fn, 'function ' + name + '() { [native code] }')
    return fn
  }

  const hostMatch = (host: string, list: string[]): boolean =>
    list.some((d) => host === d || host.endsWith('.' + d))
  const toUrl = (u: unknown): URL | null => {
    try {
      return new URL(String(u), location.href)
    } catch {
      return null
    }
  }
  const sameSite = (host: string): boolean => host === cfg.site || host.endsWith('.' + cfg.site)
  const pathRe = new RegExp(cfg.popunderPath.source, cfg.popunderPath.flags)
  const isAdUrl = (u: URL): boolean => hostMatch(u.hostname, cfg.popunderHosts) || pathRe.test(u.pathname)
  const userActive = (): boolean => {
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
    return ua ? ua.isActive : true
  }

  let pendingCount = 0
  let flushTimer = 0
  const report = (n = 1): void => {
    pendingCount += n
    if (flushTimer) return
    flushTimer = window.setTimeout(() => {
      const count = pendingCount
      pendingCount = 0
      flushTimer = 0
      window.dispatchEvent(new CustomEvent('aura-dom-blocked', { detail: count }))
    }, 200)
  }

  let lastTarget: EventTarget | null = null
  window.addEventListener('click', (e) => { if (e.isTrusted) lastTarget = e.target }, true)

  const coversViewport = (el: Element): boolean => {
    const r = el.getBoundingClientRect()
    return r.width >= innerWidth * 0.8 && r.height >= innerHeight * 0.8
  }
  const isBareClick = (t: EventTarget | null): boolean => {
    if (!(t instanceof Element)) return true
    if (t === document.body || t === document.documentElement) return true
    if (t.closest('a[href],button,input,select,textarea,label,summary,[role="button"],[role="link"],video')) return false
    const pos = getComputedStyle(t).position
    return (pos === 'fixed' || pos === 'absolute') && coversViewport(t)
  }
  const linkMatches = (t: EventTarget | null, u: URL): boolean => {
    const a = t instanceof Element ? t.closest('a[href]') : null
    const h = a ? toUrl(a.getAttribute('href')) : null
    return !!h && h.hostname === u.hostname && h.pathname === u.pathname
  }
  const isHidden = (el: HTMLElement): boolean => {
    const cs = getComputedStyle(el)
    return cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05 ||
      el.offsetWidth === 0 || el.offsetHeight === 0
  }

  const fakeWindow = (): object => ({
    closed: true, opener: null, close() {}, focus() {}, blur() {}, postMessage() {},
    location: { href: '', assign() {}, replace() {}, reload() {} },
    document: { write() {}, writeln() {}, open() {}, close() {} },
  })
  const origOpen = window.open
  const patchedOpen = mask(function (this: unknown, url?: string | URL, target?: string, features?: string) {
    const u = url === undefined || url === '' ? null : toUrl(url)
    let block = false
    if (u && isAdUrl(u)) block = true
    if (!userActive()) block = true
    else if (u && !sameSite(u.hostname)) {
      if (isBareClick(lastTarget)) block = true
      else if (cfg.strict && !linkMatches(lastTarget, u)) block = true
    }
    if (block) {
      report()
      return fakeWindow()
    }
    return origOpen.call(window, url as string, target, features)
  }, 'open')
  Object.defineProperty(window, 'open', { configurable: false, enumerable: true, get: () => patchedOpen, set: () => {} })

  const blockSyntheticAnchor = (a: HTMLAnchorElement): boolean => {
    if (a.hasAttribute('download')) return false
    const u = toUrl(a.href)
    if (!u || !/^https?:$/.test(u.protocol) || sameSite(u.hostname)) return false
    if (isAdUrl(u) || !userActive()) return true
    return isHidden(a) && a.target !== '' && a.target !== '_self'
  }
  const origAnchorClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = mask(function (this: HTMLAnchorElement) {
    if (blockSyntheticAnchor(this)) {
      report()
      return
    }
    return origAnchorClick.call(this)
  }, 'click')
  const origDispatch = EventTarget.prototype.dispatchEvent
  EventTarget.prototype.dispatchEvent = mask(function (this: EventTarget, ev: Event): boolean {
    if (ev && ev.type === 'click' && !ev.isTrusted && this instanceof HTMLAnchorElement && blockSyntheticAnchor(this)) {
      report()
      return false
    }
    return origDispatch.call(this, ev)
  }, 'dispatchEvent')

  const blockForm = (f: HTMLFormElement): boolean => {
    const u = toUrl(f.action)
    if (!u || !/^https?:$/.test(u.protocol) || sameSite(u.hostname)) return false
    return isAdUrl(u) || !userActive() || (isHidden(f) && f.target !== '' && f.target !== '_self')
  }
  const origSubmit = HTMLFormElement.prototype.submit
  const origRequestSubmit = HTMLFormElement.prototype.requestSubmit
  HTMLFormElement.prototype.submit = mask(function (this: HTMLFormElement) {
    if (blockForm(this)) {
      report()
      return
    }
    return origSubmit.call(this)
  }, 'submit')
  HTMLFormElement.prototype.requestSubmit = mask(function (this: HTMLFormElement, s?: HTMLElement | null) {
    if (blockForm(this)) {
      report()
      return
    }
    return origRequestSubmit.call(this, s ?? undefined)
  }, 'requestSubmit')

  const SAFE = 'video,iframe[src*="youtube.com"],iframe[src*="youtube-nocookie.com"],[class*="player" i],[id*="player" i]'
  const KEEP = /intercom|crisp|drift|zendesk|tawk|livechat|hubspot|messenger|cookie|consent|captcha|turnstile|gdpr|onetrust|cookiebot|osano|usercentrics|didomi|quantcast|trustarc|chat/i
  const NUISANCE = /is your browser (firefox|chrome|edge|safari|opera|brave)|take (our|a|this) (short |quick )?survey|you have been selected|you.ve been selected|congratulations!? you/i
  const WIDGET = /float|sticky|widget|sport|ball|rugby|football|soccer|score/i
  const handled = new WeakSet<Element>()

  const kill = (el: Element, hard: boolean): void => {
    if (handled.has(el)) return
    handled.add(el)
    if (hard) el.remove()
    else (el as HTMLElement).style.setProperty('display', 'none', 'important')
    report()
  }
  const isSafe = (el: Element): boolean => el.matches(SAFE) || !!el.querySelector(SAFE)
  const label = (el: Element): string => el.id + ' ' + (typeof el.className === 'string' ? el.className : '')

  const inspectLayer = (el: Element): void => {
    if (handled.has(el) || !(el instanceof HTMLElement)) return
    if (/^(SCRIPT|STYLE|LINK|NOSCRIPT|META)$/.test(el.tagName) || isSafe(el) || KEEP.test(label(el))) return
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    const z = parseInt(cs.zIndex, 10) || 0
    const text = (el.textContent || '').trim()

    if (cs.position === 'fixed' && text.length > 0 && text.length < 800 && NUISANCE.test(text)) return kill(el, false)

    if (
      cs.position === 'fixed' && z >= 1000 && coversViewport(el) && text === '' && cs.pointerEvents !== 'none' &&
      (parseFloat(cs.opacity) < 0.05 || /^(rgba\(0, 0, 0, 0\)|transparent)$/.test(cs.backgroundColor))
    ) return kill(el, false)

    if (cfg.floating && cs.position === 'fixed' && z >= 10 && r.width <= 340 && r.height <= 340 &&
        (r.left < 40 || innerWidth - r.right < 40) && !el.querySelector('input,textarea,select')) {
      const frame = el.querySelector('iframe[src]') as HTMLIFrameElement | null
      const fu = frame ? toUrl(frame.src) : null
      const thirdPartyFrame = !!fu && !sameSite(fu.hostname)
      if (WIDGET.test(label(el)) || thirdPartyFrame) return kill(el, false)
    }
  }

  const scan = (): void => {
    document.querySelectorAll('iframe[src]').forEach((f) => {
      const u = toUrl((f as HTMLIFrameElement).src)
      if (u && !handled.has(f) && !sameSite(u.hostname) && !f.matches(SAFE) &&
          (hostMatch(u.hostname, cfg.adFrameHosts) || hostMatch(u.hostname, cfg.popunderHosts))) kill(f, true)
    })
    document.querySelectorAll('ins.adsbygoogle,[id^="google_ads_iframe"],[id^="div-gpt-ad"]').forEach((el) => kill(el, true))
    if (document.body) for (const el of Array.from(document.body.children)) inspectLayer(el)
  }

  let timer = 0
  const schedule = (): void => {
    if (timer) return
    timer = window.setTimeout(() => {
      timer = 0
      try { scan() } catch { /* never break the page */ }
    }, 300)
  }
  const start = (): void => {
    scan()
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
    window.setInterval(schedule, 2000)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}

export function initShieldsScriptlets(): void {
  if (window.top !== window) return

  let cfg: (ScriptletConfig & { exempt: boolean; level: string }) | null = null
  try {
    cfg = ipcRenderer.sendSync('shields:get-config', location.hostname)
  } catch {
    return
  }
  if (!cfg || cfg.exempt || cfg.level === 'off') return

  const gesture = (ev: Event): void => {
    if (!ev.isTrusted) return
    const a = ev.target instanceof Element ? (ev.target.closest('a[href]') as HTMLAnchorElement | null) : null
    ipcRenderer.send('shields:gesture', a ? a.href : '')
  }
  for (const type of ['pointerdown', 'click', 'keydown', 'touchstart']) {
    window.addEventListener(type, gesture, { capture: true, passive: true })
  }

  window.addEventListener('aura-dom-blocked', (ev) => {
    const n = Number((ev as CustomEvent).detail)
    if (Number.isFinite(n) && n > 0) ipcRenderer.send('shields:dom-blocked', Math.min(Math.floor(n), 25))
  })

  try {
    const source = '(' + stealthScriptlet.toString() + ')(' + JSON.stringify(cfg) + ');'
    void webFrame.executeJavaScript(source, false)
  } catch (err) {
    console.warn('[Aura/Shields] scriptlet injection failed:', err)
  }
}

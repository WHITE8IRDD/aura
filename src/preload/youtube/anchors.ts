interface AnchorRule {
  name: string
  find: () => Element | null
  place: (target: Element, host: HTMLElement) => void
}

const q = (sel: string): Element | null => document.querySelector(sel)
const after = (t: Element, h: HTMLElement): void => {
  t.insertAdjacentElement('afterend', h)
}
const prepend = (t: Element, h: HTMLElement): void => {
  t.insertBefore(h, t.firstChild)
}
const append = (t: Element, h: HTMLElement): void => {
  t.appendChild(h)
}

// Prefer SIBLING of subscribe control — never inside ytd-subscribe-button-renderer
const RULES: AnchorRule[] = [
  {
    name: 'after-subscribe-button',
    find: () => q('ytd-watch-metadata #owner #subscribe-button'),
    place: after,
  },
  {
    name: 'after-subscribe-renderer',
    find: () =>
      q(
        'ytd-watch-metadata #owner ytd-subscribe-button-renderer, ytd-watch-metadata #owner yt-subscribe-button-view-model',
      ),
    place: after,
  },
  {
    name: 'actions-prepend',
    find: () => q('ytd-watch-metadata #top-level-buttons-computed'),
    place: prepend,
  },
  {
    name: 'owner-append',
    find: () => q('ytd-watch-metadata #owner'),
    place: append,
  },
  {
    name: 'top-row-append',
    find: () => q('ytd-watch-metadata #top-row'),
    place: append,
  },
]

export interface ResolvedAnchor {
  name: string
  place: (host: HTMLElement) => void
}

export function resolveAnchor(): ResolvedAnchor | null {
  for (const rule of RULES) {
    const target = rule.find()
    if (target && target.isConnected) {
      return { name: rule.name, place: (host) => rule.place(target, host) }
    }
  }
  return null
}

export function probeAnchors(): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const rule of RULES) out[rule.name] = !!rule.find()
  return out
}

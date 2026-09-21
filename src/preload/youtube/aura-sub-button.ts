import { ipcRenderer } from 'electron'
import { YT_IPC, type YtChannelRef, type YtSubResult } from '../../shared/youtube-ipc'
import { readChannelRef, refKey } from './channel-info'

type State = 'loading' | 'idle' | 'subscribed' | 'busy' | 'error'

const CSS = `
:host {
  all: initial; display: inline-flex; align-items: center; flex: none; margin-left: 8px;
  --aura-accent: #7c5cff; --aura-accent-hover: #6a49f0;
  --aura-tonal: rgba(0,0,0,.05); --aura-tonal-hover: rgba(0,0,0,.10); --aura-text: #0f0f0f;
}
:host-context(html[dark]) {
  --aura-tonal: rgba(255,255,255,.10); --aura-tonal-hover: rgba(255,255,255,.20); --aura-text: #f1f1f1;
}
button {
  all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
  height: 36px; padding: 0 16px; border-radius: 18px; cursor: pointer; user-select: none; white-space: nowrap;
  font: 500 14px/36px Roboto, Arial, sans-serif; background: var(--aura-accent); color: #fff;
  transition: background .15s ease, opacity .15s ease, transform .08s ease;
}
button:hover { background: var(--aura-accent-hover); }
button:active { transform: scale(.97); }
button:focus-visible { outline: 2px solid var(--aura-accent); outline-offset: 2px; }
button[data-state="subscribed"] { background: var(--aura-tonal); color: var(--aura-text); }
button[data-state="subscribed"]:hover { background: var(--aura-tonal-hover); }
button[data-state="loading"], button[data-state="busy"] { opacity: .6; cursor: default; }
button[data-state="error"] { background: #cc0000; color: #fff; }
`

export interface AuraSubButton {
  host: HTMLElement
  sync(ref: YtChannelRef): void
  destroy(): void
}

export function createAuraSubButton(): AuraSubButton {
  const host = document.createElement('div')
  host.id = 'aura-sub-host'
  const root = host.attachShadow({ mode: 'open' })
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(CSS)
  root.adoptedStyleSheets = [sheet]

  const btn = document.createElement('button')
  btn.type = 'button'
  root.appendChild(btn)

  let state: State = 'loading'
  let ref: YtChannelRef | null = null
  let key = ''
  let seq = 0

  function render(): void {
    btn.dataset.state = state
    const name = ref?.title ?? 'this channel'
    switch (state) {
      case 'subscribed':
        btn.textContent = '✓ Subscribed'
        btn.title = `Subscribed in Aura. Click to unsubscribe from ${name}`
        break
      case 'busy':
        btn.textContent = '…'
        break
      case 'error':
        btn.textContent = 'Try again'
        btn.title = 'Aura could not complete that. Click to retry'
        break
      default:
        btn.textContent = '+ Aura Sub'
        btn.title = `Subscribe to ${name} in Aura Browser`
    }
  }

  async function queryState(): Promise<'subscribed' | 'idle'> {
    try {
      const res = (await ipcRenderer.invoke(YT_IPC.isSubscribed, ref)) as YtSubResult
      if (!res.ok) {
        console.warn('[Aura YT] is-subscribed failed:', res.error)
        return 'idle'
      }
      return res.subscribed ? 'subscribed' : 'idle'
    } catch (err) {
      console.warn('[Aura YT] is-subscribed threw:', err)
      return 'idle'
    }
  }

  async function refreshState(): Promise<void> {
    if (!ref) return
    const my = ++seq
    state = 'loading'
    render()
    const next = await queryState()
    if (my !== seq) return
    state = next
    render()
  }

  btn.addEventListener('keydown', (e) => e.stopPropagation())

  btn.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (state === 'loading' || state === 'busy') return

    const live = readChannelRef() ?? ref
    if (!live) return

    const wasSubscribed = state === 'subscribed'
    const my = ++seq
    state = 'busy'
    render()
    try {
      // NOTE: Aura's yt:subscribe/yt:unsubscribe return the channel list
      // (single registration shared with the feed UI) — state is derived
      // from a follow-up is-subscribed query, never from the payload.
      if (wasSubscribed) {
        await ipcRenderer.invoke(
          YT_IPC.unsubscribe,
          live.channelId ?? live.handle ?? live.title,
        )
      } else {
        await ipcRenderer.invoke(YT_IPC.subscribe, live)
      }
      if (my !== seq) return
      state = await queryState()
      if (my !== seq) return
      if (state !== (wasSubscribed ? 'idle' : 'subscribed')) {
        console.warn('[Aura YT] state did not flip after action; showing queried state')
      }
    } catch (err) {
      if (my !== seq) return
      console.error('[Aura YT] action threw:', err)
      state = 'error'
    }
    render()
    if (state === 'error') {
      window.setTimeout(() => {
        if (state === 'error') {
          state = wasSubscribed ? 'subscribed' : 'idle'
          render()
        }
      }, 2500)
    }
  })

  render()

  return {
    host,
    sync(next) {
      ref = next
      const nextKey = refKey(next)
      if (nextKey === key) {
        if (state !== 'loading' && state !== 'busy') render()
        return
      }
      key = nextKey
      void refreshState()
    },
    destroy() {
      seq++
      host.remove()
    },
  }
}

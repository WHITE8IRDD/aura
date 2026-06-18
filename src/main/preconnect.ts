import { session } from 'electron'

/**
 * Predictive preconnect — when the user hovers a suggestion in the
 * address bar dropdown, we ask Chromium to start the DNS lookup and
 * TCP+TLS handshake to that origin immediately.
 *
 * If the user clicks within ~500ms (typical hover-to-click time), the
 * connection is already warm and the actual navigation saves 100-400ms
 * on real networks — measurable, free performance win.
 *
 * Safety:
 *  - We only preconnect to http(s) origins.
 *  - We rate-limit to one preconnect per origin per 10 seconds so a
 *    user flicking the mouse over suggestions doesn't open dozens of
 *    sockets.
 *  - Preconnect is a NOOP if the origin can't be reached — no error.
 */

const recentPreconnects = new Map<string, number>()
const COOLDOWN_MS = 10_000

export function preconnect(rawUrl: string): void {
  let origin: string
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return
    origin = u.origin
  } catch {
    return
  }

  const now = Date.now()
  const last = recentPreconnects.get(origin) ?? 0
  if (now - last < COOLDOWN_MS) return
  recentPreconnects.set(origin, now)

  // Chromium will resolve DNS + open a socket. Failure is silent.
  session.defaultSession.resolveHost(new URL(origin).hostname).catch(() => {
    /* ignore — best effort */
  })

  // Prefetch a HEAD to warm the TCP+TLS connection
  // (resolveHost alone doesn't open the socket on all builds)
  session.defaultSession
    .fetch(origin, { method: 'HEAD' })
    .catch(() => {
      /* ignore */
    })
}

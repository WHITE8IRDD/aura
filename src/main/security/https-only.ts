import { type Session } from 'electron'
import { getSetting } from '../settings'

const allowedInsecureHosts = new Set<string>()
const registered = new WeakSet<Session>()

const SKIP_UPGRADE_HOSTS = new Set<string>([
  'youtube.com', 'www.youtube.com', 'google.com', 'www.google.com'
])

function isLocalAddress(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  )
}

export function setupHttpsOnly(targetSession: Session): void {
  if (registered.has(targetSession)) return
  registered.add(targetSession)

  targetSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*'] },
    (details, callback) => {
      if (!getSetting('httpsOnly')) {
        return callback({ cancel: false })
      }
      if (details.resourceType !== 'mainFrame') {
        return callback({ cancel: false })
      }
      try {
        const url = new URL(details.url)
        if (
          allowedInsecureHosts.has(url.host) ||
          isLocalAddress(url.hostname) ||
          SKIP_UPGRADE_HOSTS.has(url.host)
        ) {
          return callback({ cancel: false })
        }
        url.protocol = 'https:'
        callback({ redirectURL: url.toString() })
      } catch {
        callback({ cancel: false })
      }
    }
  )
}

export function allowInsecureHost(host: string): void {
  allowedInsecureHosts.add(host)
}

export function isHostAllowedInsecure(host: string): boolean {
  return allowedInsecureHosts.has(host)
}

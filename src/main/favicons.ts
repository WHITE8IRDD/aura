import { net } from 'electron'

interface CachedFavicon {
  dataUrl: string | null
  fetchedAt: number
}

const cache = new Map<string, CachedFavicon>()
const CACHE_TTL = 24 * 60 * 60 * 1000

export async function fetchFavicon(rawUrl: string): Promise<string | null> {
  let hostname: string
  try {
    hostname = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname
  } catch {
    return null
  }

  const cached = cache.get(hostname)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.dataUrl
  }

  const tryUrls = [
    `https://${hostname}/favicon.ico`,
    `https://www.${hostname}/favicon.ico`
  ]

  for (const url of tryUrls) {
    const dataUrl = await tryFetchAsDataUrl(url)
    if (dataUrl) {
      cache.set(hostname, { dataUrl, fetchedAt: Date.now() })
      return dataUrl
    }
  }

  cache.set(hostname, { dataUrl: null, fetchedAt: Date.now() })
  return null
}

function tryFetchAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request = net.request({ url, redirect: 'follow' })
    const chunks: Buffer[] = []

    const timeout = setTimeout(() => {
      try { request.abort() } catch {}
      resolve(null)
    }, 4000)

    request.on('response', (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        clearTimeout(timeout)
        resolve(null)
        return
      }
      const contentType = String(response.headers['content-type'] ?? 'image/x-icon')
      if (!contentType.startsWith('image/')) {
        clearTimeout(timeout)
        resolve(null)
        return
      }

      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        clearTimeout(timeout)
        if (!chunks.length) return resolve(null)
        const buf = Buffer.concat(chunks)
        if (buf.length > 200_000) return resolve(null)
        resolve(`data:${contentType};base64,${buf.toString('base64')}`)
      })
    })

    request.on('error', () => {
      clearTimeout(timeout)
      resolve(null)
    })

    request.end()
  })
}

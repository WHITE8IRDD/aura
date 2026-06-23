import { Readability, isProbablyReaderable } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

export interface ReaderArticle {
  title: string
  byline: string | null
  siteName: string | null
  excerpt: string | null
  content: string
  textContent: string
  length: number
  readingTimeMin: number
  lang: string | null
  publishedTime: string | null
  leadImageUrl: string | null
  sourceUrl: string
}

export interface ReaderProbeResult {
  readerable: boolean
  reason?: string
}

const WORDS_PER_MIN = 240

export function probeReaderable(html: string, _url: string): ReaderProbeResult {
  try {
    const { document } = parseHTML(html)
    const ok = isProbablyReaderable(document, {
      minContentLength: 280,
      minScore: 20,
    })
    return { readerable: ok }
  } catch (err) {
    return { readerable: false, reason: (err as Error).message }
  }
}

export function extractArticle(html: string, url: string): ReaderArticle | null {
  let document: Document
  try {
    document = parseHTML(html).document
  } catch (err) {
    console.error('[reader] linkedom parse failed', err)
    return null
  }

  const reader = new Readability(document, {
    charThreshold: 250,
    keepClasses: false,
    classesToPreserve: ['caption', 'figure'],
  })

  const parsed = reader.parse()
  if (!parsed || !parsed.content) return null

  const words = (parsed.textContent ?? '').trim().split(/\s+/).length
  const readingTimeMin = Math.max(1, Math.round(words / WORDS_PER_MIN))

  let leadImageUrl: string | null = null
  try {
    const { document: imgDoc } = parseHTML(parsed.content)
    const img = imgDoc.querySelector('img[src]')
    if (img) leadImageUrl = img.getAttribute('src')
  } catch { }

  if (!leadImageUrl) {
    const og =
      document.querySelector('meta[property="og:image"]') ||
      document.querySelector('meta[name="twitter:image"]')
    if (og) leadImageUrl = og.getAttribute('content')
  }

  let publishedTime: string | null = null
  const pubMeta =
    document.querySelector('meta[property="article:published_time"]') ||
    document.querySelector('meta[name="date"]')
  if (pubMeta) publishedTime = pubMeta.getAttribute('content')

  return {
    title: parsed.title ?? 'Untitled',
    byline: parsed.byline ?? null,
    siteName: parsed.siteName ?? null,
    excerpt: parsed.excerpt ?? null,
    content: parsed.content,
    textContent: parsed.textContent ?? '',
    length: parsed.textContent?.length ?? 0,
    readingTimeMin,
    lang: parsed.lang ?? null,
    publishedTime,
    leadImageUrl,
    sourceUrl: url,
  }
}

import type { WebContents } from 'electron'

export async function getReaderPayload(
  wc: WebContents
): Promise<{ url: string; title: string; html: string } | null> {
  try {
    const url = wc.getURL()
    const title = wc.getTitle()
    const html = (await wc.executeJavaScript(
      `document.documentElement.outerHTML`,
      true
    )) as string
    return { url, title, html }
  } catch (err) {
    console.warn('[Aura/reader] Extraction failed:', err)
    return null
  }
}

import React, { useEffect, useState } from 'react'
import { Readability } from '../vendor/readability.js'

interface Props {
  tabId: number
  onExit: () => void
}

interface ParsedArticle {
  title: string
  byline: string | null
  content: string
  length: number
  excerpt: string
  siteName: string | null
}

/**
 * Reader-mode page. Asks main to extract the current tab's HTML, parses
 * it with Readability, and renders a clean article view.
 */
export default function ReaderPage({ tabId, onExit }: Props): React.ReactElement {
  const [article, setArticle] = useState<ParsedArticle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState<number>(18)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      const payload = await window.aura.tabs.readerExtract(tabId)
      if (cancelled) return
      if (!payload) {
        setError("Couldn't read this page — try again after it finishes loading.")
        return
      }
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(payload.html, 'text/html')
        const reader = new Readability(doc)
        const result = reader.parse()
        if (!result) {
          setError("This page doesn't look like an article. Reader mode works best on long-form text.")
          return
        }
        setArticle({
          title: result.title || payload.title || 'Untitled',
          byline: result.byline,
          content: result.content,
          length: result.length,
          excerpt: result.excerpt,
          siteName: result.siteName
        })
      } catch (e) {
        console.warn('Reader parse error:', e)
        setError("Couldn't parse this page in reader mode.")
      }
    }

    void load()
    return () => { cancelled = true }
  }, [tabId])

  if (error) {
    return (
      <div className="reader-page">
        <div className="reader-toolbar">
          <button className="reader-exit" onClick={onExit}>Exit reader</button>
        </div>
        <div className="reader-error">{error}</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="reader-page">
        <div className="reader-loading">Preparing reader mode\u2026</div>
      </div>
    )
  }

  const minutes = Math.max(1, Math.round(article.length / 1000))

  return (
    <div className="reader-page" style={{ fontSize: `${fontSize}px` }}>
      <div className="reader-toolbar">
        <button className="reader-exit" onClick={onExit}>&larr; Exit reader</button>
        <div className="reader-font-controls">
          <button onClick={() => setFontSize((s) => Math.max(14, s - 1))} title="Smaller text">A&minus;</button>
          <span>{fontSize}px</span>
          <button onClick={() => setFontSize((s) => Math.min(28, s + 1))} title="Larger text">A+</button>
        </div>
      </div>

      <article className="reader-article">
        <header className="reader-header">
          <h1>{article.title}</h1>
          {article.byline && <div className="reader-byline">{article.byline}</div>}
          <div className="reader-meta">
            {article.siteName && <span>{article.siteName}</span>}
            <span>&middot; {minutes} min read</span>
          </div>
        </header>

        <div
          className="reader-body"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>
    </div>
  )
}

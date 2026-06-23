import React, { useState, useEffect, useRef } from 'react'

interface ReaderArticle {
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

interface ReaderPrefs {
  theme: 'light' | 'sepia' | 'dark'
  font: 'serif' | 'sans' | 'mono'
  width: 'narrow' | 'medium' | 'wide'
  fontSize: number
}

const DEFAULT_PREFS: ReaderPrefs = {
  theme: 'dark',
  font: 'sans',
  width: 'medium',
  fontSize: 18,
}

function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem('aura:reader-prefs')
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch { }
  return DEFAULT_PREFS
}

function savePrefs(p: ReaderPrefs) {
  localStorage.setItem('aura:reader-prefs', JSON.stringify(p))
}

interface Props {
  tabId: number
  onExit: () => void
}

export default function ReaderPage({ tabId, onExit }: Props) {
  const [article, setArticle] = useState<ReaderArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<ReaderPrefs>(loadPrefs)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [controlsExpanded, setControlsExpanded] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => { savePrefs(prefs) }, [prefs])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(window as any).aura.reader.getCurrent(tabId)
      .then((a: ReaderArticle | null) => {
        if (cancelled) return
        if (!a) { setError('Could not parse article'); setLoading(false); return }
        setArticle(a)
        setLoading(false)
      })
      .catch((e: any) => {
        if (cancelled) return
        setError(e?.message || 'Failed to load article')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [tabId])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = root
      const max = scrollHeight - clientHeight
      setScrollProgress(max > 0 ? (scrollTop / max) * 100 : 0)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [article])

  useEffect(() => {
    if (!article) return
    const container = contentRef.current
    if (!container) return

    const styles = container.querySelectorAll('style')
    styles.forEach((s) => s.remove())

    const scripts = container.querySelectorAll('script')
    scripts.forEach((s) => s.remove())

    const allElements = container.querySelectorAll('[style]')
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.removeProperty('font-size')
      htmlEl.style.removeProperty('font-family')
      htmlEl.style.removeProperty('line-height')
      htmlEl.style.removeProperty('color')
      htmlEl.style.removeProperty('background')
      htmlEl.style.removeProperty('background-color')
    })

    const images = container.querySelectorAll('img')
    images.forEach((img) => {
      const hide = () => {
        img.style.display = 'none'
        const figure = img.closest('figure')
        if (figure) (figure as HTMLElement).style.display = 'none'
      }
      img.addEventListener('error', hide)
      if (img.complete && img.naturalWidth === 0) hide()
    })
  }, [article])

  useEffect(() => {
    if (!controlsExpanded) return
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setControlsExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [controlsExpanded])

  const readingTime = article
    ? Math.max(1, Math.ceil((article.content.replace(/<[^>]*>/g, '').split(/\s+/).length) / 230))
    : 0

  let hostname = ''
  try { hostname = article ? new URL(article.sourceUrl).hostname : '' } catch { }

  const metaParts: string[] = []
  if (article?.byline) metaParts.push(article.byline)
  if (article?.publishedTime) {
    try { metaParts.push(new Date(article.publishedTime).toLocaleDateString()) } catch { }
  }
  if (readingTime > 0) metaParts.push(`${readingTime} min read`)

  const cycleFont = () => {
    const fonts: Array<'serif' | 'sans' | 'mono'> = ['serif', 'sans', 'mono']
    const i = fonts.indexOf(prefs.font)
    setPrefs(p => ({ ...p, font: fonts[(i + 1) % fonts.length] }))
  }
  const fontLabel = prefs.font === 'serif' ? 'Se' : prefs.font === 'mono' ? 'Mo' : 'Sa'

  const cycleWidth = () => {
    const widths: Array<'narrow' | 'medium' | 'wide'> = ['narrow', 'medium', 'wide']
    const i = widths.indexOf(prefs.width)
    setPrefs(p => ({ ...p, width: widths[(i + 1) % widths.length] }))
  }

  const handleExit = () => {
    ;(window as any).aura.reader.exit(tabId)
    onExit()
  }

  if (loading) {
    return (
      <div className="r-root" data-theme={prefs.theme} data-font={prefs.font} data-width={prefs.width}>
        <div className="r-article" style={{ textAlign: 'center', paddingTop: '120px' }}>
          <div className="r-loading">Loading article...</div>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="r-root" data-theme={prefs.theme} data-font={prefs.font} data-width={prefs.width}>
        <div className="r-article" style={{ textAlign: 'center', paddingTop: '120px' }}>
          <div className="r-error">{error || 'Could not load article'}</div>
          <button className="r-back-btn" onClick={handleExit}>Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="r-root"
      data-theme={prefs.theme}
      data-font={prefs.font}
      data-width={prefs.width}
      style={{ '--r-font-size': `${prefs.fontSize}px` } as React.CSSProperties}
    >
      <div className="r-progress" style={{ width: `${scrollProgress}%` }} />

      {!controlsExpanded ? (
        <button
          className="r-toolbar-trigger"
          onClick={() => setControlsExpanded(true)}
          title="Reading controls"
        >
          <span className="r-trigger-icon">
            <span /><span /><span />
          </span>
        </button>
      ) : (
        <div className="r-toolbar" ref={toolbarRef}>
          <div className="r-toolbar-group">
            <button
              className="r-tb-btn"
              onClick={() => setPrefs(p => ({ ...p, fontSize: Math.max(14, p.fontSize - 2) }))}
              title="Decrease text size"
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Aa</span>
            </button>
            <button
              className="r-tb-btn"
              onClick={() => setPrefs(p => ({ ...p, fontSize: Math.min(28, p.fontSize + 2) }))}
              title="Increase text size"
            >
              <span style={{ fontSize: '18px', fontWeight: 600 }}>Aa</span>
            </button>
          </div>

          <div className="r-toolbar-divider" />

          <div className="r-toolbar-group">
            {(['light', 'sepia', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={`r-swatch r-swatch-${t}${prefs.theme === t ? ' active' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, theme: t }))}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
              />
            ))}
          </div>

          <div className="r-toolbar-divider" />

          <button className="r-tb-btn" onClick={cycleFont} title={`Font: ${prefs.font}`}>
            <span style={{
              fontFamily: prefs.font === 'serif' ? 'Georgia' : prefs.font === 'mono' ? 'monospace' : 'system-ui',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              {fontLabel}
            </span>
          </button>

          <div className="r-toolbar-divider" />

          <button className="r-tb-btn" onClick={cycleWidth} title={`Width: ${prefs.width}`}>
            <span style={{ fontSize: '16px' }}>↔</span>
          </button>

          <div className="r-toolbar-divider" />

          <button className="r-tb-btn r-tb-close" onClick={handleExit} title="Exit reader">
            ✕
          </button>
        </div>
      )}

      <article className="r-article">
        {hostname && (
          <div className="r-site">
            <img
              className="r-site-favicon"
              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
              alt=""
              width={20}
              height={20}
            />
            <span className="r-site-name">{hostname}</span>
          </div>
        )}

        <h1 className="r-title">{article.title}</h1>

        {article.excerpt && <p className="r-excerpt">{article.excerpt}</p>}

        {metaParts.length > 0 && (
          <div className="r-meta">{metaParts.join(' · ')}</div>
        )}

        <hr className="r-divider" />

        {article.leadImageUrl && (
          <div className="r-lead">
            <img src={article.leadImageUrl} alt="" className="r-lead-img" />
          </div>
        )}

        <div
          ref={contentRef}
          className="r-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <div className="r-footer">
          <button className="r-back-btn" onClick={handleExit}>
            ← Back to {hostname || 'page'}
          </button>
        </div>
      </article>
    </div>
  )
}

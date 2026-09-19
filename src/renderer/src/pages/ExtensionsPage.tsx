import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChromePageHeader } from '../components/ChromePageHeader'
import type { ExtensionItem } from '../../../shared/aura-features'

interface Props {
  onClose: () => void
}

interface InstallResult {
  success: boolean
  id?: string
  error?: string
}

const STORE_SUGGESTIONS = [
  { label: 'Bitwarden', url: 'https://chromewebstore.google.com/detail/bitwarden/cjpalhdlnbpafiamejdnhcphjbkeiagm' },
  { label: 'Dark Reader', url: 'https://chromewebstore.google.com/detail/dark-reader/eimfamddlgamimgfonpumjcpkolpddjj' },
  { label: 'Stylus', url: 'https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobkbiopenh' },
]

const STORE_URL_RE = /chromewebstore\.google\.com|chrome\.google\.com\/webstore|[a-p]{32}/i

function PuzzleArt(): React.ReactElement {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 7V5a2 2 0 0 0-4 0v2H7a2 2 0 0 0-2 2v3h2a2 2 0 1 1 0 4H5v3a2 2 0 0 0 2 2h3v-2a2 2 0 1 1 4 0v2h3a2 2 0 0 0 2-2v-3h-2a2 2 0 1 1 0-4h2V9a2 2 0 0 0-2-2h-3z" />
    </svg>
  )
}

export default function ExtensionsPage({ onClose }: Props): React.ReactElement {
  const [items, setItems] = useState<ExtensionItem[]>([])
  const [icons, setIcons] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const toastTimer = useRef(0)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const list = (await window.auraFeatures?.extensions.list()) ?? []
      setItems(list)
      for (const ext of list) {
        try {
          const dataUrl = await window.aura.extensions.getIcon(ext.id)
          if (dataUrl) {
            setIcons((prev) => (prev[ext.id] ? prev : { ...prev, [ext.id]: dataUrl }))
          }
        } catch { /* icon optional */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load extensions')
    }
  }, [])

  useEffect(() => {
    void refresh()
    let off: (() => void) | undefined
    try {
      off = window.auraFeatures?.extensions.onChanged(() => { void refresh() })
    } catch { /* no bridge */ }
    return () => {
      window.clearTimeout(toastTimer.current)
      try { off?.() } catch { /* torn down */ }
    }
  }, [refresh])

  const runInstall = useCallback(async (kind: string, fn: () => Promise<InstallResult>) => {
    setBusy(kind)
    setError(null)
    try {
      const r = await fn()
      if (!r?.success) {
        setError(r?.error || 'Install failed')
      } else {
        showToast(`Installed ${r.id ?? 'extension'}`)
        await refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed')
    } finally {
      setBusy(null)
    }
  }, [refresh, showToast])

  const installFromQuery = useCallback(() => {
    const q = query.trim()
    if (!q) {
      setError('Paste a Chrome Web Store URL or 32-character extension ID.')
      return
    }
    if (!STORE_URL_RE.test(q)) {
      setError('Paste a full Chrome Web Store URL or 32-character extension ID.')
      return
    }
    void runInstall('query', async () => {
      const r = (await window.auraFeatures?.extensions.installStoreUrl(q)) as InstallResult | undefined
      if (!r?.success) return r ?? { success: false, error: 'Install failed' }
      setQuery('')
      return r
    })
  }, [query, runInstall])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = [...e.dataTransfer.files]
    const crxFiles = files.filter((f) => /\.crx$/i.test(f.name) || /\.crx$/i.test((f as File & { path?: string }).path ?? ''))
    if (crxFiles.length === 0) {
      setError('Drop .crx files here — or use Load Unpacked for extension folders.')
      return
    }
    void (async () => {
      for (const f of crxFiles) {
        const p = (f as File & { path?: string }).path
        if (!p) continue
        await runInstall(`drop:${f.name}`, async () => {
          const r = (await window.auraFeatures?.extensions.installPath(p)) as InstallResult | undefined
          return r ?? { success: false, error: 'Install failed' }
        })
      }
    })()
  }, [runInstall])

  const handleToggle = useCallback((ext: ExtensionItem) => {
    void (async () => {
      try {
        await window.auraFeatures?.extensions.setEnabled(ext.id, !(ext.enabled === 1))
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Toggle failed')
      }
    })()
  }, [refresh])

  const handleUninstall = useCallback((ext: ExtensionItem) => {
    if (!window.confirm(`Remove "${ext.name}" and delete its files?`)) return
    void (async () => {
      try {
        const r = (await window.auraFeatures?.extensions.uninstall(ext.id)) as InstallResult | undefined
        if (!r?.success) setError(r?.error || 'Uninstall failed')
        else {
          showToast(`Removed ${ext.name}`)
          await refresh()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Uninstall failed')
      }
    })()
  }, [refresh, showToast])

  return (
    <div
      className="data-page"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <header className="data-header">
        <ChromePageHeader title="Extensions" onBack={onClose} />
        <div className="data-header-actions">
          <button
            className="data-btn"
            onClick={() => void runInstall('folder', async () =>
              (await window.auraFeatures?.extensions.installUnpacked()) as InstallResult)}
            disabled={busy !== null}
          >
            {busy === 'folder' ? 'Loading…' : 'Load Unpacked'}
          </button>
          <button
            className="data-btn"
            onClick={() => void runInstall('crx', async () =>
              (await window.auraFeatures?.extensions.installCrx()) as InstallResult)}
            disabled={busy !== null}
          >
            {busy === 'crx' ? 'Installing…' : 'Install CRX'}
          </button>
          <button
            className="data-btn"
            onClick={() => { void window.aura.extensions.openStore() }}
          >
            Web Store
          </button>
        </div>
      </header>

      {toast && <div className="extp-toast" role="status">{toast}</div>}

      <div className={`extp-install-card${dragOver ? ' drag-over' : ''}`}>
        <div className="extp-install-head">
          <span className="extp-install-icon" aria-hidden="true">🔍</span>
          <div>
            <div className="extp-install-title">Add Extension</div>
            <div className="extp-install-sub">Paste a Chrome Web Store URL or extension ID</div>
          </div>
        </div>
        <div className="extp-install-row">
          <input
            type="text"
            className="extp-install-input"
            placeholder="https://chromewebstore.google.com/detail/…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') installFromQuery() }}
            disabled={busy !== null}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="extp-install-btn"
            onClick={installFromQuery}
            disabled={busy !== null || !query.trim()}
          >
            {busy === 'query' ? 'Installing…' : 'Install Extension'}
          </button>
        </div>
        <div className="extp-helper">Works with any chromewebstore.google.com link — no need for the Store&apos;s Add button.</div>
        {error && <div className="extp-error" role="alert">{error}</div>}
      </div>

      <div className="extp-tip">
        Chrome Web Store&apos;s Add button is blocked for custom browsers. Copy the extension page URL and paste it above to install.
      </div>

      <div className="extp-conflict">
        Aura already includes the built-in Shields adblocker — installing another adblocker (uBlock, AdBlock) may duplicate filtering.
        Prefer Aura Shields for ads; use extensions for password managers, dark themes, user scripts, etc.
      </div>

      <h3 className="extp-section-title">INSTALLED ({items.length})</h3>
      {items.length === 0 ? (
        <div className="extp-empty">
          <div className="extp-empty-icon"><PuzzleArt /></div>
          <div className="extp-empty-title">No extensions yet</div>
          <p className="extp-empty-sub">
            Load an unpacked folder, install a .crx file, drop one anywhere on this page,
            or paste a Chrome Web Store link above.
          </p>
          <div className="extp-chips">
            {STORE_SUGGESTIONS.map((s) => (
              <button key={s.label} className="extp-chip" onClick={() => setQuery(s.url)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="extp-grid">
          {items.map((ext) => {
            const icon = icons[ext.id]
            const expanded = detailsId === ext.id
            return (
              <div key={ext.id} className="extp-card">
                <div className="extp-card-top">
                  <div className="extp-card-icon" aria-hidden="true">
                    {icon ? (
                      <img src={icon} alt="" width={40} height={40} />
                    ) : (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                    )}
                  </div>
                  <div className="extp-card-head">
                    <div className="extp-card-name">{ext.name}</div>
                    <div className="extp-card-ver">v{ext.version}</div>
                  </div>
                  <label className="extp-toggle" title={ext.enabled === 1 ? 'Disable' : 'Enable'}>
                    <input
                      type="checkbox"
                      checked={ext.enabled === 1}
                      onChange={() => handleToggle(ext)}
                    />
                    <span className="extp-toggle-track"><span className="extp-toggle-knob" /></span>
                  </label>
                </div>
                <div className="extp-card-actions">
                  <button className="extp-link" onClick={() => setDetailsId(expanded ? null : ext.id)}>
                    {expanded ? 'Hide details' : 'Details'}
                  </button>
                  <button className="extp-delete" onClick={() => handleUninstall(ext)} title={`Remove ${ext.name}`}>
                    🗑
                  </button>
                </div>
                {expanded && (
                  <dl className="extp-details">
                    {ext.description && (<><dt>Description</dt><dd>{ext.description}</dd></>)}
                    {ext.author && (<><dt>Author</dt><dd>{ext.author}</dd></>)}
                    <dt>Extension ID</dt><dd className="extp-mono">{ext.id}</dd>
                    <dt>Source</dt><dd>{ext.sourceType} · {ext.sourcePath}</dd>
                  </dl>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

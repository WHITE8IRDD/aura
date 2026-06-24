import React, { useEffect, useState, useCallback, useRef } from 'react'
import { ChromePageHeader } from '../components/ChromePageHeader'
import { IconExtension, IconClose } from '../components/Icons'
import { EXTENSIONS_CATALOG, type CatalogEntry, getCatalogIconSrc } from '../data/extensionsCatalog'

interface ExtRecord {
  id: string
  name: string
  version: string
  description: string
  author: string
  homeUrl: string
  iconPath: string
  sourceType: string
  sourcePath: string
  enabled: number
  installed_at: number
}

function toAppIconUrl(iconPath: string | null): string | null {
  if (!iconPath) return null
  return `app-icon://${encodeURIComponent(iconPath)}`
}

interface Props {
  onClose: () => void
}

export default function ExtensionsPage({ onClose }: Props): React.ReactElement {
  const [extensions, setExtensions] = useState<ExtRecord[]>([])
  const [icons, setIcons] = useState<Record<string, string | null>>({})
  const [installing, setInstalling] = useState<'folder' | 'crx' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [storeUrl, setStoreUrl] = useState('')
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<CatalogEntry[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const list = await window.aura.extensions.list()
    setExtensions(list)
    const iconMap: Record<string, string | null> = {}
    for (const ext of list) {
      iconMap[ext.id] = null
      window.aura.extensions.getIcon(ext.id).then(dataUrl => {
        setIcons(prev => ({ ...prev, [ext.id]: dataUrl }))
      })
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const input = storeUrl.trim()
    const isId = /^[a-p]{32}$/.test(input)
    const isUrl = input.startsWith('http') || input.includes('chromewebstore')

    if (!input || isId || isUrl) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const q = input.toLowerCase()
    const results = EXTENSIONS_CATALOG
      .filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aStart = a.name.toLowerCase().startsWith(q) ? 0 : 1
        const bStart = b.name.toLowerCase().startsWith(q) ? 0 : 1
        return aStart - bStart
      })
      .slice(0, 7)

    setSearchResults(results)
    setShowDropdown(results.length > 0)
  }, [storeUrl])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInstallFolder = async () => {
    setInstalling('folder')
    const result = await window.aura.extensions.installFolder()
    setInstalling(null)
    if (result.cancelled) return
    if (result.success) {
      setMessage(`Installed: ${result.id}`)
      await load()
    } else {
      setMessage(`Error: ${result.error}`)
    }
    setTimeout(() => setMessage(null), 4000)
  }

  const handleInstallCrx = async () => {
    setInstalling('crx')
    const result = await window.aura.extensions.installCrx()
    setInstalling(null)
    if (result.cancelled) return
    if (result.success) {
      setMessage(`Installed: ${result.id}`)
      await load()
    } else {
      setMessage(`Error: ${result.error}`)
    }
    setTimeout(() => setMessage(null), 4000)
  }

  const handleToggle = async (ext: ExtRecord) => {
    if (ext.enabled) {
      const r = await window.aura.extensions.disable(ext.id)
      if (!r.success) setMessage(`Error: ${r.error}`)
    } else {
      const r = await window.aura.extensions.enable(ext.id)
      if (!r.success) setMessage(`Error: ${r.error}`)
    }
    await load()
  }

  const handleDelete = async (ext: ExtRecord) => {
    const r = await window.aura.extensions.delete(ext.id)
    if (r.success) {
      setMessage(`Deleted: ${ext.name}`)
      await load()
    } else {
      setMessage(`Error: ${r.error}`)
    }
    setTimeout(() => setMessage(null), 4000)
  }

  const handleInstallEntry = async (entry: CatalogEntry) => {
    setShowDropdown(false)
    setInstallingId(entry.id)
    setError(null)
    try {
      const result = await (window as any).aura.extensions.installFromUrl(entry.id)
      if (!result?.success) {
        setError(result?.error || `Failed to install ${entry.name}`)
      } else {
        setStoreUrl('')
      }
    } catch (err: any) {
      setError(err?.message || `Failed to install ${entry.name}`)
    } finally {
      setInstallingId(null)
    }
  }

  const handleSmartInstall = async () => {
    const input = storeUrl.trim()
    if (!input) { setError('Enter an extension name, URL, or ID'); return }
    setError(null)

    const isId = /^[a-p]{32}$/.test(input)
    const isUrl = input.startsWith('http') || input.includes('chromewebstore')

    if (isId || isUrl) {
      setInstallingId('url')
      try {
        const result = await (window as any).aura.extensions.installFromUrl(input)
        if (!result?.success) {
          setError(result?.error || 'Installation failed')
        } else {
          setStoreUrl('')
          setShowDropdown(false)
        }
      } catch (err: any) {
        setError(err?.message || 'Installation failed')
      } finally {
        setInstallingId(null)
      }
    } else if (searchResults.length > 0) {
      handleInstallEntry(searchResults[0])
    } else {
      setError('No match found — try pasting the extension URL or ID')
    }
  }

  return (
    <div className="data-page">
      <header className="data-header">
        <ChromePageHeader title="Extensions" onBack={onClose} />
        <div className="data-header-actions">
          <button className="data-btn" onClick={handleInstallFolder} disabled={installing !== null}>
            {installing === 'folder' ? 'Loading…' : 'Load Unpacked'}
          </button>
          <button className="data-btn primary" onClick={handleInstallCrx} disabled={installing !== null}>
            {installing === 'crx' ? 'Installing…' : 'Install CRX'}
          </button>
          <button className="data-btn" onClick={() => window.aura.extensions.openStore()}>
            Chrome Web Store
          </button>
        </div>
      </header>

      <div className="ext-install-card">
        <div className="ext-install-card-header">
          <div className="ext-install-card-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div>
            <h3 className="ext-install-title">Add Extension</h3>
            <p className="ext-install-subtitle">Search by name, or paste a Chrome Web Store URL</p>
          </div>
        </div>

        <div className="ext-search-wrap" style={{ position: 'relative' }}>
          <div className="ext-search-row">
            <div className="ext-search-input-wrap">
              <svg className="ext-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="ext-search-input"
                placeholder="uBlock, Dark Reader, Bitwarden…"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (showDropdown && searchResults.length > 0) handleInstallEntry(searchResults[0])
                    else handleSmartInstall()
                  }
                  if (e.key === 'Escape') setShowDropdown(false)
                }}
                disabled={installingId !== null}
                autoComplete="off"
                spellCheck={false}
              />
              {storeUrl && (
                <button
                  className="ext-search-clear"
                  onClick={() => { setStoreUrl(''); setShowDropdown(false); inputRef.current?.focus() }}
                  tabIndex={-1}
                  aria-label="Clear"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
            <button
              className={`ext-install-btn${installingId ? ' ext-install-btn--loading' : ''}`}
              onClick={handleSmartInstall}
              disabled={installingId !== null || !storeUrl.trim()}
            >
              {installingId === 'url' ? (
                <span className="ext-btn-spinner" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              )}
              <span>{installingId === 'url' ? 'Installing' : 'Install'}</span>
            </button>
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div ref={dropdownRef} className="ext-dropdown">
              {searchResults.map((entry, i) => (
                <button
                  key={entry.id}
                  className="ext-dropdown-item"
                  style={{ animationDelay: `${i * 0.03}s` }}
                  onClick={() => handleInstallEntry(entry)}
                  disabled={installingId === entry.id}
                >
                  <div className="ext-autocomplete-icon">
                    {installingId === entry.id ? (
                      <span className="ext-btn-spinner ext-btn-spinner--sm" />
                    ) : (
                      <img src={getCatalogIconSrc(entry)} alt="" width={28} height={28} />
                    )}
                  </div>
                  <div className="ext-dropdown-text">
                    <span className="ext-dropdown-name">{entry.name}</span>
                    <span className="ext-dropdown-desc">{entry.description}</span>
                  </div>
                  <span className="ext-dropdown-badge">{entry.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="ext-error-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {message && <div className="ext-toast">{message}</div>}

      <div className="data-list">
        {extensions.length === 0 ? (
          <div className="data-empty">
            <div className="ext-empty-icon">
              <IconExtension size={40} />
            </div>
            <p>No extensions installed.</p>
            <p className="ext-empty-sub">
              Load an unpacked extension from a folder, install a <code>.crx</code> file, or browse the Chrome Web Store.
            </p>
          </div>
        ) : (
          extensions.map((ext) => (
            <div key={ext.id} className="ext-card">
              <div className="ext-card-icon">
                {ext.icon_path ? (
                  <img
                    src={toAppIconUrl(ext.icon_path)!}
                    alt=""
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`ext-card-icon-fallback ${ext.icon_path ? 'hidden' : ''}`}>
                  {ext.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div className="ext-info">
                <div className="ext-name">{ext.name}</div>
                <div className="ext-meta">
                  <span className="ext-version">{ext.version}</span>
                  <span className="ext-sep">&middot;</span>
                  <span className={`ext-source-badge ext-source-${ext.sourceType}`}>{ext.sourceType}</span>
                </div>
                {ext.description && <div className="ext-desc">{ext.description}</div>}
                {ext.author && <div className="ext-author">by {ext.author}</div>}
              </div>
              <div className="ext-actions">
                <label className="ext-toggle">
                  <input
                    type="checkbox"
                    checked={ext.enabled === 1}
                    onChange={() => handleToggle(ext)}
                  />
                  <span />
                </label>
                <button className="ext-delete" onClick={() => handleDelete(ext)} title="Remove extension">
                  <IconClose size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

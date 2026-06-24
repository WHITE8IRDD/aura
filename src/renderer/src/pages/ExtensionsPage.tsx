import React, { useEffect, useState, useCallback } from 'react'
import { ChromePageHeader } from '../components/ChromePageHeader'
import { IconExtension, IconClose } from '../components/Icons'

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

interface Props {
  onClose: () => void
}

export default function ExtensionsPage({ onClose }: Props): React.ReactElement {
  const [extensions, setExtensions] = useState<ExtRecord[]>([])
  const [icons, setIcons] = useState<Record<string, string | null>>({})
  const [installing, setInstalling] = useState<'folder' | 'crx' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [storeUrl, setStoreUrl] = useState('')
  const [installingFromUrl, setInstallingFromUrl] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    name: string
    description: string
    iconUrl: string
  }>>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

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

  const handleSmartInstall = async () => {
    const input = storeUrl.trim()
    if (!input) {
      setMessage('Please enter an extension name, URL, or ID')
      return
    }
    setMessage(null)

    const isExtensionId = /^[a-p]{32}$/.test(input)
    const isUrl = input.startsWith('http://') || input.startsWith('https://') ||
                  input.includes('chromewebstore.google.com') ||
                  input.includes('chrome.google.com')

    if (isExtensionId || isUrl) {
      setInstallingFromUrl(true)
      try {
        const result = await (window as any).aura.extensions.installFromUrl(input)
        if (!result?.success) {
          setMessage(result?.error || 'Failed to install extension')
        } else {
          setStoreUrl('')
          setShowResults(false)
          setMessage(`Installed: ${result.id}`)
          await load()
        }
      } catch (err: any) {
        setMessage(err?.message || 'Failed to install extension')
      } finally {
        setInstallingFromUrl(false)
      }
    } else {
      setSearching(true)
      setShowResults(true)
      try {
        const result = await (window as any).aura.extensions.search(input)
        if (result?.success && result.results.length > 0) {
          setSearchResults(result.results)
        } else {
          setSearchResults([])
          setMessage(result?.error || 'No extensions found. Try pasting the Web Store URL directly.')
        }
      } catch (err: any) {
        setMessage(err?.message || 'Search failed')
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }
    setTimeout(() => setMessage(null), 4000)
  }

  const handleInstallSearchResult = async (extensionId: string) => {
    setMessage(null)
    setInstallingFromUrl(true)
    try {
      const result = await (window as any).aura.extensions.installFromUrl(extensionId)
      if (!result?.success) {
        setMessage(result?.error || 'Failed to install extension')
      } else {
        setStoreUrl('')
        setShowResults(false)
        setSearchResults([])
        setMessage(`Installed: ${result.id}`)
        await load()
      }
    } catch (err: any) {
      setMessage(err?.message || 'Failed to install extension')
    } finally {
      setInstallingFromUrl(false)
    }
    setTimeout(() => setMessage(null), 4000)
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

      <div className="ext-url-install">
        <div className="ext-url-install-header">
          <h3>Install from Chrome Web Store</h3>
          <p>Type extension name, paste URL, or enter extension ID</p>
        </div>
        <div className="ext-url-input-row">
          <input
            type="text"
            className="ext-url-input"
            placeholder="e.g. uBlock Origin, or paste URL..."
            value={storeUrl}
            onChange={(e) => {
              setStoreUrl(e.target.value)
              if (showResults) setShowResults(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSmartInstall()
            }}
            disabled={installingFromUrl || searching}
          />
          <button
            className="ext-url-install-btn"
            onClick={handleSmartInstall}
            disabled={(installingFromUrl || searching) || !storeUrl.trim()}
          >
            {installingFromUrl ? 'Installing...' :
             searching ? 'Searching...' :
             'Install'}
          </button>
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="ext-search-results">
            <div className="ext-search-results-header">
              <span>Search Results</span>
              <button
                className="ext-search-close"
                onClick={() => {
                  setShowResults(false)
                  setSearchResults([])
                }}
              >
                ✕
              </button>
            </div>
            {searchResults.slice(0, 5).map((result) => (
              <div key={result.id} className="ext-search-result">
                <div className="ext-search-result-icon">
                  {result.iconUrl ? (
                    <img src={result.iconUrl} alt="" width="32" height="32" />
                  ) : (
                    <div className="ext-search-result-icon-fallback">
                      {result.name[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="ext-search-result-info">
                  <div className="ext-search-result-name">{result.name}</div>
                  <div className="ext-search-result-desc">{result.description}</div>
                </div>
                <button
                  className="ext-search-result-install"
                  onClick={() => handleInstallSearchResult(result.id)}
                  disabled={installingFromUrl}
                >
                  {installingFromUrl ? '...' : 'Install'}
                </button>
              </div>
            ))}
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
              <div className="ext-icon">
                {icons[ext.id] ? (
                  <img src={icons[ext.id]!} alt="" className="ext-icon-img" />
                ) : (
                  <IconExtension size={24} />
                )}
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

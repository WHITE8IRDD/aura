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

  const handleInstallFromUrl = async () => {
    if (!storeUrl.trim()) {
      setMessage('Please paste a Chrome Web Store URL')
      return
    }
    setMessage(null)
    setInstallingFromUrl(true)
    try {
      const result = await (window as any).aura.extensions.installFromUrl(storeUrl)
      if (!result?.success) {
        setMessage(result?.error || 'Failed to install extension')
      } else {
        setStoreUrl('')
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
          <h3>Install from Chrome Web Store URL</h3>
          <p>Paste any Chrome Web Store extension URL or extension ID</p>
        </div>
        <div className="ext-url-input-row">
          <input
            type="text"
            className="ext-url-input"
            placeholder="https://chromewebstore.google.com/detail/..."
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInstallFromUrl()
            }}
            disabled={installingFromUrl}
          />
          <button
            className="ext-url-install-btn"
            onClick={handleInstallFromUrl}
            disabled={installingFromUrl || !storeUrl.trim()}
          >
            {installingFromUrl ? 'Installing...' : 'Install'}
          </button>
        </div>
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface ShelfDownload {
  id: number
  url: string
  filename: string
  savePath: string
  mimeType: string | null
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  startedAt: number
  completedAt: number | null
}

interface ContextMenuState {
  x: number
  y: number
  download: ShelfDownload
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatSpeed(bytesPerSec: number): string {
  return formatBytes(bytesPerSec) + '/s'
}

function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return ''
  if (seconds < 60) return Math.round(seconds) + 's remaining'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m + 'm ' + s + 's remaining'
}

function fileTypeIcon(mimeType: string | null, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image'
  }
  if (mimeType?.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) {
    return 'video'
  }
  if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma'].includes(ext)) {
    return 'audio'
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return 'archive'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'].includes(ext)) return 'document'
  if (['js', 'ts', 'html', 'css', 'py', 'json', 'xml', 'yaml', 'toml', 'sh', 'bat'].includes(ext)) return 'code'
  return 'generic'
}

const FileTypeSVG: React.FC<{ type: string }> = React.memo(({ type }) => {
  const svg = (paths: string, viewBox = '0 0 24 24'): string => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="28" height="28"><path d="${paths}" fill="var(--ds-icon-color, #888)"/></svg>`
  }
  const icons: Record<string, string> = {
    generic: svg('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z'),
    image: svg('M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'),
    video: svg('M8 5v14l11-7z'),
    audio: svg('M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'),
    pdf: svg('M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z'),
    archive: svg('M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.81.97H5.44l.8-.97zM5 19V8h14v11H5zm8-8h2v3h-2v-3zm-4 0h2v3H9v-3z'),
    document: svg('M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z'),
    code: svg('M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z')
  }
  const d = icons[type] || icons.generic
  return <span className="ds-file-icon" dangerouslySetInnerHTML={{ __html: d }} />
})

const ProgressBar: React.FC<{ received: number; total: number }> = React.memo(({ received, total }) => {
  const pct = total > 0 ? Math.min((received / total) * 100, 100) : 0
  return (
    <div className="ds-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="ds-progress-fill" style={{ width: pct + '%' }} />
    </div>
  )
})

interface DownloadRowProps {
  download: ShelfDownload
  speedStr: string
  etaStr: string
  onContextMenu: (e: React.MouseEvent, d: ShelfDownload) => void
  onPauseResume: (d: ShelfDownload) => void
  onCancel: (d: ShelfDownload) => void
}

const DownloadRow: React.FC<DownloadRowProps> = React.memo(({
  download, speedStr, etaStr, onContextMenu, onPauseResume, onCancel
}) => {
  const iconType = useMemo(() => fileTypeIcon(download.mimeType, download.filename), [download.mimeType, download.filename])
  const progressing = download.state === 'progressing'
  const completed = download.state === 'completed'
  const cancelled = download.state === 'cancelled' || download.state === 'interrupted'
  const domain = useMemo(() => {
    try { return new URL(download.url).hostname } catch { return '' }
  }, [download.url])

  return (
    <div
      className={'ds-row' + (completed ? ' ds-row-completed' : '') + (cancelled ? ' ds-row-cancelled' : '')}
      onContextMenu={(e) => onContextMenu(e, download)}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (completed) window.aura.downloads.open(download.savePath)
        }
      }}
    >
      <FileTypeSVG type={iconType} />
      <div className="ds-row-body">
        <div className="ds-row-name">{download.filename}</div>
        <div className="ds-row-meta">
          {domain && <span className="ds-row-domain">{domain}</span>}
          {completed && <span className="ds-row-size">{formatBytes(download.totalBytes)}</span>}
          {cancelled && <span className="ds-row-status">{download.state === 'cancelled' ? 'Cancelled' : 'Interrupted'}</span>}
        </div>
        {progressing && (
          <>
            <ProgressBar received={download.receivedBytes} total={download.totalBytes} />
            <div className="ds-row-stats">
              <span>{formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}</span>
              {speedStr && <span>{speedStr}</span>}
              {etaStr && <span>{etaStr}</span>}
            </div>
          </>
        )}
      </div>
      <div className="ds-row-actions">
        {progressing && (
          <button
            className="ds-btn ds-btn-pause"
            onClick={() => onPauseResume(download)}
            title="Pause"
            aria-label="Pause download"
          >
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor"/></svg>
          </button>
        )}
        {cancelled && (
          <button
            className="ds-btn ds-btn-retry"
            onClick={() => window.aura.downloads.retry(download.id)}
            title="Retry"
            aria-label="Retry download"
          >
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/></svg>
          </button>
        )}
        {progressing && (
          <button
            className="ds-btn ds-btn-cancel"
            onClick={() => onCancel(download)}
            title="Cancel"
            aria-label="Cancel download"
          >
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/></svg>
          </button>
        )}
        {completed && (
          <button
            className="ds-btn ds-btn-open"
            onClick={() => window.aura.downloads.open(download.savePath)}
            title="Open file"
            aria-label="Open file"
          >
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/></svg>
          </button>
        )}
      </div>
    </div>
  )
})

const ContextMenu: React.FC<{
  state: ContextMenuState
  onClose: () => void
}> = ({ state, onClose }) => {
  const ref = useRef<HTMLDivElement>(null)
  const { x, y, download } = state
  const completed = download.state === 'completed'
  const progressing = download.state === 'progressing'
  const cancelled = download.state === 'cancelled' || download.state === 'interrupted'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [onClose])

  const menuX = Math.min(x, window.innerWidth - 200)
  const menuY = Math.min(y, window.innerHeight - 200)

  return (
    <div
      ref={ref}
      className="ds-context-menu"
      style={{ left: menuX, top: menuY }}
      role="menu"
    >
      {completed && (
        <button className="ds-cm-item" role="menuitem" onClick={() => { window.aura.downloads.open(download.savePath); onClose() }}>
          Open File
        </button>
      )}
      {completed && (
        <button className="ds-cm-item" role="menuitem" onClick={() => { window.aura.downloads.reveal(download.savePath); onClose() }}>
          Reveal in Folder
        </button>
      )}
      <button className="ds-cm-item" role="menuitem" onClick={() => { window.aura.downloads.copyUrl(download.id); onClose() }}>
        Copy URL
      </button>
      {cancelled && (
        <button className="ds-cm-item" role="menuitem" onClick={() => { window.aura.downloads.retry(download.id); onClose() }}>
          Retry
        </button>
      )}
      {progressing && (
        <button className="ds-cm-item" role="menuitem" onClick={() => { window.aura.downloads.cancel(download.id); onClose() }}>
          Cancel
        </button>
      )}
      <div className="ds-cm-divider" />
      <button className="ds-cm-item ds-cm-item-danger" role="menuitem" onClick={() => { window.aura.downloads.deleteRecord(download.id); onClose() }}>
        Remove from List
      </button>
    </div>
  )
}

const DownloadToast: React.FC<{
  download: ShelfDownload
  onDismiss: (id: number) => void
}> = React.memo(({ download, onDismiss }) => {
  const iconType = useMemo(() => fileTypeIcon(download.mimeType, download.filename), [download.mimeType, download.filename])

  return (
    <div className="ds-toast" role="alert">
      <FileTypeSVG type={iconType} />
      <div className="ds-toast-body">
        <div className="ds-toast-title">Download Complete</div>
        <div className="ds-toast-name">{download.filename}</div>
      </div>
      <button className="ds-btn ds-toast-dismiss" onClick={() => onDismiss(download.id)} aria-label="Dismiss">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/></svg>
      </button>
    </div>
  )
})

const ACTIVE_LIMIT = 5

const DownloadShelf: React.FC = () => {
  const [downloads, setDownloads] = useState<ShelfDownload[]>([])
  const [collapsed, setCollapsed] = useState(true)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [toasts, setToasts] = useState<ShelfDownload[]>([])
  const toastTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const speedTracker = useRef<Map<number, { lastBytes: number; lastTime: number }>>(new Map())
  const [speedMap, setSpeedMap] = useState<Map<number, { speed: number; eta: number }>>(new Map())

  const fetchList = useCallback(async () => {
    try {
      const list = await window.aura.downloads.list()
      setDownloads(list)
    } catch {}
  }, [])

  useEffect(() => {
    fetchList()
    const unsubUpdate = window.aura.downloads.onUpdate(fetchList)
    const unsubProgress = window.aura.downloads.onProgress((data) => {
      const now = Date.now()
      const prev = speedTracker.current.get(data.id)
      let speed = 0
      if (prev && now - prev.lastTime > 200) {
        const bytesDelta = data.receivedBytes - prev.lastBytes
        const timeDelta = (now - prev.lastTime) / 1000
        speed = timeDelta > 0 ? bytesDelta / timeDelta : 0
      }
      speedTracker.current.set(data.id, { lastBytes: data.receivedBytes, lastTime: now })

      setDownloads((prev) => {
        const idx = prev.findIndex((d) => d.id === data.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], receivedBytes: data.receivedBytes, totalBytes: data.totalBytes, state: data.state as ShelfDownload['state'] }
        return next
      })

      setSpeedMap((prev) => {
        const next = new Map(prev)
        const remaining = data.totalBytes - data.receivedBytes
        const eta = speed > 0 ? remaining / speed : Infinity
        next.set(data.id, { speed, eta })
        return next
      })

      if (data.state === 'completed') {
        setDownloads((prev) => {
          const item = prev.find((d) => d.id === data.id)
          if (item && !toastTimers.current.has(data.id)) {
            setToasts((t) => [item, ...t].slice(0, 3))
            const timer = setTimeout(() => {
              setToasts((t) => t.filter((x) => x.id !== data.id))
              toastTimers.current.delete(data.id)
            }, 4000)
            toastTimers.current.set(data.id, timer)
          }
          return prev
        })
      }
    })
    return () => {
      unsubUpdate()
      unsubProgress()
      for (const timer of toastTimers.current.values()) clearTimeout(timer)
      toastTimers.current.clear()
    }
  }, [fetchList])

  const activeCount = useMemo(() => downloads.filter((d) => d.state === 'progressing').length, [downloads])
  const displayList = useMemo(() => {
    const progressing = downloads.filter((d) => d.state === 'progressing')
    const completed = downloads.filter((d) => d.state === 'completed').slice(0, ACTIVE_LIMIT)
    return [...progressing, ...completed]
  }, [downloads])

  const handlePauseResume = useCallback((d: ShelfDownload) => {
    if (d.state === 'progressing') window.aura.downloads.pause(d.id)
    else window.aura.downloads.resume(d.id)
  }, [])

  const handleCancel = useCallback((d: ShelfDownload) => {
    window.aura.downloads.cancel(d.id)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, d: ShelfDownload) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, download: d })
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = toastTimers.current.get(id)
    if (timer) { clearTimeout(timer); toastTimers.current.delete(id) }
  }, [])

  return (
    <div className="ds-container">
      <button
        className={'ds-toggle' + (activeCount > 0 ? ' ds-toggle-active' : '')}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Show downloads' : 'Hide downloads'}
        aria-expanded={!collapsed}
        title={activeCount > 0 ? activeCount + ' active download' + (activeCount !== 1 ? 's' : '') : 'Downloads'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
        </svg>
        {activeCount > 0 && <span className="ds-badge">{activeCount}</span>}
      </button>

      {!collapsed && (
        <div className="ds-shelf" role="region" aria-label="Downloads">
          <div className="ds-header">
            <span className="ds-header-title">Downloads</span>
            {activeCount > 0 && <span className="ds-header-count">{activeCount} active</span>}
            <div className="ds-header-spacer" />
            <button
              className="ds-btn ds-btn-text"
              onClick={() => window.aura.downloads.clearCompleted()}
              title="Clear completed"
              aria-label="Clear completed downloads"
            >
              Clear all
            </button>
            <button
              className="ds-btn ds-btn-text"
              onClick={() => setCollapsed(true)}
              title="Close"
              aria-label="Close download shelf"
            >
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/></svg>
            </button>
          </div>

          {displayList.length === 0 ? (
            <div className="ds-empty">No downloads yet</div>
          ) : (
            <div className="ds-list" role="list">
              {displayList.map((d) => (
                <DownloadRow
                  key={d.id}
                  download={d}
                  speedStr={formatSpeed(speedMap.get(d.id)?.speed || 0)}
                  etaStr={formatETA(speedMap.get(d.id)?.eta || 0)}
                  onContextMenu={handleContextMenu}
                  onPauseResume={handlePauseResume}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
      )}

      <div className="ds-toast-container">
        {toasts.map((t) => (
          <DownloadToast key={t.id} download={t} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  )
}

export default DownloadShelf

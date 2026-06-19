import React, { useEffect, useState } from 'react'
import { IconDownload, IconClose } from '../components/Icons'
import { ChromePageHeader } from '../components/ChromePageHeader'
import type { DownloadRecord } from '../types'

interface Props {
  onClose: () => void
}

export default function DownloadsPage({ onClose }: Props): React.ReactElement {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([])

  const load = (): void => {
    window.aura.downloads.list().then(setDownloads)
  }

  useEffect(() => {
    load()
    return window.aura.downloads.onUpdate(load)
  }, [])

  const handleCancel = async (id: number): Promise<void> => {
    await window.aura.downloads.cancel(id)
  }

  const handleOpen = (savePath: string): void => {
    void window.aura.downloads.open(savePath)
  }

  const handleReveal = (savePath: string): void => {
    void window.aura.downloads.reveal(savePath)
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.aura.downloads.deleteRecord(id)
  }

  const handleClearCompleted = async (): Promise<void> => {
    await window.aura.downloads.clearCompleted()
  }

  return (
    <div className="data-page">
      <header className="data-header">
        <ChromePageHeader title="Downloads" onBack={onClose} />
        <div className="data-header-actions">
          <button className="data-btn" onClick={handleClearCompleted}>
            Clear completed
          </button>
        </div>
      </header>

      <div className="data-list">
        {downloads.length === 0 ? (
          <div className="data-empty">No downloads yet.</div>
        ) : (
          downloads.map((d) => (
            <DownloadRow
              key={d.id}
              download={d}
              onCancel={handleCancel}
              onOpen={handleOpen}
              onReveal={handleReveal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

function DownloadRow({
  download,
  onCancel,
  onOpen,
  onReveal,
  onDelete
}: {
  download: DownloadRecord
  onCancel: (id: number) => void
  onOpen: (path: string) => void
  onReveal: (path: string) => void
  onDelete: (id: number) => void
}): React.ReactElement {
  const pct =
    download.totalBytes > 0
      ? Math.round((download.receivedBytes / download.totalBytes) * 100)
      : 0
  const sizeMB = (download.receivedBytes / (1024 * 1024)).toFixed(1)
  const totalMB = (download.totalBytes / (1024 * 1024)).toFixed(1)

  return (
    <div className="data-row download-row">
      <div className="download-info">
        <div className="data-row-title">{download.filename}</div>
        <div className="data-row-meta">
          <span className={`download-state state-${download.state}`}>{download.state}</span>
          <span className="data-row-sep">&middot;</span>
          <span>
            {sizeMB} MB{download.totalBytes > 0 && ` / ${totalMB} MB`}
          </span>
        </div>
        {download.state === 'progressing' && (
          <div className="download-progress">
            <div className="download-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="download-actions">
        {download.state === 'progressing' ? (
          <button className="data-btn" onClick={() => onCancel(download.id)}>
            Cancel
          </button>
        ) : download.state === 'completed' ? (
          <>
            <button className="data-btn" onClick={() => onOpen(download.savePath)}>
              Open
            </button>
            <button className="data-btn" onClick={() => onReveal(download.savePath)}>
              Show in folder
            </button>
          </>
        ) : null}
        <button
          className="data-row-delete"
          onClick={() => onDelete(download.id)}
          title="Remove from list"
        >
          <IconClose size={14} />
        </button>
      </div>
    </div>
  )
}

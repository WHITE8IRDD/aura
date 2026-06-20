import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './ClearBrowsingDataDialog.css'

type TimeRange = 'hour' | 'day' | 'week' | 'fourWeeks' | 'all'
type TabKind = 'basic' | 'advanced'

interface Props {
  open: boolean
  onClose: () => void
}

interface Preview {
  historyCount: number
  downloadsCount: number
  cookiesSiteCount: number
  cacheSizeBytes: number
  siteSettingsCount: number
}

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: 'hour',      label: 'Last hour' },
  { value: 'day',       label: 'Last 24 hours' },
  { value: 'week',      label: 'Last 7 days' },
  { value: 'fourWeeks', label: 'Last 4 weeks' },
  { value: 'all',       label: 'All time' }
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export const ClearBrowsingDataDialog: React.FC<Props> = ({ open, onClose }) => {
  const [tab, setTab] = useState<TabKind>('basic')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const [bBrowsingHistory, setBBrowsingHistory] = useState(true)
  const [bCookies, setBCookies] = useState(true)
  const [bCache, setBCache] = useState(true)

  const [aBrowsingHistory, setABrowsingHistory] = useState(true)
  const [aDownloadHistory, setADownloadHistory] = useState(true)
  const [aCookies, setACookies] = useState(true)
  const [aCache, setACache] = useState(true)
  const [aPasswords, setAPasswords] = useState(false)
  const [aAutofill, setAAutofill] = useState(false)
  const [aSiteSettings, setASiteSettings] = useState(false)
  const [aHostedApp, setAHostedApp] = useState(false)

  useEffect(() => {
    if (!open) return
    const refresh = async () => {
      const p = await window.aura.clearData.preview(timeRange)
      setPreview(p)
    }
    refresh()
  }, [open, timeRange])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, busy, onClose])

  const handleClear = async () => {
    setBusy(true)
    setResult(null)

    const options = tab === 'basic' ? {
      timeRange,
      browsingHistory: bBrowsingHistory,
      downloadHistory: false,
      cookies: bCookies,
      cache: bCache,
      passwords: false,
      autofillData: false,
      siteSettings: false,
      hostedAppData: false
    } : {
      timeRange,
      browsingHistory: aBrowsingHistory,
      downloadHistory: aDownloadHistory,
      cookies: aCookies,
      cache: aCache,
      passwords: aPasswords,
      autofillData: aAutofill,
      siteSettings: aSiteSettings,
      hostedAppData: aHostedApp
    }

    const res = await window.aura.clearData.execute(options)
    setBusy(false)

    if (res.success) {
      const parts: string[] = []
      if (res.cleared.browsingHistory) parts.push(`${res.cleared.browsingHistory} history entries`)
      if (res.cleared.downloadHistory) parts.push(`${res.cleared.downloadHistory} downloads`)
      if (res.cleared.cookies) parts.push('cookies')
      if (res.cleared.cache) parts.push('cache')
      if (res.cleared.siteSettings) parts.push('site settings')
      if (res.cleared.hostedAppData) parts.push('hosted app data')
      setResult(`Cleared ${parts.join(', ') || 'no data'}`)

      const p = await window.aura.clearData.preview(timeRange)
      setPreview(p)

      setTimeout(() => {
        setResult(null)
        onClose()
      }, 2000)
    } else {
      setResult(`Errors: ${res.errors.join('; ')}`)
    }
  }

  const dialog = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="cbd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !busy && onClose()}
          />
          <div className="cbd-modal-center">
          <motion.div
            className="cbd-modal"
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          >
            <h2 className="cbd-title">Delete browsing data</h2>

            <div className="cbd-tabs">
              <button
                className={`cbd-tab ${tab === 'basic' ? 'active' : ''}`}
                onClick={() => setTab('basic')}
                disabled={busy}
              >
                Basic
              </button>
              <button
                className={`cbd-tab ${tab === 'advanced' ? 'active' : ''}`}
                onClick={() => setTab('advanced')}
                disabled={busy}
              >
                Advanced
              </button>
            </div>

            <div className="cbd-time-row">
              <label className="cbd-label">Time range</label>
              <select
                className="cbd-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                disabled={busy}
              >
                {TIME_RANGE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="cbd-options">
              {tab === 'basic' ? (
                <>
                  <CheckRow
                    checked={bBrowsingHistory}
                    onChange={setBBrowsingHistory}
                    label="Browsing history"
                    sub={preview ? `${preview.historyCount} items` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                  <CheckRow
                    checked={bCookies}
                    onChange={setBCookies}
                    label="Cookies and other site data"
                    sub={preview ? `From ${preview.cookiesSiteCount} sites \u2014 you'll be signed out of most sites` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                  <CheckRow
                    checked={bCache}
                    onChange={setBCache}
                    label="Cached images and files"
                    sub={preview ? `Frees ${formatBytes(preview.cacheSizeBytes)} \u2014 some sites may load more slowly next visit` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                </>
              ) : (
                <>
                  <CheckRow
                    checked={aBrowsingHistory}
                    onChange={setABrowsingHistory}
                    label="Browsing history"
                    sub={preview ? `${preview.historyCount} items` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                  <CheckRow
                    checked={aDownloadHistory}
                    onChange={setADownloadHistory}
                    label="Download history"
                    sub={preview ? `${preview.downloadsCount} items \u2014 files on disk are not deleted` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                  <CheckRow
                    checked={aCookies}
                    onChange={setACookies}
                    label="Cookies and other site data"
                    sub={preview ? `From ${preview.cookiesSiteCount} sites` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                  <CheckRow
                    checked={aCache}
                    onChange={setACache}
                    label="Cached images and files"
                    sub={preview ? `${formatBytes(preview.cacheSizeBytes)}` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                  <CheckRow
                    checked={aPasswords}
                    onChange={setAPasswords}
                    label="Saved passwords"
                    sub="None saved yet (coming in v1.1)"
                    disabled={true}
                  />
                  <CheckRow
                    checked={aAutofill}
                    onChange={setAAutofill}
                    label="Autofill form data"
                    sub="None saved yet (coming in v1.1)"
                    disabled={true}
                  />
                  <CheckRow
                    checked={aSiteSettings}
                    onChange={setASiteSettings}
                    label="Site settings"
                    sub={preview ? `${preview.siteSettingsCount} sites` : 'Calculating\u2026'}
                    disabled={busy}
                  />
                  <CheckRow
                    checked={aHostedApp}
                    onChange={setAHostedApp}
                    label="Hosted app data"
                    sub="Local storage from web apps"
                    disabled={busy}
                  />
                </>
              )}
            </div>

            {result && (
              <div className="cbd-result">{result}</div>
            )}

            <div className="cbd-actions">
              <button
                className="cbd-btn"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="cbd-btn primary"
                onClick={handleClear}
                disabled={busy}
              >
                {busy ? 'Clearing\u2026' : 'Delete data'}
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(dialog, document.body)
}

interface CheckRowProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  sub: string
  disabled?: boolean
}

const CheckRow: React.FC<CheckRowProps> = ({ checked, onChange, label, sub, disabled }) => (
  <label className={`cbd-check-row ${disabled ? 'disabled' : ''}`}>
    <input
      type="checkbox"
      className="cbd-checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <div className="cbd-check-text">
      <span className="cbd-check-label">{label}</span>
      <span className="cbd-check-sub">{sub}</span>
    </div>
  </label>
)

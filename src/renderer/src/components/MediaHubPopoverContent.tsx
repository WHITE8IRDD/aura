import React, { useEffect, useState, useRef } from 'react'

interface MediaTab {
  id: number
  title: string
  url: string
  audible: boolean
  muted: boolean
  playing: boolean
}

interface ProgressData {
  currentTime: number
  duration: number
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

function getThumbnailUrl(url: string): string | null {
  const ytId = extractYouTubeId(url)
  if (ytId) return `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`
  return null
}

function getFavicon(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}/favicon.ico`
  } catch { return '' }
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const MediaHubPopoverContent: React.FC = () => {
  const [tabs, setTabs] = useState<MediaTab[]>([])
  const [progress, setProgress] = useState<Record<number, ProgressData | null>>({})
  const progressInterval = useRef<number | null>(null)

  const refresh = async () => {
    try {
      const list = await window.aura.media.getActiveTabs()
      setTabs(list)
      if (list.length === 0) {
        window.aura.media.closePopoverWindow?.()
      }
    } catch {
      setTabs([])
    }
  }

  useEffect(() => {
    refresh()
    const unsub = window.aura.media.onStateChanged(() => refresh())
    const interval = setInterval(refresh, 3000)
    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (tabs.length === 0) return

    const poll = async () => {
      const next: Record<number, ProgressData | null> = {}
      for (const tab of tabs) {
        try {
          const data = await window.aura.media.getProgress(tab.id)
          next[tab.id] = data
        } catch {
          next[tab.id] = null
        }
      }
      setProgress(next)
    }

    poll()
    progressInterval.current = window.setInterval(poll, 1000)

    return () => {
      if (progressInterval.current !== null) {
        clearInterval(progressInterval.current)
        progressInterval.current = null
      }
    }
  }, [tabs])

  const dispatch = async (tab: MediaTab, action: 'play' | 'pause' | 'previoustrack' | 'nexttrack') => {
    await window.aura.media.dispatch(tab.id, action)
    setTimeout(refresh, 300)
  }

  const toggleMute = async (tab: MediaTab) => {
    await window.aura.media.setMuted(tab.id, !tab.muted)
    setTimeout(refresh, 100)
  }

  const focusTab = async (tab: MediaTab) => {
    await window.aura.media.focusTab(tab.id)
    window.aura.media.closePopoverWindow?.()
  }

  const hideTab = async (tab: MediaTab) => {
    await window.aura.media.setMuted(tab.id, true)
    setTimeout(refresh, 100)
  }

  const anyPlaying = tabs.some(t => t.playing)

  return (
    <div className="media-hub-popover-content">
      <div className="media-hub-header">
        <div className="media-hub-header-left">
          {anyPlaying && <span className="now-playing-indicator" />}
          <span className="media-hub-title">Now playing</span>
        </div>
        <span className="media-hub-count">
          {tabs.length} tab{tabs.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="media-hub-list">
        {tabs.map(tab => {
          const prog = progress[tab.id]
          const thumbUrl = getThumbnailUrl(tab.url)
          const progressPct = prog && prog.duration > 0
            ? Math.min(prog.currentTime / prog.duration * 100, 100)
            : 0

          return (
            <div key={tab.id} className="media-hub-item">
              <div className="media-hub-main-row">
                <div className="media-hub-thumb-container">
                  {thumbUrl ? (
                    <img className="media-hub-thumb" src={thumbUrl} alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                        ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <img className={`media-hub-favicon ${thumbUrl ? 'hidden' : ''}`}
                    src={getFavicon(tab.url)} alt=""
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
                <div className="media-hub-text">
                  <div className="media-hub-tab-title">{tab.title}</div>
                  <div className="media-hub-tab-domain">{getDomain(tab.url)}</div>
                </div>
              </div>

              {prog && prog.duration > 0 && (
                <div className="media-hub-progress-row">
                  <div className="media-hub-progress-track">
                    <div className="media-hub-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className="media-hub-time">{formatTime(prog.currentTime)} / {formatTime(prog.duration)}</span>
                </div>
              )}

              <div className="media-hub-controls">
                <button className="media-hub-ctrl" onClick={() => dispatch(tab, 'previoustrack')} title="Previous">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>

                <button className="media-hub-ctrl play-btn"
                  onClick={() => dispatch(tab, tab.playing ? 'pause' : 'play')}
                  title={tab.playing ? 'Pause' : 'Play'}
                >
                  {tab.playing ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                <button className="media-hub-ctrl" onClick={() => dispatch(tab, 'nexttrack')} title="Next">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>

                <span className="media-hub-controls-spacer" />

                <button className={`media-hub-ctrl ${tab.muted ? 'muted' : ''}`}
                  onClick={() => toggleMute(tab)}
                  title={tab.muted ? 'Unmute' : 'Mute'}
                >
                  {tab.muted ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" y1="9" x2="17" y2="15"/>
                      <line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {tabs.length === 1 && (
        <>
          <div className="media-hub-footer-divider" />
          <div className="media-hub-footer">
            <button className="media-hub-footer-btn" onClick={() => focusTab(tabs[0])}>
              Switch to tab
            </button>
            <span className="media-hub-footer-dot">&middot;</span>
            <button className="media-hub-footer-btn" onClick={() => hideTab(tabs[0])}>
              Hide tab
            </button>
          </div>
        </>
      )}
    </div>
  )
}

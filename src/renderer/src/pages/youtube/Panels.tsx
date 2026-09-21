import React, { useRef, useState } from 'react'
import type { YtChannel, YtRuleType, YtSettings } from '../../../../shared/youtube'
import { Icon } from './icons'
import type { YouTubeState } from './useYouTube'
import { errorText, timeAgo } from './utils'

export const EmptyState: React.FC<{
  title: string
  body: string
  tone?: 'error'
  action?: { label: string; onClick(): void }
}> = ({ title, body, tone, action }) => (
  <div className={`ytf-empty${tone ? ` ytf-empty--${tone}` : ''}`} role={tone ? 'alert' : undefined}>
    <h2>{title}</h2>
    <p>{body}</p>
    {action && (
      <button type="button" className="ytf-btn ytf-btn--primary" onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </div>
)

const Avatar: React.FC<{ ch: YtChannel }> = ({ ch }) => {
  const [broken, setBroken] = useState(false)
  return ch.avatar_url && !broken ? (
    <img className="ytf-avatar" src={ch.avatar_url} alt="" onError={() => setBroken(true)} />
  ) : (
    <span className="ytf-avatar ytf-avatar--fallback" aria-hidden="true">
      {ch.title.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

type Note = { kind: 'ok' | 'err'; text: string } | null

export const SubscriptionsPanel: React.FC<{ yt: YouTubeState }> = ({ yt }) => {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const add = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const input = value.trim()
    if (!input || busy) return
    setBusy(true)
    setNote(null)
    try {
      await yt.subscribe(input)
      setValue('')
      setNote({ kind: 'ok', text: 'Channel added — its videos will appear in a moment.' })
    } catch (err) {
      setNote({ kind: 'err', text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setNote(null)
    try {
      const r = await yt.importText(await file.text())
      setNote({
        kind: 'ok',
        text: `Imported ${r.added} channel${r.added === 1 ? '' : 's'}${r.skipped ? ` · ${r.skipped} skipped` : ''}.`,
      })
    } catch (err) {
      setNote({ kind: 'err', text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ytf-panel">
      <form className="ytf-add" onSubmit={(e) => void add(e)}>
        <input
          className="ytf-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Channel URL, @handle or UC… id"
          aria-label="Channel to subscribe to"
          spellCheck={false}
        />
        <button type="submit" className="ytf-btn ytf-btn--primary" disabled={busy || !value.trim()}>
          <Icon name="plus" /> Subscribe
        </button>
        <button type="button" className="ytf-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" /> Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => void onFile(e)} />
      </form>
      {note && (
        <p className={`ytf-note ytf-note--${note.kind}`} role="status">
          {note.text}
        </p>
      )}
      {yt.subs.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          body="Paste a channel above, import a Google Takeout subscriptions.csv, or press “Subscribe in Aura” on any YouTube channel or video page."
        />
      ) : (
        <ul className="ytf-channels">
          {yt.subs.map((ch) => (
            <li key={ch.channel_id} className="ytf-channel-item">
              <Avatar ch={ch} />
              <div className="ytf-grow">
                <div className="ytf-channel-name">{ch.title}</div>
                {ch.handle && <div className="ytf-sub">@{ch.handle.replace(/^@/, '')}</div>}
              </div>
              <button
                type="button"
                className="ytf-icon-btn"
                onClick={() => void yt.unsubscribe(ch.channel_id)}
                title="Unsubscribe"
                aria-label={`Unsubscribe from ${ch.title}`}
              >
                <Icon name="x" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const WatchLaterPanel: React.FC<{ yt: YouTubeState; onOpen(videoId: string): void }> = ({ yt, onOpen }) =>
  yt.later.length === 0 ? (
    <EmptyState
      title="Nothing saved yet"
      body="Press “+ Watch Later” on any YouTube video, or the clock on a card in your feed."
    />
  ) : (
    <div className="ytf-grid ytf-panel">
      {yt.later.map((v) => (
        <article className="ytf-card" key={v.video_id}>
          <button type="button" className="ytf-thumb" onClick={() => onOpen(v.video_id)} aria-label={`Play ${v.title}`}>
            <img
              src={v.thumbnail_url}
              alt=""
              loading="lazy"
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </button>
          <button
            type="button"
            className="ytf-later on"
            onClick={() => void yt.removeLater(v.video_id)}
            title="Remove from Watch Later"
            aria-label="Remove from Watch Later"
          >
            <Icon name="x" />
          </button>
          <div className="ytf-meta">
            <h3 title={v.title}>{v.title}</h3>
            {v.channel_title && <div className="ytf-channel">{v.channel_title}</div>}
            <div className="ytf-sub">Saved {timeAgo(v.added_at * 1000)}</div>
          </div>
        </article>
      ))}
    </div>
  )

const TOGGLES: { key: keyof YtSettings; title: string; desc: string }[] = [
  { key: 'hideShorts', title: 'Hide YouTube Shorts', desc: 'Removes Shorts shelves, Shorts videos and the Shorts tab on youtube.com.' },
  { key: 'hideHomeFeed', title: 'Replace the home feed', desc: 'Hides YouTube’s recommendations on the homepage and links to your Aura feed instead.' },
  { key: 'focusMode', title: 'Focus mode', desc: 'Hides related videos and comments on watch pages.' },
  { key: 'hideWatched', title: 'Hide watched videos', desc: 'Watched videos disappear from your Aura feed.' },
]

const RuleSection: React.FC<{
  yt: YouTubeState
  type: YtRuleType
  title: string
  hint: string
  placeholder: string
}> = ({ yt, type, title, hint, placeholder }) => {
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const items = yt.rules.filter((r) => r.rule_type === type)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const v = value.trim()
    if (!v) return
    try {
      await yt.addRule(type, v)
      setValue('')
      setErr(null)
    } catch (x) {
      setErr(errorText(x))
    }
  }

  return (
    <div className="ytf-rules">
      <h3>{title}</h3>
      <p className="ytf-hint">{hint}</p>
      <form className="ytf-add" onSubmit={(e) => void submit(e)}>
        <input className="ytf-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={title} spellCheck={false} />
        <button type="submit" className="ytf-btn" disabled={!value.trim()}>
          <Icon name="plus" /> Add
        </button>
      </form>
      {err && <p className="ytf-note ytf-note--err" role="alert">{err}</p>}
      {items.length > 0 && (
        <ul className="ytf-chips">
          {items.map((r) => (
            <li key={r.id} className="ytf-chip">
              <span>{r.value}</span>
              <button type="button" onClick={() => void yt.removeRule(r.id)} aria-label={`Remove ${r.value}`}>
                <Icon name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const FiltersPanel: React.FC<{ yt: YouTubeState }> = ({ yt }) => (
  <section className="ytf-panel">
    <ul className="ytf-toggles">
      {TOGGLES.map((t) => (
        <li key={t.key} className="ytf-toggle">
          <div className="ytf-grow">
            <div className="ytf-channel-name">{t.title}</div>
            <div className="ytf-sub">{t.desc}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={yt.settings[t.key]}
            aria-label={t.title}
            className={`ytf-switch${yt.settings[t.key] ? ' on' : ''}`}
            onClick={() => void yt.setSetting(t.key, !yt.settings[t.key])}
          >
            <span />
          </button>
        </li>
      ))}
    </ul>
    <div className="ytf-rule-grid">
      <RuleSection yt={yt} type="block_keyword" title="Keyword blacklist" hint="Hide videos whose title contains a word or phrase. Applies to your Aura feed and youtube.com." placeholder="e.g. reaction" />
      <RuleSection yt={yt} type="block_channel" title="Blocked channels" hint="Channel name, @handle or UC… id. Applies to your Aura feed and youtube.com." placeholder="@channel" />
      <RuleSection yt={yt} type="priority_topic" title="Topic priority" hint="Videos matching a topic float up in your Aura feed (each match counts as about 12 hours newer)." placeholder="e.g. rust, synthwave" />
    </div>
  </section>
)

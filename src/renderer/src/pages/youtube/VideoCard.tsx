import React from 'react'
import type { YtFeedItem } from '../../../../shared/youtube'
import { Icon } from './icons'
import { formatViews, timeAgo } from './utils'

interface Props {
  item: YtFeedItem
  onOpen(item: YtFeedItem): void
  onToggleLater(item: YtFeedItem): void
}

export const VideoCard: React.FC<Props> = ({ item, onOpen, onToggleLater }) => (
  <article className={`ytf-card${item.watched ? ' is-watched' : ''}`}>
    <button type="button" className="ytf-thumb" onClick={() => onOpen(item)} aria-label={`Play ${item.title}`}>
      <img
        src={item.thumbnailUrl}
        alt=""
        loading="lazy"
        draggable={false}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      {item.boosted && (
        <span className="ytf-badge">
          <Icon name="star" size={11} /> Priority
        </span>
      )}
      {item.watched && <span className="ytf-badge ytf-badge--dim">Watched</span>}
    </button>
    <button
      type="button"
      className={`ytf-later${item.inWatchLater ? ' on' : ''}`}
      onClick={() => onToggleLater(item)}
      title={item.inWatchLater ? 'Remove from Watch Later' : 'Save to Watch Later'}
      aria-label={item.inWatchLater ? 'Remove from Watch Later' : 'Save to Watch Later'}
    >
      <Icon name={item.inWatchLater ? 'check' : 'clock'} />
    </button>
    <div className="ytf-meta">
      <h3 title={item.title}>{item.title}</h3>
      <div className="ytf-channel">{item.channelTitle}</div>
      <div className="ytf-sub">
        {item.views > 0 ? `${formatViews(item.views)} views · ` : ''}
        {timeAgo(item.publishedAt)}
      </div>
    </div>
  </article>
)

export const VideoCardSkeleton: React.FC = () => (
  <div className="ytf-card" aria-hidden="true">
    <div className="ytf-thumb ytf-skel" />
    <div className="ytf-meta">
      <div className="ytf-skel" style={{ height: 14, width: '90%', marginBottom: 8 }} />
      <div className="ytf-skel" style={{ height: 12, width: '45%' }} />
    </div>
  </div>
)

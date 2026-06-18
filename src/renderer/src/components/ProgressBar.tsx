import React, { useEffect, useState } from 'react'

interface Props {
  loading: boolean
}

/**
 * Thin gradient progress bar that appears across the top of the content
 * area while a page is loading. Fades in fast, drains out smoothly.
 */
export default function ProgressBar({ loading }: Props): React.ReactElement | null {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    let timeout: ReturnType<typeof setTimeout>

    if (loading) {
      setVisible(true)
      setProgress(10)
      // Simulate progress — real load events don't give granular percentages
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p
          return p + (90 - p) * 0.08
        })
      }, 200)
    } else if (visible) {
      setProgress(100)
      timeout = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
    }

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [loading, visible])

  if (!visible) return null

  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  )
}

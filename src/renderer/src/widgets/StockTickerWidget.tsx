import React, { useEffect, useState } from 'react'
import WidgetCard from './WidgetCard'

interface Quote {
  symbol: string
  price: number
  changePercent: number
}

interface Props {
  size: 1 | 2 | 3
  dragHandlers?: {
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
}

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'BTC-USD', 'ETH-USD']

export default function StockTickerWidget({
  size,
  dragHandlers
}: Props): React.ReactElement {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS.join(',')}`
        const res = await fetch(url)
        const data = await res.json()
        const result = data?.quoteResponse?.result ?? []
        const parsed: Quote[] = result.map((q: Record<string, unknown>) => ({
          symbol: String(q.symbol),
          price: Number(q.regularMarketPrice),
          changePercent: Number(q.regularMarketChangePercent)
        }))
        if (!cancelled) {
          setQuotes(parsed.length ? parsed : mockQuotes())
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setQuotes(mockQuotes())
          setLoading(false)
        }
      }
    }

    void load()
    const interval = setInterval(load, 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <WidgetCard
      title="Markets"
      subtitle={size > 1 ? 'Updates every minute' : undefined}
      loading={loading}
      size={size}
      draggable
      {...dragHandlers}
    >
      <ul className="ticker-list">
        {quotes.slice(0, size === 1 ? 3 : 6).map((q) => (
          <li key={q.symbol} className="ticker-row">
            <span className="ticker-symbol">{q.symbol}</span>
            <span className="ticker-price">
              {Number.isFinite(q.price) ? q.price.toFixed(2) : '—'}
            </span>
            <span
              className={`ticker-change ${q.changePercent >= 0 ? 'up' : 'down'}`}
            >
              {q.changePercent >= 0 ? '+' : ''}
              {Number.isFinite(q.changePercent) ? q.changePercent.toFixed(2) : '0.00'}%
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

function mockQuotes(): Quote[] {
  return [
    { symbol: 'AAPL', price: 232.47, changePercent: 0.82 },
    { symbol: 'MSFT', price: 415.13, changePercent: -0.31 },
    { symbol: 'NVDA', price: 138.62, changePercent: 2.14 },
    { symbol: 'GOOGL', price: 178.55, changePercent: 0.47 },
    { symbol: 'BTC-USD', price: 67432.18, changePercent: 1.92 },
    { symbol: 'ETH-USD', price: 3284.71, changePercent: 0.65 }
  ]
}

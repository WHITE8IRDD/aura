/**
 * History store — in-memory for Stage 2.
 *
 * Why in-memory now: Stage 6 introduces better-sqlite3 with proper schema,
 * indexes, and pruning. Wiring SQLite into Stage 2 just to throw away the
 * code in Stage 6 is wasted work. The interface here matches what the
 * SQLite-backed version will expose, so swapping is a one-file change.
 *
 * Capacity: 5,000 most recent entries. Enough to feel real during dev,
 * small enough that scoring stays under 1ms per query.
 */

export interface HistoryEntry {
  url: string
  title: string
  visitedAt: number
  visitCount: number
}

interface ScoredEntry extends HistoryEntry {
  score: number
}

const MAX_ENTRIES = 5000
const entries = new Map<string, HistoryEntry>()

/**
 * Record a visit. Increments visit count if the URL is already known,
 * otherwise creates a new entry. Title can be empty initially and
 * updated later via the same function.
 */
export function recordVisit(url: string, title: string): void {
  // Skip internal pages and about: URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) return

  const existing = entries.get(url)
  if (existing) {
    existing.visitedAt = Date.now()
    existing.visitCount += 1
    if (title) existing.title = title
  } else {
    entries.set(url, {
      url,
      title: title || url,
      visitedAt: Date.now(),
      visitCount: 1
    })

    // Prune oldest if over capacity
    if (entries.size > MAX_ENTRIES) {
      let oldestKey: string | null = null
      let oldestTime = Infinity
      for (const [k, v] of entries) {
        if (v.visitedAt < oldestTime) {
          oldestTime = v.visitedAt
          oldestKey = k
        }
      }
      if (oldestKey) entries.delete(oldestKey)
    }
  }
}

/**
 * Update the title for an existing URL (called when a tab finishes loading).
 */
export function updateTitle(url: string, title: string): void {
  const entry = entries.get(url)
  if (entry && title) entry.title = title
}

/**
 * Score-and-rank query against history.
 *
 * Scoring:
 *   - Exact host prefix match:        100
 *   - URL contains query:             40
 *   - Title contains query:           30
 *   - Visit count boost:              +log2(count) * 5
 *   - Recency boost (last 24h):       +20, (last 7d): +10
 *
 * Returns up to `limit` entries, highest score first.
 */
export function search(query: string, limit = 6): HistoryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const now = Date.now()
  const dayMs = 86_400_000

  const scored: ScoredEntry[] = []

  for (const entry of entries.values()) {
    const url = entry.url.toLowerCase()
    const title = entry.title.toLowerCase()
    let score = 0

    // Hostname prefix match (strongest signal)
    try {
      const host = new URL(entry.url).hostname.replace(/^www\./, '')
      if (host.startsWith(q)) score += 100
      else if (host.includes(q)) score += 60
    } catch {
      /* malformed URL — skip host scoring */
    }

    if (url.includes(q)) score += 40
    if (title.includes(q)) score += 30

    if (score === 0) continue

    // Visit count boost
    score += Math.log2(entry.visitCount + 1) * 5

    // Recency boost
    const age = now - entry.visitedAt
    if (age < dayMs) score += 20
    else if (age < dayMs * 7) score += 10

    scored.push({ ...entry, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(({ score: _s, ...rest }) => rest)
}

/**
 * Get the N most recently visited entries (for empty-query suggestions).
 */
export function recent(limit = 6): HistoryEntry[] {
  return Array.from(entries.values())
    .sort((a, b) => b.visitedAt - a.visitedAt)
    .slice(0, limit)
}

/** Total count — used in History page (Stage 6). */
export function count(): number {
  return entries.size
}

/** Clear all history — wired in Stage 4 for Ninja Mode exit. */
export function clear(): void {
  entries.clear()
}

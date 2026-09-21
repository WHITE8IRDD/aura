const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function timeAgo(ms: number): string {
  const diff = Math.round((ms - Date.now()) / 1000)
  for (const [unit, sec] of UNITS)
    if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit)
  return 'just now'
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
export const formatViews = (n: number): string => compact.format(n)

/** Electron wraps IPC failures as "Error invoking remote method '…': Error: [yt] …" — show only the useful part. */
export function errorText(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '').replace(/^\[yt\]\s*/, '')
}

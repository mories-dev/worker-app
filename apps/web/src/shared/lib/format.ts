const numberFormatter = new Intl.NumberFormat('ja-JP')
const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatDuration(ms: number): string {
  return `${numberFormatter.format(Math.round(ms))} ms`
}

export function formatClock(epochMs: number): string {
  return timeFormatter.format(epochMs)
}

export function formatPercent(ratio: number): string {
  return `${Math.floor(Math.min(Math.max(ratio, 0), 1) * 100)}%`
}

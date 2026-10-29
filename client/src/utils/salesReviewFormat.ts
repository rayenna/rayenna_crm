export function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** Compact Indian currency for KPI tiles and narrow tables. */
export function formatInrCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)} L`
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`
}

export function formatPct(n: number | null | undefined, signed = true): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const rounded = Math.round(n * 10) / 10
  const sign = signed && rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(1)}%`
}

export function formatKw(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(2)} MW`
  return `${Math.round(n).toLocaleString('en-IN')} kW`
}

export function formatCloseDate(ymd: string | null | undefined): string {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${String(y).slice(-2)}`
}

export function yoyToneClass(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return 'text-[color:var(--text-secondary)]'
  if (n > 0) return 'text-emerald-500'
  return 'text-[color:var(--accent-red)]'
}

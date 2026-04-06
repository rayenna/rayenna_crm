/**
 * Stable accent color per salesperson name for Zenith quick drawers (dark UI).
 * Same string → same color so lists are scannable.
 */
const PALETTE = [
  '#7dd3fc',
  '#f5a623',
  '#00d4b4',
  '#a78bfa',
  '#fb7185',
  '#86efac',
  '#fcd34d',
  '#38bdf8',
  '#c4b5fd',
  '#f472b6',
  '#4ade80',
  '#fdba74',
  '#22d3ee',
  '#e879f9',
  '#bef264',
] as const

const UNASSIGNED = 'rgba(255,255,255,0.48)'

function hashName(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

/** Text color for the salesperson display name (not the "Sales" label). */
export function zenithSalespersonNameColor(name: string | null | undefined): string {
  const t = name?.trim() ?? ''
  if (!t) return UNASSIGNED
  return PALETTE[hashName(t) % PALETTE.length]!
}

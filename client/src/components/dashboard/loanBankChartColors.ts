/**
 * Distinct fills for Loans by Bank charts — spectrum aligned with Projects by Stage
 * (blues, violet, teal, greens, golds, pinks). Large enough that typical bank counts
 * each get a unique bar before the palette repeats.
 */
export const LOAN_BANK_BAR_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#84cc16',
  '#64748b',
  '#f97316',
  '#a855f7',
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#f43f5e',
  '#0891b2',
  '#4f46e5',
  '#d946ef',
  '#65a30c',
]

/**
 * Color for the i-th bar in chart order. Uses position, not bank name: hashing names into
 * only N palette slots caused different banks to share the same color (modulo collisions).
 */
export function getLoanBankBarColor(_bankLabel: string | undefined, index: number): string {
  return LOAN_BANK_BAR_COLORS[index % LOAN_BANK_BAR_COLORS.length]
}

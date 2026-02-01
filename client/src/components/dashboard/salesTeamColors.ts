/**
 * Deterministic color per salesperson name so Revenue by Sales Team Member and
 * Pipeline by Sales Team Member use the same color for the same person.
 */
const SALES_TEAM_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

function hashString(str: string): number {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function getSalesTeamColor(salespersonName: string, _fallbackIndex: number): string {
  const index = hashString(salespersonName) % SALES_TEAM_COLORS.length
  return SALES_TEAM_COLORS[index]
}

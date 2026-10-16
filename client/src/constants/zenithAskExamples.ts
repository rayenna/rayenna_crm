/**
 * Canonical Ask example chips by role.
 * Keep analytics list in sync with `EXAMPLE_QUESTIONS_BY_ROLE` in
 * `src/services/zenithNl/catalog.ts`.
 */
export const ZENITH_ASK_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Which lead sources drove the most revenue?',
    'Show my pipeline by stage',
    'Show me the total support tickets raised',
    'Summarise my lost deals by reason',
    'How many of my projects used Adani panels?',
  ],
  MANAGEMENT: [
    'Subsidy vs non-subsidy revenue',
    'Revenue by city',
    'Profit summary',
    'Compliance backlog',
    'Loan vs cash revenue',
  ],
  ADMIN: [
    'Profit summary',
    'Ops workload',
    'Compliance backlog',
    'Hub plant link status',
    'Outstanding by salesperson',
  ],
  OPERATIONS: [
    'Ops workload',
    'SLA status indicators',
    'Compliance backlog',
    'Subsidy funnel',
    'AMCs expiring',
  ],
  FINANCE: [
    'Profit summary',
    'Loan vs cash revenue',
    'Outstanding by salesperson',
    'Payment mode mix',
    'Unpaid invoices',
  ],
}

/** Side panel / “More questions” — keep short so the row stays scannable. */
export function zenithAskExampleChips(role: string | undefined, limit = 3): string[] {
  const list = ZENITH_ASK_EXAMPLES[role ?? ''] ?? ZENITH_ASK_EXAMPLES.MANAGEMENT
  return list.slice(0, limit)
}

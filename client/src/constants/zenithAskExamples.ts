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
    'Profit summary this quarter',
    'Quarter on quarter revenue growth',
    'Loan vs cash revenue',
  ],
  ADMIN: [
    'Profit summary this quarter',
    'Quarter on quarter revenue growth',
    'Ops workload',
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
    'Profit summary this quarter',
    'Quarter on quarter revenue growth',
    'Outstanding by salesperson',
    'Payment mode mix',
    'Unpaid invoices',
  ],
}

/**
 * Extra prompts for the post-answer “More questions” row (not shown in Try asking).
 * Keep short and role-relevant; avoid duplicating primary examples.
 */
export const ZENITH_ASK_MORE_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Payment status breakdown',
    'Panel brand mix',
    'Support tickets by salesperson',
    'Capacity sold',
  ],
  MANAGEMENT: [
    'Revenue by salesperson',
    'Pipeline by stage',
    'Ops workload',
    'Hub plant link status',
  ],
  ADMIN: [
    'Revenue by city',
    'SLA status indicators',
    'Loan vs cash revenue',
    'Subsidy funnel',
  ],
  OPERATIONS: [
    'Installation status breakdown',
    'Show me the total support tickets raised',
    'Hub plant link status',
    'Pending subsidy',
  ],
  FINANCE: [
    'Payment status breakdown',
    'Availing loan',
    'Revenue by project type',
    'Pending subsidy',
  ],
}

/** Side panel “Try asking” — full role pack (default all 5). */
export function zenithAskExampleChips(role: string | undefined, limit?: number): string[] {
  const list = ZENITH_ASK_EXAMPLES[role ?? ''] ?? ZENITH_ASK_EXAMPLES.MANAGEMENT
  if (limit == null || limit <= 0) return [...list]
  return list.slice(0, limit)
}

/** After an answer — secondary prompts distinct from the primary pack. */
export function zenithAskMoreChips(role: string | undefined, limit = 4): string[] {
  const list = ZENITH_ASK_MORE_EXAMPLES[role ?? ''] ?? ZENITH_ASK_MORE_EXAMPLES.MANAGEMENT
  return list.slice(0, limit)
}

/**
 * Canonical Ask example chips by role.
 * Keep analytics list in sync with `EXAMPLE_QUESTIONS_BY_ROLE` in
 * `src/services/zenithNl/catalog.ts`.
 */
export const ZENITH_ASK_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Which lead sources drove the most revenue?',
    'Show my stalled pipeline',
    'Give me a pipeline analysis',
    'Summarise my lost deals by reason',
    'How many of my projects used Adani panels?',
  ],
  MANAGEMENT: [
    'Show all apartments in customer master',
    'List residential projects in Kochi',
    'List pending subsidy projects',
    'Subsidy vs non-subsidy revenue',
    'Customer details for Ramesh',
  ],
  ADMIN: [
    'Show all commercial in customer master',
    'List projects availing loan',
    'List projects needing review',
    'Ops workload',
    'Customer details for Ramesh',
  ],
  OPERATIONS: [
    'List under installation projects not fully paid',
    'List projects with installation pending',
    'Show installation status breakdown',
    'Projects missing documents',
    'AMCs expiring',
  ],
  FINANCE: [
    'List fully paid projects',
    'List payment pending projects',
    'Payment status breakdown',
    'Pending subsidy',
    'Unpaid invoices',
  ],
}

/**
 * Extra prompts for the post-answer “More questions” row (not shown in Try asking).
 * Keep short and role-relevant; avoid duplicating primary examples.
 */
export const ZENITH_ASK_MORE_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Show my ageing pipeline',
    'Show my pipeline by stage',
    'Payment status breakdown',
    'Capacity sold',
  ],
  MANAGEMENT: [
    'Salesperson profitability',
    'City profitability',
    'Hub station IDs',
    'Lost deal details',
  ],
  ADMIN: [
    'Salesperson profitability',
    'Projects missing documents',
    'PE missing BOM',
    'Incentive eligible projects',
  ],
  OPERATIONS: [
    'Installation status breakdown',
    'Hub station IDs',
    'PE missing BOM',
    'Pending subsidy',
  ],
  FINANCE: [
    'Payment status breakdown',
    'Availing loan',
    'Incentive eligible projects',
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

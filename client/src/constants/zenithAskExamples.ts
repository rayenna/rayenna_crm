/**
 * Fallback Ask chips when GET /zenith-ask-examples is unavailable.
 * Canonical list + live customer names live in `src/services/zenithNl/catalog.ts`.
 */
export const ZENITH_ASK_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Who should I call today?',
    'Why is my pipeline stalling?',
    'Which lead sources drove the most revenue?',
    'Summarise my lost deals by reason',
  ],
  MANAGEMENT: [
    'Who should I call today?',
    'Why is my pipeline stalling?',
    'Subsidy vs non-subsidy revenue',
    'Show open support tickets',
  ],
  ADMIN: [
    'Who should I call today?',
    'Why is my pipeline stalling?',
    'Show open support tickets',
    'List pending subsidy projects',
  ],
  OPERATIONS: [
    'Who should I call today?',
    'List pending subsidy projects',
    'Projects missing documents',
    'Show open support tickets',
    'AMCs expiring',
  ],
  FINANCE: [
    'Who should I call today?',
    'Unpaid invoices',
    'Payment status breakdown',
    'Profit summary this quarter',
    'Payment mode mix',
  ],
}

export const ZENITH_ASK_MORE_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Show my ageing pipeline',
    'Show my pipeline by stage',
    "What's my weighted pipeline?",
    'Payment status breakdown',
  ],
  MANAGEMENT: [
    'DCR vs Non-DCR profitability',
    'Salesperson profitability',
    'City profitability',
    "What's my weighted pipeline?",
  ],
  ADMIN: [
    'Ops workload',
    'Salesperson profitability',
    'PE missing BOM',
    "What's my weighted pipeline?",
  ],
  OPERATIONS: [
    'Projects with feasibility pending',
    'Payment timeline',
    'Hub station IDs',
    'PE missing BOM',
  ],
  FINANCE: [
    'Payment timeline',
    'Availing loan',
    'Incentive eligible projects',
    "What's my weighted pipeline?",
  ],
}

export function zenithAskExampleChips(role: string | undefined, limit?: number): string[] {
  const list = ZENITH_ASK_EXAMPLES[role ?? ''] ?? ZENITH_ASK_EXAMPLES.MANAGEMENT
  if (limit == null || limit <= 0) return [...list]
  return list.slice(0, limit)
}

export function zenithAskMoreChips(role: string | undefined, limit = 4): string[] {
  const list = ZENITH_ASK_MORE_EXAMPLES[role ?? ''] ?? ZENITH_ASK_MORE_EXAMPLES.MANAGEMENT
  return list.slice(0, limit)
}

/** Three live-book demo asks — no seeded tenant. Role-packs omit tickets / stall for Finance. */
export function zenithAskDemoChips(role: string | undefined): string[] {
  const qs = ['Who should I call today?']
  if (role === 'FINANCE') {
    qs.push('Unpaid invoices', 'Payment status breakdown')
  } else {
    qs.push('Why is my pipeline stalling?', 'Who has the oldest open ticket?')
  }
  return qs
}

/** Example chips minus the guided-demo set so the two rows do not duplicate. */
export function zenithAskTryChips(examples: string[], demo: string[]): string[] {
  const skip = new Set(demo)
  return examples.filter((q) => !skip.has(q))
}

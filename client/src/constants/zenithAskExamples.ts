/**
 * Fallback Ask chips when GET /zenith-ask-examples is unavailable.
 * Canonical list + live customer names live in `src/services/zenithNl/catalog.ts`.
 */
export const ZENITH_ASK_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'My morning Ask',
    'Chase unpaid under-install',
    'Who should I call today?',
    'Why is my pipeline stalling?',
    'List the last five payments received',
  ],
  MANAGEMENT: [
    'My morning Ask',
    'Chase unpaid under-install',
    'Who should I call today?',
    'List the last five payments received',
    'Show open support tickets',
  ],
  ADMIN: [
    'My morning Ask',
    'Chase unpaid under-install',
    'Subsidy chase pack',
    'List the last five payments received',
    'Show open support tickets',
  ],
  OPERATIONS: [
    'My morning Ask',
    'Chase subsidy credit',
    'Chase unpaid under-install',
    'Show open support tickets',
    'Clear overdue tickets',
  ],
  FINANCE: [
    'My morning Ask',
    'Chase unpaid under-install',
    'List the last five payments received',
    'Unpaid invoices',
    'Payment status breakdown',
  ],
}

export const ZENITH_ASK_MORE_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Call list for today',
    'Subsidy chase pack',
    'Sales Review achievement',
    'Show my ageing pipeline',
  ],
  MANAGEMENT: [
    'Morning priorities',
    'Subsidy chase pack',
    'Sales Review achievement',
    'Margin & Mix summary',
  ],
  ADMIN: [
    'What should I work on this morning?',
    'Chase subsidy credit',
    'Delivery Control blockers',
    'List lost deals with active PE proposals',
  ],
  OPERATIONS: [
    'Pending subsidy with missing docs',
    'Delivery Control blockers',
    'Subsidy clock',
    'Projects with feasibility pending',
  ],
  FINANCE: [
    'Stalled deals plus payments',
    'Collections outstanding',
    'Thin margin jobs',
    'Payment mode mix',
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

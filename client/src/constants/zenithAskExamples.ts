/**
 * Canonical Ask example chips by role.
 * Keep in sync with `EXAMPLE_QUESTIONS_BY_ROLE` in `src/services/zenithNl/catalog.ts`
 * (server clarify suggestions + exact chip intents use that list).
 *
 * Dates come from the Zenith command bar or relative phrases in the question
 * (“last FY”, “this quarter”) — avoid misleading “this FY” chip copy.
 */
export const ZENITH_ASK_EXAMPLES: Record<string, string[]> = {
  SALES: [
    'Which lead sources drove the most revenue?',
    'Show my pipeline by stage',
    'Summarise my lost deals by reason',
    'Show installation status breakdown',
    'How many of my projects used Adani panels?',
  ],
  MANAGEMENT: [
    'Which lead sources drove the most revenue?',
    'How many projects used Adani panels?',
    'Which panel brands sold most?',
    'Which banks are financing loans?',
    'Summarise lost deals by reason',
  ],
  ADMIN: [
    'Which lead sources drove the most revenue?',
    'How many projects used Adani panels?',
    'Which panel brands sold most?',
    'Which banks are financing loans?',
    'Payment status breakdown',
  ],
  OPERATIONS: [
    'Show installation status breakdown',
    'How many projects used Adani panels?',
    'Projects with Deye inverters',
    'Projects pending subsidy credit',
  ],
  FINANCE: [
    'Payment status breakdown',
    'Which banks are financing loans?',
    'How many customers have SBI loans?',
    'Which panel brands sold most?',
    'Projects with outstanding balance',
  ],
}

/** Side panel / “More questions” — keep short so the row stays scannable. */
export function zenithAskExampleChips(role: string | undefined, limit = 3): string[] {
  const list = ZENITH_ASK_EXAMPLES[role ?? ''] ?? ZENITH_ASK_EXAMPLES.MANAGEMENT
  return list.slice(0, limit)
}

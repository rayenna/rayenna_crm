/** Instant “mapped to …” copy while the Ask round-trip is in flight (chip / known phrasing). */
export function zenithAskMappedLabel(question: string): string | null {
  const q = question.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!q) return null
  if (/who (should|do|shall|can) i (call|phone|ring|follow)/.test(q) || /\bwho to call\b/.test(q)) {
    return 'Who to call'
  }
  if (/pipeline stall|stalled pipeline|deal health/.test(q)) return 'Stalled pipeline'
  if (/oldest/.test(q) && /ticket/.test(q)) return 'Oldest open ticket'
  if (/overdue/.test(q) && /ticket/.test(q)) return 'Overdue ticket queue'
  if (/open support tickets|open tickets/.test(q)) return 'Open ticket queue'
  if (/pending subsidy/.test(q)) return 'Pending subsidy'
  if (/open proposal|draft proposal/.test(q)) return 'Proposal Engine'
  if (/customer details for/.test(q)) return 'Customer record'
  if (/quarter on quarter|year on year|yoy|qoq/.test(q)) return 'Period compare'
  if (/unpaid invoices/.test(q)) return 'Unpaid invoices'
  if (/create (a )?(support )?ticket/.test(q)) return 'Create ticket'
  return null
}

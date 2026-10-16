/** Keep in sync with `src/utils/complianceGaps.ts` (Ask → Projects drill-down). */
export const COMPLIANCE_GAP_IDS = [
  'no_feasibility',
  'feas_no_reg',
  'reg_no_install',
  'install_no_mnre',
  'subsidy_req_no_credit',
] as const

export type ComplianceGapId = (typeof COMPLIANCE_GAP_IDS)[number]

export const COMPLIANCE_GAP_LABELS: Record<ComplianceGapId, string> = {
  no_feasibility: 'No KSEB feasibility date',
  feas_no_reg: 'Feasibility done · registration pending',
  reg_no_install: 'Registered · install not completed',
  install_no_mnre: 'Installed · MNRE portal pending',
  subsidy_req_no_credit: 'Subsidy requested · not credited',
}

export function parseComplianceGap(raw: unknown): ComplianceGapId | null {
  const v = typeof raw === 'string' ? raw.trim() : ''
  return (COMPLIANCE_GAP_IDS as readonly string[]).includes(v) ? (v as ComplianceGapId) : null
}

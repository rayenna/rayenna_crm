import { ProjectStatus, ProjectType, type Prisma } from '@prisma/client';

/** Ask → Projects drill-down for subsidy compliance backlog rows. */
export const COMPLIANCE_GAP_IDS = [
  'no_feasibility',
  'feas_no_reg',
  'reg_no_install',
  'install_no_mnre',
  'subsidy_req_no_credit',
] as const;

export type ComplianceGapId = (typeof COMPLIANCE_GAP_IDS)[number];

export const COMPLIANCE_GAP_LABELS: Record<ComplianceGapId, string> = {
  no_feasibility: 'No KSEB feasibility date',
  feas_no_reg: 'Feasibility done · registration pending',
  reg_no_install: 'Registered · install not completed',
  install_no_mnre: 'Installed · MNRE portal pending',
  subsidy_req_no_credit: 'Subsidy requested · not credited',
};

export function parseComplianceGap(raw: unknown): ComplianceGapId | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return (COMPLIANCE_GAP_IDS as readonly string[]).includes(v) ? (v as ComplianceGapId) : null;
}

export function complianceGapFromStepLabel(step: string): ComplianceGapId | null {
  const s = step.trim().toLowerCase();
  for (const id of COMPLIANCE_GAP_IDS) {
    if (COMPLIANCE_GAP_LABELS[id].toLowerCase() === s) return id;
  }
  // Tolerate middle-dot vs hyphen variants from older answers
  if (s.includes('no kseb feasibility')) return 'no_feasibility';
  if (s.includes('registration pending')) return 'feas_no_reg';
  if (s.includes('install not completed')) return 'reg_no_install';
  if (s.includes('mnre')) return 'install_no_mnre';
  if (s.includes('not credited') || s.includes('subsidy requested')) return 'subsidy_req_no_credit';
  return null;
}

/** Prisma clause matching Ask `execComplianceBacklog` row definitions. */
export function complianceGapPrismaWhere(gap: ComplianceGapId): Prisma.ProjectWhereInput {
  const base: Prisma.ProjectWhereInput = {
    type: ProjectType.SUBSIDY,
    projectStatus: { not: ProjectStatus.LOST },
  };
  switch (gap) {
    case 'no_feasibility':
      return { ...base, feasibilityDate: null };
    case 'feas_no_reg':
      return {
        ...base,
        feasibilityDate: { not: null },
        registrationDate: null,
      };
    case 'reg_no_install':
      return {
        ...base,
        registrationDate: { not: null },
        installationCompletionDate: null,
      };
    case 'install_no_mnre':
      return {
        ...base,
        installationCompletionDate: { not: null },
        mnrePortalRegistrationDate: null,
      };
    case 'subsidy_req_no_credit':
      return {
        ...base,
        subsidyRequestDate: { not: null },
        subsidyCreditedDate: null,
        projectStatus: { not: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
      };
    default:
      return base;
  }
}

import { ProjectStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import prisma from '../prisma';

/** Stages where panel + inverter brand should be captured for reporting. */
export const LIFECYCLE_BRAND_REMINDER_STATUSES: ProjectStatus[] = [
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
];

const PROJECT_STATUS_LABELS: Record<string, string> = {
  [ProjectStatus.UNDER_INSTALLATION]: 'Under Installation',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.COMPLETED_SUBSIDY_CREDITED]: 'Completed – Subsidy Credited',
};

function brandEntered(v: string | null | undefined): boolean {
  return Boolean((v ?? '').trim());
}

export type LifecycleBrandGapRow = {
  projectId: string;
  projectSerialNumber: number | null;
  customerName: string;
  stageLabel: string;
  missingPanel: boolean;
  missingInverter: boolean;
};

export function mapLifecycleBrandGapRow(p: {
  id: string;
  slNo: number | null;
  projectStatus: ProjectStatus;
  panelBrand: string | null;
  inverterBrand: string | null;
  customer: { customerName: string | null; firstName?: string | null } | null;
}): LifecycleBrandGapRow | null {
  if (!LIFECYCLE_BRAND_REMINDER_STATUSES.includes(p.projectStatus)) return null;
  const missingPanel = !brandEntered(p.panelBrand);
  const missingInverter = !brandEntered(p.inverterBrand);
  if (!missingPanel && !missingInverter) return null;
  const customerName =
    p.customer?.firstName?.trim() ||
    p.customer?.customerName?.trim() ||
    'Unknown';
  return {
    projectId: p.id,
    projectSerialNumber: p.slNo,
    customerName,
    stageLabel: PROJECT_STATUS_LABELS[p.projectStatus] || String(p.projectStatus),
    missingPanel,
    missingInverter,
  };
}

/** Projects in late stages missing panel and/or inverter brand (dashboard date scope). */
export async function loadLifecycleBrandGaps(
  where: Prisma.ProjectWhereInput,
  options?: { salespersonId?: string; take?: number },
): Promise<LifecycleBrandGapRow[]> {
  const take = options?.take ?? 25;
  const scopeWhere: Prisma.ProjectWhereInput = {
    ...where,
    ...(options?.salespersonId ? { salespersonId: options.salespersonId } : {}),
    projectStatus: { in: LIFECYCLE_BRAND_REMINDER_STATUSES },
    OR: [
      { panelBrand: null },
      { panelBrand: '' },
      { inverterBrand: null },
      { inverterBrand: '' },
    ],
  };

  const rows = await prisma.project.findMany({
    where: scopeWhere,
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      panelBrand: true,
      inverterBrand: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take,
  });

  return rows
    .map((p) => mapLifecycleBrandGapRow(p))
    .filter((r): r is LifecycleBrandGapRow => r != null);
}

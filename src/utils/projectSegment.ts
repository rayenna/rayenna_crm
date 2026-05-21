import { ProjectType } from '@prisma/client';

/** Display labels for project `type` (Segment: subsidy eligibility, not customer type). */
export const PROJECT_SEGMENT_LABELS: Record<ProjectType, string> = {
  [ProjectType.SUBSIDY]: 'Subsidy',
  [ProjectType.NON_SUBSIDY]: 'Non-Subsidy',
};

const LEGACY_SUBSIDY = 'RESIDENTIAL_SUBSIDY';
const LEGACY_NON_SUBSIDY = new Set(['RESIDENTIAL_NON_SUBSIDY', 'COMMERCIAL_INDUSTRIAL']);

export function getProjectSegmentLabel(type: string): string {
  if (type in PROJECT_SEGMENT_LABELS) {
    return PROJECT_SEGMENT_LABELS[type as ProjectType];
  }
  if (type === LEGACY_SUBSIDY) return 'Subsidy';
  if (LEGACY_NON_SUBSIDY.has(type)) return 'Non-Subsidy';
  return type.replace(/_/g, ' ');
}

export function isSubsidyProjectType(type: string): boolean {
  return type === ProjectType.SUBSIDY || type === LEGACY_SUBSIDY;
}

export function defaultPanelTypeForProjectSegment(type: string): 'DCR' | 'Non-DCR' {
  return isSubsidyProjectType(type) ? 'DCR' : 'Non-DCR';
}

export function formatProjectTypeGroupItem<T extends { type: string; _sum: { projectCost?: number | null }; _count: { id: number } }>(
  item: T,
): { type: string; label: string; value: number; count: number } {
  return {
    type: item.type,
    label: getProjectSegmentLabel(item.type),
    value: item._sum.projectCost || 0,
    count: item._count.id,
  };
}

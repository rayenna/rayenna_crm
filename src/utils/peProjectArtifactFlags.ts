import prisma from '../prisma';

/** Per-project PE artifact flags (authoritative — from DB, not browser storage). */
export type PeArtifactFlags = {
  hasCosting: boolean;
  hasBom: boolean;
  hasRoi: boolean;
  hasProposal: boolean;
  hasRoofLayout: boolean;
};

export type PeArtifactFlagSets = {
  hasCosting: Set<string>;
  hasBom: Set<string>;
  hasRoi: Set<string>;
  hasProposal: Set<string>;
  hasRoofLayout: Set<string>;
};

const EMPTY_SETS: PeArtifactFlagSets = {
  hasCosting: new Set(),
  hasBom: new Set(),
  hasRoi: new Set(),
  hasProposal: new Set(),
  hasRoofLayout: new Set(),
};

/** Batch-load which CRM projects have each PE artifact (for list cards, filters, stats). */
export async function loadPeArtifactFlagSets(
  projectIds: string[],
): Promise<PeArtifactFlagSets> {
  if (!projectIds.length) return EMPTY_SETS;

  const [costings, boms, rois, proposals, roofLayouts] = await Promise.all([
    prisma.pECostingSheet.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pEBomSheet.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pERoiResult.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pEProposal.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.projectRoofLayout.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, layoutImageUrl: true },
    }),
  ]);

  return {
    hasCosting: new Set(costings.map((p) => p.projectId)),
    hasBom: new Set(boms.map((p) => p.projectId)),
    hasRoi: new Set(rois.map((p) => p.projectId)),
    hasProposal: new Set(proposals.map((p) => p.projectId)),
    hasRoofLayout: new Set(
      roofLayouts
        .filter((r) => String(r.layoutImageUrl ?? '').trim().length > 0)
        .map((r) => r.projectId),
    ),
  };
}

export function peArtifactFlagsForProject(
  projectId: string,
  sets: PeArtifactFlagSets,
): PeArtifactFlags {
  return {
    hasCosting: sets.hasCosting.has(projectId),
    hasBom: sets.hasBom.has(projectId),
    hasRoi: sets.hasRoi.has(projectId),
    hasProposal: sets.hasProposal.has(projectId),
    hasRoofLayout: sets.hasRoofLayout.has(projectId),
  };
}

export function peDocumentStatusFromFlags(
  flags: Pick<PeArtifactFlags, 'hasCosting' | 'hasBom' | 'hasRoi' | 'hasProposal'>,
): 'not-started' | 'draft' | 'proposal-ready' {
  const hasAny =
    flags.hasCosting || flags.hasBom || flags.hasRoi || flags.hasProposal;
  const allFour =
    flags.hasCosting && flags.hasBom && flags.hasRoi && flags.hasProposal;
  if (allFour) return 'proposal-ready';
  if (hasAny) return 'draft';
  return 'not-started';
}

/** Saved roof layout metrics for Customers list cards (batch-loaded with artifact flags). */
export type PeRoofLayoutListSummary = {
  panelCount: number;
  placedKw: number;
};

export async function loadPeRoofLayoutSummariesForList(
  projects: { id: string; panelCapacityW: number | null | undefined }[],
): Promise<Map<string, PeRoofLayoutListSummary>> {
  const ids = projects.map((p) => p.id).filter(Boolean);
  const out = new Map<string, PeRoofLayoutListSummary>();
  if (!ids.length) return out;

  const rows = await prisma.projectRoofLayout.findMany({
    where: { projectId: { in: ids } },
    select: { projectId: true, panelCount: true, layoutImageUrl: true },
  });

  const wattsById = new Map(
    projects.map((p) => {
      const w =
        typeof p.panelCapacityW === 'number' && p.panelCapacityW > 0
          ? p.panelCapacityW
          : 550;
      return [p.id, w] as const;
    }),
  );

  for (const row of rows) {
    if (!String(row.layoutImageUrl ?? '').trim()) continue;
    const panelCount = row.panelCount ?? 0;
    if (panelCount <= 0) continue;
    const moduleW = wattsById.get(row.projectId) ?? 550;
    out.set(row.projectId, {
      panelCount,
      placedKw: Math.round((panelCount * moduleW) / 10) / 100,
    });
  }

  return out;
}

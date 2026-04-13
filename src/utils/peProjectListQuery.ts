import { Prisma, ProjectStage, ProjectStatus, UserRole } from '@prisma/client';

export type PeProjectsListFilters = {
  q?: string;
  /** Display tokens (e.g. PROPOSAL, CONFIRMED) — matched against CRM projectStatus / projectStage */
  stages?: string[];
  peStatus?: 'not-started' | 'draft' | 'proposal-ready';
  salespersonId?: string;
  /** Exact CRM project id (PESelectedProject.projectId) */
  projectId?: string;
};

const PE_ALL_FOUR: Prisma.ProjectWhereInput = {
  AND: [
    { peCostingSheets: { some: {} } },
    { peBomSheets: { some: {} } },
    { peRoiResults: { some: {} } },
    { peProposals: { some: {} } },
  ],
};

const PE_NONE: Prisma.ProjectWhereInput = {
  AND: [
    { peCostingSheets: { none: {} } },
    { peBomSheets: { none: {} } },
    { peRoiResults: { none: {} } },
    { peProposals: { none: {} } },
  ],
};

const PE_ANY_ONE: Prisma.ProjectWhereInput = {
  OR: [
    { peCostingSheets: { some: {} } },
    { peBomSheets: { some: {} } },
    { peRoiResults: { some: {} } },
    { peProposals: { some: {} } },
  ],
};

/** Artifact completion bucket (matches list payload `peStatus`). */
export function projectWhereForPeArtifactStatus(
  peStatus: 'not-started' | 'draft' | 'proposal-ready',
): Prisma.ProjectWhereInput {
  if (peStatus === 'not-started') return PE_NONE;
  if (peStatus === 'proposal-ready') return PE_ALL_FOUR;
  return {
    AND: [PE_ANY_ONE, { NOT: PE_ALL_FOUR }],
  };
}

const PROJECT_STATUS_VALUES = new Set<string>(Object.values(ProjectStatus));
const PROJECT_STAGE_VALUES = new Set<string>(Object.values(ProjectStage));

/** Map UI / query tokens to Prisma project filters */
function stagesToProjectWhere(stages: string[]): Prisma.ProjectWhereInput | null {
  const ors: Prisma.ProjectWhereInput[] = [];
  for (const raw of stages) {
    const u = raw.trim().toUpperCase();
    if (!u) continue;
    if (u === 'PROPOSAL') {
      ors.push({
        OR: [{ projectStatus: ProjectStatus.PROPOSAL }, { projectStage: ProjectStage.PROPOSAL }],
      });
      continue;
    }
    if (u === 'CONFIRMED') {
      ors.push({ projectStatus: ProjectStatus.CONFIRMED });
      continue;
    }
    if (PROJECT_STATUS_VALUES.has(u)) {
      ors.push({ projectStatus: u as ProjectStatus });
    } else if (PROJECT_STAGE_VALUES.has(u)) {
      ors.push({ projectStage: u as ProjectStage });
    }
  }
  if (ors.length === 0) return null;
  if (ors.length === 1) return ors[0]!;
  return { OR: ors };
}

/**
 * Visibility + search + filters for PE selected-project list.
 * Sales visibility is enforced only via Prisma (no post-filter).
 */
export function buildPeSelectedWhere(
  role: UserRole | undefined,
  userId: string | undefined,
  filters: PeProjectsListFilters,
): Prisma.PESelectedProjectWhereInput {
  const projectAnd: Prisma.ProjectWhereInput[] = [];

  if (role === UserRole.SALES && userId) {
    projectAnd.push({
      OR: [{ salespersonId: userId }, { customer: { salespersonId: userId } }],
    });
  }

  if (filters.projectId?.trim()) {
    projectAnd.push({ id: filters.projectId.trim() });
  }

  if (filters.salespersonId?.trim()) {
    projectAnd.push({ salespersonId: filters.salespersonId.trim() });
  }

  const q = filters.q?.trim();
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    for (const term of terms) {
      projectAnd.push({
        OR: [
          { customer: { customerName: { contains: term, mode: 'insensitive' } } },
          { customer: { city: { contains: term, mode: 'insensitive' } } },
          { siteAddress: { contains: term, mode: 'insensitive' } },
          { customer: { contactPerson: { contains: term, mode: 'insensitive' } } },
          { customer: { phone: { contains: term, mode: 'insensitive' } } },
          { salesperson: { name: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }
  }

  if (filters.stages?.length) {
    const sw = stagesToProjectWhere(filters.stages);
    if (sw) projectAnd.push(sw);
  }

  if (filters.peStatus) {
    projectAnd.push(projectWhereForPeArtifactStatus(filters.peStatus));
  }

  if (projectAnd.length === 0) return {};
  return { project: { AND: projectAnd } };
}

export function orderByForPeList(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Prisma.PESelectedProjectOrderByWithRelationInput {
  const o = sortOrder;
  switch (sortBy) {
    case 'projectUpdatedAt':
      return { project: { updatedAt: o } };
    case 'customerName':
      return { project: { customer: { customerName: o } } };
    case 'systemCapacity':
      return { project: { systemCapacity: o } };
    case 'projectCost':
      return { project: { projectCost: o } };
    case 'confirmationDate':
      return { project: { confirmationDate: o } };
    case 'createdAt':
      return { project: { createdAt: o } };
    case 'selectionUpdatedAt':
    default:
      return { updatedAt: o };
  }
}

export const PE_PROJECTS_SORT_FIELDS = new Set([
  'selectionUpdatedAt',
  'projectUpdatedAt',
  'customerName',
  'systemCapacity',
  'projectCost',
  'confirmationDate',
  'createdAt',
]);

export function parseStagesFromQuery(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    const out = raw.flatMap((x) => String(x).split(',')).map((s) => s.trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const out = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

/** AND-merge an extra `project` clause onto a PE selection where (from `buildPeSelectedWhere`). */
export function mergePeSelectedProjectWhere(
  base: Prisma.PESelectedProjectWhereInput,
  extraProjectClause: Prisma.ProjectWhereInput,
): Prisma.PESelectedProjectWhereInput {
  if (Object.keys(extraProjectClause).length === 0) return base;
  const cur = base.project;
  if (cur == null) {
    return { project: extraProjectClause };
  }
  if (typeof cur === 'object' && cur !== null && 'AND' in cur && Array.isArray((cur as { AND: unknown }).AND)) {
    const and = (cur as { AND: Prisma.ProjectWhereInput[] }).AND;
    return { project: { AND: [...and, extraProjectClause] } };
  }
  return { project: { AND: [cur as Prisma.ProjectWhereInput, extraProjectClause] } };
}

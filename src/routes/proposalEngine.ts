import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma, ProjectStatus, UserRole } from '@prisma/client';
import * as Sentry from '@sentry/node';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';
import { logSecurityAudit } from '../utils/auditLogger';
import {
  buildPeSelectedWhere,
  mergePeSelectedProjectWhere,
  orderByForPeList,
  parseStagesFromQuery,
  PE_PROJECTS_SORT_FIELDS,
  projectWhereForPeArtifactStatus,
  type PeProjectsListFilters,
} from '../utils/peProjectListQuery';
import crypto from 'crypto';

const router = express.Router();

/** Log in dev only; report to Sentry in prod when SENTRY_DSN is set. */
function reportPeError(err: unknown, message?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(message ?? 'Proposal Engine error:', err);
  }
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { tags: { route: 'proposal-engine' } });
  }
}

/** Roles that may view any project's proposal artifacts (not limited to own projects). */
const ROLES_CAN_VIEW_ALL_PROPOSALS: UserRole[] = [
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
  UserRole.FINANCE,
  UserRole.ADMIN,
];

const PE_ACCESS_DENIED_VIEW =
  'Access denied. Proposals are visible only to the salesperson assigned on the project or customer, and to Operations, Management, Finance, and Admin.';
const PE_ACCESS_DENIED_EDIT =
  'Only the salesperson assigned on the project or customer, or Admin, can create or edit proposal artifacts. Operations, Management, and Finance have read-only access.';
const PE_ACCESS_DENIED_DELETE =
  'Only Admin can delete saved proposals or remove all Proposal Engine artifacts for a project.';

/**
 * Sales may use Proposal Engine for a project when they are the project's assigned salesperson
 * OR the customer's assigned salesperson (CRM often tags the customer; project.salespersonId may be unset).
 */
async function salesUserHasPeAccess(
  project: { salespersonId?: string | null; customerId: string; customer?: { salespersonId?: string | null } | null },
  userId: string,
): Promise<boolean> {
  if (project.salespersonId === userId) return true;
  const fromJoin = project.customer?.salespersonId;
  if (fromJoin === userId) return true;
  if (fromJoin != null && fromJoin !== userId) return false;
  const cust = await prisma.customer.findUnique({
    where: { id: project.customerId },
    select: { salespersonId: true },
  });
  return cust?.salespersonId === userId;
}

async function ensureProjectAccess(project: any, req: Request, res: Response): Promise<boolean> {
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return false;
  }

  const role = req.user?.role;
  const userId = req.user?.id;

  // Operations, Management, Finance, Admin: can view any project's proposals.
  if (role && ROLES_CAN_VIEW_ALL_PROPOSALS.includes(role)) {
    return true;
  }

  if (role === UserRole.SALES && userId) {
    const allowed = await salesUserHasPeAccess(project, userId);
    if (!allowed) {
      res.status(403).json({ error: PE_ACCESS_DENIED_VIEW });
      return false;
    }
    return true;
  }

  res.status(403).json({ error: PE_ACCESS_DENIED_VIEW });
  return false;
}

/**
 * Latest saved PE proposal row. If the DB was not migrated with `proposalView` on `pe_proposals`,
 * a full-model read throws P2022; we retry without that column so list/detail APIs keep working.
 */
async function findLatestPeProposal(projectId: string) {
  try {
    return await prisma.pEProposal.findFirst({
      where: { projectId },
      orderBy: { savedAt: 'desc' },
    });
  } catch (e: unknown) {
    const err = e as { code?: string; meta?: { column?: string } };
    if (err?.code === 'P2022' && String(err?.meta?.column ?? '').includes('proposalView')) {
      return prisma.pEProposal.findFirst({
        where: { projectId },
        orderBy: { savedAt: 'desc' },
        select: {
          id: true,
          projectId: true,
          createdById: true,
          refNumber: true,
          generatedAt: true,
          bomComments: true,
          editedHtml: true,
          textOverrides: true,
          customSectionsBeforeBoq: true,
          summary: true,
          includeRoofLayout: true,
          savedAt: true,
          updatedAt: true,
        },
      });
    }
    throw e;
  }
}

/** Only Admin may delete PE data (single proposal artifact or full kit). */
function ensurePeDeleteAccess(req: Request, res: Response): boolean {
  const roleStr = req.user?.role != null ? String(req.user.role).toUpperCase() : '';
  if (roleStr === 'ADMIN') return true;
  res.status(403).json({ error: PE_ACCESS_DENIED_DELETE });
  return false;
}

/** Only Admin (all projects) or Sales (project or customer assignee) may create/update artifacts. Operations, Management, Finance are read-only. */
async function ensureProjectWriteAccess(project: any, req: Request, res: Response): Promise<boolean> {
  if (!project) return false;
  const role = req.user?.role;
  const userId = req.user?.id;
  const roleStr = role != null ? String(role).toUpperCase() : '';
  if (roleStr === 'ADMIN') return true;
  if (role === UserRole.SALES && userId) {
    const allowed = await salesUserHasPeAccess(project, userId);
    if (!allowed) {
      res.status(403).json({ error: PE_ACCESS_DENIED_EDIT });
      return false;
    }
    return true;
  }
  res.status(403).json({ error: PE_ACCESS_DENIED_EDIT });
  return false;
}

// List projects that have been explicitly selected in Proposal Engine.
// Sales: projects assigned to them (so Admin-selected projects for Anoop appear for Anoop).
// Operations/Management/Finance/Admin: all selections.
//
// Query: limit (default 200, max 500), offset | page (1-based), q, stage | stages (comma-separated),
// peStatus (not-started | draft | proposal-ready), salespersonId (non-Sales only), projectId (exact CRM project),
// sortBy (allowlist), sortOrder (asc|desc). Response body remains a JSON array; total hits in X-Total-Count.
router.get('/projects', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    // Only Sales (assigned projects) and Operations/Management/Finance/Admin (all projects) may list.
    if (!role || (!ROLES_CAN_VIEW_ALL_PROPOSALS.includes(role) && role !== UserRole.SALES)) {
      res.status(403).json({
        error: 'Access denied. Proposal Engine projects are visible only to the assigned salesperson and to Operations, Management, Finance, and Admin.',
      });
      return;
    }

    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === 'string'
        ? Math.min(Math.max(parseInt(limitRaw, 10) || 1, 1), 500)
        : 200;

    const offsetRaw = req.query.offset ?? req.query.skip;
    let offset = 0;
    if (typeof offsetRaw === 'string') {
      offset = Math.max(parseInt(offsetRaw, 10) || 0, 0);
    }
    const pageRaw = req.query.page;
    if (typeof pageRaw === 'string') {
      const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
      offset = (page - 1) * limit;
    }

    const sortByRaw = req.query.sortBy;
    const sortBy =
      typeof sortByRaw === 'string' && PE_PROJECTS_SORT_FIELDS.has(sortByRaw)
        ? sortByRaw
        : 'selectionUpdatedAt';

    const orderRaw = String(req.query.sortOrder ?? req.query.order ?? 'desc').toLowerCase();
    const sortOrder = orderRaw === 'asc' ? 'asc' : 'desc';

    const filters: PeProjectsListFilters = {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
      stages:
        parseStagesFromQuery(req.query.stages) ?? parseStagesFromQuery(req.query.stage),
    };

    const ps = typeof req.query.peStatus === 'string' ? req.query.peStatus.trim().toLowerCase() : '';
    if (ps === 'not-started' || ps === 'draft' || ps === 'proposal-ready') {
      filters.peStatus = ps;
    }

    if (role !== UserRole.SALES && typeof req.query.salespersonId === 'string') {
      filters.salespersonId = req.query.salespersonId;
    }

    const selectionWhere = buildPeSelectedWhere(role, userId, filters);

    const total = await prisma.pESelectedProject.count({ where: selectionWhere });

    const selections = await prisma.pESelectedProject.findMany({
      where: selectionWhere,
      include: {
        project: {
          include: {
            customer: true,
            salesperson: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: orderByForPeList(sortBy, sortOrder),
      skip: offset,
      take: limit,
    });

    const projectIds = selections.map((s) => s.projectId);

    // Determine artifact completion per project so CRM/PE both agree (labels in CRM: Not Yet Created, PE Draft, PE Ready):
    // - "proposal-ready" (PE Ready) when all four artifacts exist.
    // - "draft" (PE Draft) when at least one artifact exists but the set is incomplete.
    // - "not-started" (Not Yet Created) when the project is selected in PE but no artifacts yet.
    const [costings, boms, rois, proposals] = projectIds.length
      ? await Promise.all([
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
        ])
      : [[], [], [], []];

    const hasCosting = new Set(costings.map((p) => p.projectId));
    const hasBom = new Set(boms.map((p) => p.projectId));
    const hasRoi = new Set(rois.map((p) => p.projectId));
    const hasProposal = new Set(proposals.map((p) => p.projectId));

    const payload = selections
      .map((s) => {
        const hasAny =
          hasCosting.has(s.projectId) ||
          hasBom.has(s.projectId) ||
          hasRoi.has(s.projectId) ||
          hasProposal.has(s.projectId);

        const allFour =
          hasCosting.has(s.projectId) &&
          hasBom.has(s.projectId) &&
          hasRoi.has(s.projectId) &&
          hasProposal.has(s.projectId);

        return {
          ...s.project,
          peStatus: allFour ? 'proposal-ready' : hasAny ? 'draft' : 'not-started',
          peSelectedAt: s.selectedAt,
          peSelectedById: s.selectedById,
        };
      })
      .filter((p) => ['not-started', 'draft', 'proposal-ready'].includes(String(p.peStatus)));

    res.setHeader('X-Total-Count', String(total));
    res.json(payload);
  } catch (error: any) {
    reportPeError(error, 'Error fetching proposal engine projects');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Aggregate counts for the Customers / Projects strip (same filters as GET /projects, no pagination).
router.get('/projects/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!role || (!ROLES_CAN_VIEW_ALL_PROPOSALS.includes(role) && role !== UserRole.SALES)) {
      res.status(403).json({
        error: 'Access denied. Proposal Engine projects are visible only to the assigned salesperson and to Operations, Management, Finance, and Admin.',
      });
      return;
    }

    const filters: PeProjectsListFilters = {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
      stages:
        parseStagesFromQuery(req.query.stages) ?? parseStagesFromQuery(req.query.stage),
    };

    const ps = typeof req.query.peStatus === 'string' ? req.query.peStatus.trim().toLowerCase() : '';
    if (ps === 'not-started' || ps === 'draft' || ps === 'proposal-ready') {
      filters.peStatus = ps;
    }

    if (role !== UserRole.SALES && typeof req.query.salespersonId === 'string') {
      filters.salespersonId = req.query.salespersonId;
    }

    const baseWhere = buildPeSelectedWhere(role, userId, filters);

    const [total, notStarted, draft, ready, confirmed] = await Promise.all([
      prisma.pESelectedProject.count({ where: baseWhere }),
      prisma.pESelectedProject.count({
        where: mergePeSelectedProjectWhere(baseWhere, projectWhereForPeArtifactStatus('not-started')),
      }),
      prisma.pESelectedProject.count({
        where: mergePeSelectedProjectWhere(baseWhere, projectWhereForPeArtifactStatus('draft')),
      }),
      prisma.pESelectedProject.count({
        where: mergePeSelectedProjectWhere(baseWhere, projectWhereForPeArtifactStatus('proposal-ready')),
      }),
      prisma.pESelectedProject.count({
        where: mergePeSelectedProjectWhere(baseWhere, { projectStatus: ProjectStatus.CONFIRMED }),
      }),
    ]);

    res.json({ total, notStarted, draft, ready, confirmed });
  } catch (error: any) {
    reportPeError(error, 'Error fetching proposal engine project stats');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Shared Costing templates
// - Visible to Sales and Admin (for loading).
// - Any Sales/Admin can create templates.
// - Only Admin may delete templates.
router.get('/costing-templates', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const roleStr = role != null ? String(role).toUpperCase() : '';
    if (!roleStr || !['ADMIN', 'SALES'].includes(roleStr)) {
      return res.status(403).json({ error: 'Only Sales and Admin can view costing templates.' });
    }

    const templates = await prisma.pECostingTemplate.findMany({
      orderBy: { savedAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        items: t.items,
        savedAt: t.savedAt,
        createdById: t.createdById,
        createdByName: t.createdBy?.name ?? t.createdBy?.email ?? null,
      })),
    );
  } catch (error: any) {
    reportPeError(error, 'Error fetching PE costing templates');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/costing-templates', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const roleStr = role != null ? String(role).toUpperCase() : '';
    if (!roleStr || !['ADMIN', 'SALES'].includes(roleStr)) {
      return res.status(403).json({ error: 'Only Sales and Admin can save costing templates.' });
    }

    const { name, description, items } = req.body as {
      name?: string;
      description?: string;
      items?: unknown;
    };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Template items are required.' });
    }

    const template = await prisma.pECostingTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        items,
        createdById: req.user!.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Optional: log for audit (treated as generic security event).
    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'costing_template_saved',
      entityType: 'PECOSTINGTEMPLATE',
      entityId: template.id,
      summary: `Saved costing template "${template.name}"`,
      req,
    });

    res.status(201).json({
      id: template.id,
      name: template.name,
      description: template.description,
      items: template.items,
      savedAt: template.savedAt,
      createdById: template.createdById,
      createdByName: template.createdBy?.name ?? template.createdBy?.email ?? null,
    });
  } catch (error: any) {
    reportPeError(error, 'Error saving PE costing template');
    res.status(500).json({ error: error.message || 'Failed to save costing template' });
  }
});

router.delete('/costing-templates/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const roleStr = role != null ? String(role).toUpperCase() : '';
    if (roleStr !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Admin can delete costing templates.' });
    }

    const existing = await prisma.pECostingTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    await prisma.pECostingTemplate.delete({
      where: { id: req.params.id },
    });

    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'costing_template_deleted',
      entityType: 'PECOSTINGTEMPLATE',
      entityId: existing.id,
      summary: `Deleted costing template "${existing.name}"`,
      req,
    });

    return res.status(204).end();
  } catch (error: any) {
    reportPeError(error, 'Error deleting PE costing template');
    res.status(500).json({ error: error.message || 'Failed to delete costing template' });
  }
});

// List eligible CRM projects that can be selected into Proposal Engine.
router.get('/projects/eligible', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    const roleStr = role != null ? String(role).toUpperCase() : '';

    if (!role || (!ROLES_CAN_VIEW_ALL_PROPOSALS.includes(role) && role !== UserRole.SALES)) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    // Exclude only projects that were explicitly removed from PE (hidden). Do not exclude
    // already-selected projects so the list matches CRM: all Proposal/Confirmed projects
    // assigned to the user appear in the picker; re-selecting an already-selected project
    // just opens/switches to that customer in the frontend.
    const removed = await prisma.pERemovedProject.findMany({ select: { projectId: true } });
    const removedIds = removed.map((r) => r.projectId);

    const and: any[] = [
      { projectStatus: { in: [ProjectStatus.PROPOSAL, ProjectStatus.CONFIRMED] } },
      ...(removedIds.length > 0 ? [{ id: { notIn: removedIds } }] : []),
    ];
    // Sales: project assignee OR customer's assigned salesperson.
    if (role === UserRole.SALES && userId) {
      and.push({
        OR: [{ salespersonId: userId }, { customer: { salespersonId: userId } }],
      });
    }

    const projects = await prisma.project.findMany({
      where: { AND: and },
      include: {
        customer: true,
        salesperson: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(projects);
  } catch (error: any) {
    reportPeError(error, 'Error fetching eligible CRM projects');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Mark a CRM project as selected into Proposal Engine (Admin or owning Sales).
router.post('/projects/:id/select', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!(await ensureProjectAccess(project, req, res))) return;
    if (!(await ensureProjectWriteAccess(project, req, res))) return;

    await prisma.pESelectedProject.upsert({
      where: { projectId: req.params.id },
      create: {
        projectId: req.params.id,
        selectedById: req.user!.id,
      },
      update: {
        selectedById: req.user!.id,
      },
    });

    // Legacy compatibility: ensure it isn't hidden by removed marker.
    await prisma.pERemovedProject.deleteMany({ where: { projectId: req.params.id } });

    res.json({ message: 'Project selected' });
  } catch (error: any) {
    reportPeError(error, 'Error selecting project');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Log a Proposal Engine open event from CRM as a "proposal_generated" security audit entry.
// This ensures Audit & Security shows Proposal → Proposal generated whenever the
// Proposals (New) button is clicked on the Project Detail page in Rayenna CRM.
router.post('/audit/proposal-click', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body as { projectId?: string };
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slNo: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.user) {
      logSecurityAudit({
        userId: req.user.id,
        role: req.user.role,
        actionType: 'proposal_generated',
        entityType: 'Proposal',
        // We don't have a CRM Proposal record here, so we associate the event with the project id.
        entityId: project.id,
        summary: `Proposal Engine opened for project #${project.slNo}`,
        req,
      });
    }

    return res.status(204).end();
  } catch (error: any) {
    reportPeError(error, 'Error logging Proposal Engine click');
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Admin-only: clear saved Proposal Engine artifacts for all PROPOSAL/CONFIRMED projects.
// NOTE: Does NOT touch any frontend templates (those are local-only).
router.post('/admin/clear', authenticate, async (req: Request, res: Response) => {
  try {
    const roleStr = req.user?.role != null ? String(req.user.role).toUpperCase() : '';
    if (roleStr !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Admin can clear Proposal Engine artifacts.' });
    }

    // Clear artifacts only for projects that were selected into Proposal Engine.
    const selected = await prisma.pESelectedProject.findMany({
      select: { projectId: true },
    });
    const projectIds = selected.map((s) => s.projectId);
    if (projectIds.length === 0) {
      return res.json({ message: 'No selected Proposal Engine projects to clear.', clearedProjects: 0 });
    }

    await prisma.$transaction([
      prisma.pECostingSheet.deleteMany({ where: { projectId: { in: projectIds } } }),
      prisma.pEBomSheet.deleteMany({ where: { projectId: { in: projectIds } } }),
      prisma.pERoiResult.deleteMany({ where: { projectId: { in: projectIds } } }),
      prisma.pEProposal.deleteMany({ where: { projectId: { in: projectIds } } }),
      // Legacy compatibility: unhide if previously marked removed.
      prisma.pERemovedProject.deleteMany({ where: { projectId: { in: projectIds } } }),
    ]);

    return res.json({
      message: 'Proposal Engine artifacts cleared.',
      clearedProjects: projectIds.length,
    });
  } catch (error: any) {
    reportPeError(error, 'Error clearing Proposal Engine list');
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Admin-only: restore (unhide) all projects that were removed from Proposal Engine list.
// This does NOT recreate any artifacts; it only clears the "removed" marker.
router.post('/admin/unhide-all', authenticate, async (req: Request, res: Response) => {
  try {
    const roleStr = req.user?.role != null ? String(req.user.role).toUpperCase() : '';
    if (roleStr !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Admin can restore hidden Proposal Engine projects.' });
    }

    const result = await prisma.pERemovedProject.deleteMany({});

    return res.json({
      message: 'Restored hidden Proposal Engine projects.',
      restoredProjects: result.count,
    });
  } catch (error: any) {
    reportPeError(error, 'Error restoring hidden Proposal Engine projects');
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/projects/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        siteSurveys: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!(await ensureProjectAccess(project, req, res))) {
      return;
    }

    const [costing, bom, roi, proposal, roofLayout] = await Promise.all([
      prisma.pECostingSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      }),
      prisma.pEBomSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      }),
      prisma.pERoiResult.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      }),
      findLatestPeProposal(req.params.id),
      prisma.projectRoofLayout.findFirst({
        where: { projectId: req.params.id },
      }),
    ]);

    const proposalWithRoofLayout = proposal
      ? {
          ...proposal,
          roofLayout: roofLayout
            ? {
                roof_area_m2: roofLayout.roofAreaM2,
                usable_area_m2: roofLayout.usableAreaM2,
                panel_count: roofLayout.panelCount,
                layout_image_url: roofLayout.layoutImageUrl,
                layout_image_3d_url: roofLayout.layoutImage3dUrl ?? undefined,
                prefer_3d_for_proposal: roofLayout.prefer3dForProposal,
                savedAt: roofLayout.savedAt?.toISOString?.() ?? undefined,
              }
            : null,
        }
      : null;

    res.json({
      project,
      artifacts: {
        costing,
        bom,
        roi,
        proposal: proposalWithRoofLayout,
      },
    });
  } catch (error: any) {
    reportPeError(error, 'Error fetching proposal engine project details');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/projects/:id/costing', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!(await ensureProjectAccess(project, req, res))) {
      return;
    }

    const costing = await prisma.pECostingSheet.findFirst({
      where: { projectId: req.params.id },
      orderBy: { savedAt: 'desc' },
    });

    res.json(costing || null);
  } catch (error: any) {
    reportPeError(error, 'Error fetching costing sheet');
    res.status(500).json({ error: error.message || 'Failed to fetch costing sheet' });
  }
});

router.put(
  '/projects/:id/costing',
  authenticate,
  [
    body('sheetName').isString().notEmpty(),
    body('items').exists(),
    body('grandTotal').isFloat(),
    body('showGst').optional().isBoolean(),
    body('marginPct').optional().isFloat(),
    body('systemSizeKw').optional().isFloat(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!(await ensureProjectAccess(project, req, res))) {
        return;
      }
      if (!(await ensureProjectWriteAccess(project, req, res))) {
        return;
      }

      // If this project was previously "removed from list", writing a new artifact should make it visible again.
      await prisma.pERemovedProject.deleteMany({ where: { projectId: req.params.id } });

      const existing = await prisma.pECostingSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      });

      if (Array.isArray(req.body.items) && req.body.items.length > MAX_COSTING_ROWS) {
        console.warn(
          `[pe][limit] COSTING_TOO_LARGE project=${req.params.id} user=${req.user?.id ?? 'unknown'} rows=${req.body.items.length} limit=${MAX_COSTING_ROWS}`,
        );
        if (req.user) {
          logSecurityAudit({
            userId: req.user.id,
            role: req.user.role,
            actionType: 'pe_limit_costing_too_large',
            entityType: 'Project',
            entityId: req.params.id,
            summary: `Costing rows=${req.body.items.length}, limit=${MAX_COSTING_ROWS}`,
            req,
          });
        }
        return res.status(413).json({
          error: `Costing sheet has too many rows. Please split into smaller templates or sheets.`,
          code: 'COSTING_TOO_LARGE',
          limitRows: MAX_COSTING_ROWS,
          rowCount: req.body.items.length,
        });
      }

      const data = {
        projectId: req.params.id,
        sheetName: req.body.sheetName,
        items: req.body.items,
        showGst: req.body.showGst ?? true,
        marginPct: req.body.marginPct ?? 0,
        grandTotal: req.body.grandTotal,
        systemSizeKw: req.body.systemSizeKw ?? 0,
      };

      let costing;
      if (existing) {
        costing = await prisma.pECostingSheet.update({
          where: { id: existing.id },
          data,
        });
      } else {
        costing = await prisma.pECostingSheet.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(costing);
    } catch (error: any) {
      reportPeError(error, 'Error saving costing sheet');
      res.status(500).json({ error: error.message || 'Failed to save costing sheet' });
    }
  }
);

router.get('/projects/:id/bom', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!(await ensureProjectAccess(project, req, res))) {
      return;
    }

    const bom = await prisma.pEBomSheet.findFirst({
      where: { projectId: req.params.id },
      orderBy: { savedAt: 'desc' },
    });

    res.json(bom || null);
  } catch (error: any) {
    reportPeError(error, 'Error fetching BOM sheet');
    res.status(500).json({ error: error.message || 'Failed to fetch BOM sheet' });
  }
});

router.put(
  '/projects/:id/bom',
  authenticate,
  [body('rows').exists()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!(await ensureProjectAccess(project, req, res))) {
        return;
      }
      if (!(await ensureProjectWriteAccess(project, req, res))) {
        return;
      }

      // If this project was previously "removed from list", writing a new artifact should make it visible again.
      await prisma.pERemovedProject.deleteMany({ where: { projectId: req.params.id } });

      const existing = await prisma.pEBomSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      });

      if (Array.isArray(req.body.rows) && req.body.rows.length > MAX_BOM_ROWS) {
        console.warn(
          `[pe][limit] BOM_TOO_LARGE project=${req.params.id} user=${req.user?.id ?? 'unknown'} rows=${req.body.rows.length} limit=${MAX_BOM_ROWS}`,
        );
        if (req.user) {
          logSecurityAudit({
            userId: req.user.id,
            role: req.user.role,
            actionType: 'pe_limit_bom_too_large',
            entityType: 'Project',
            entityId: req.params.id,
            summary: `BOM rows=${req.body.rows.length}, limit=${MAX_BOM_ROWS}`,
            req,
          });
        }
        return res.status(413).json({
          error: `BOM has too many rows. Please split or simplify the BOM before saving.`,
          code: 'BOM_TOO_LARGE',
          limitRows: MAX_BOM_ROWS,
          rowCount: req.body.rows.length,
        });
      }

      const data = {
        projectId: req.params.id,
        rows: req.body.rows,
      };

      let bom;
      if (existing) {
        bom = await prisma.pEBomSheet.update({
          where: { id: existing.id },
          data,
        });
      } else {
        bom = await prisma.pEBomSheet.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(bom);
    } catch (error: any) {
      reportPeError(error, 'Error saving BOM sheet');
      res.status(500).json({ error: error.message || 'Failed to save BOM sheet' });
    }
  }
);

router.get('/projects/:id/roi', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!(await ensureProjectAccess(project, req, res))) {
      return;
    }

    const roi = await prisma.pERoiResult.findFirst({
      where: { projectId: req.params.id },
      orderBy: { savedAt: 'desc' },
    });

    res.json(roi || null);
  } catch (error: any) {
    reportPeError(error, 'Error fetching ROI result');
    res.status(500).json({ error: error.message || 'Failed to fetch ROI result' });
  }
});

router.put(
  '/projects/:id/roi',
  authenticate,
  [body('result').exists()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!(await ensureProjectAccess(project, req, res))) {
        return;
      }
      if (!(await ensureProjectWriteAccess(project, req, res))) {
        return;
      }

      // If this project was previously "removed from list", writing a new artifact should make it visible again.
      await prisma.pERemovedProject.deleteMany({ where: { projectId: req.params.id } });

      const existing = await prisma.pERoiResult.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      });

      const data = {
        projectId: req.params.id,
        result: req.body.result,
      };

      let roi;
      if (existing) {
        roi = await prisma.pERoiResult.update({
          where: { id: existing.id },
          data,
        });
      } else {
        roi = await prisma.pERoiResult.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(roi);
    } catch (error: any) {
      reportPeError(error, 'Error saving ROI result');
      res.status(500).json({ error: error.message || 'Failed to save ROI result' });
    }
  }
);

router.get('/projects/:id/proposal', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!(await ensureProjectAccess(project, req, res))) {
      return;
    }

    const proposal = await findLatestPeProposal(req.params.id);

    res.json(proposal || null);
  } catch (error: any) {
    reportPeError(error, 'Error fetching saved proposal');
    res.status(500).json({ error: error.message || 'Failed to fetch saved proposal' });
  }
});

router.put(
  '/projects/:id/proposal',
  authenticate,
  [
    body('refNumber').isString().notEmpty(),
    body('generatedAt').isISO8601(),
    body('includeRoofLayout').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!(await ensureProjectAccess(project, req, res))) {
        return;
      }
      if (!(await ensureProjectWriteAccess(project, req, res))) {
        return;
      }

      // If this project was previously "removed from list", writing a new artifact should make it visible again.
      await prisma.pERemovedProject.deleteMany({ where: { projectId: req.params.id } });

      const existing = await findLatestPeProposal(req.params.id);

      const editedHtml: string | null =
        typeof req.body.editedHtml === 'string' ? req.body.editedHtml : null;
      if (editedHtml) {
        const htmlBytes = Buffer.byteLength(editedHtml, 'utf8');
        if (htmlBytes > MAX_PROPOSAL_HTML_BYTES) {
          console.warn(
            `[pe][limit] PROPOSAL_TOO_LARGE project=${req.params.id} user=${req.user?.id ?? 'unknown'} sizeBytes=${htmlBytes} limitBytes=${MAX_PROPOSAL_HTML_BYTES}`,
          );
          if (req.user) {
            logSecurityAudit({
              userId: req.user.id,
              role: req.user.role,
              actionType: 'pe_limit_proposal_too_large',
              entityType: 'Project',
              entityId: req.params.id,
              summary: `Proposal HTML bytes=${htmlBytes}, limit=${MAX_PROPOSAL_HTML_BYTES}`,
              req,
            });
          }
          return res.status(413).json({
            error: `Proposal content is too large to save. Please trim content (or split into multiple proposals) and try again.`,
            code: 'PROPOSAL_TOO_LARGE',
            limitBytes: MAX_PROPOSAL_HTML_BYTES,
            sizeBytes: htmlBytes,
          });
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'proposalView')) {
        const proposalView = req.body.proposalView;
        if (proposalView != null && typeof proposalView === 'object') {
          const viewBytes = Buffer.byteLength(JSON.stringify(proposalView), 'utf8');
          if (viewBytes > MAX_PROPOSAL_VIEW_JSON_BYTES) {
            console.warn(
              `[pe][limit] PROPOSAL_VIEW_TOO_LARGE project=${req.params.id} user=${req.user?.id ?? 'unknown'} sizeBytes=${viewBytes}`,
            );
            return res.status(413).json({
              error:
                'Proposal data snapshot is too large to save. Try reducing the costing sheet size or contact support.',
              code: 'PROPOSAL_VIEW_TOO_LARGE',
              limitBytes: MAX_PROPOSAL_VIEW_JSON_BYTES,
              sizeBytes: viewBytes,
            });
          }
        }
      }

      const customSectionsPatch: { customSectionsBeforeBoq?: Prisma.InputJsonValue | typeof Prisma.DbNull } = {};
      if (Object.prototype.hasOwnProperty.call(req.body, 'customSectionsBeforeBoq')) {
        const raw = req.body.customSectionsBeforeBoq;
        if (raw == null) {
          customSectionsPatch.customSectionsBeforeBoq = Prisma.DbNull;
        } else {
          if (!Array.isArray(raw)) {
            return res.status(400).json({ error: 'customSectionsBeforeBoq must be an array or null' });
          }
          const csBytes = Buffer.byteLength(JSON.stringify(raw), 'utf8');
          if (csBytes > MAX_PROPOSAL_CUSTOM_SECTIONS_JSON_BYTES) {
            return res.status(413).json({
              error: 'Custom sections payload is too large to save. Remove images or shorten content.',
              code: 'PROPOSAL_CUSTOM_SECTIONS_TOO_LARGE',
              limitBytes: MAX_PROPOSAL_CUSTOM_SECTIONS_JSON_BYTES,
              sizeBytes: csBytes,
            });
          }
          customSectionsPatch.customSectionsBeforeBoq = raw as Prisma.InputJsonValue;
        }
      }

      const includeRoofLayout: boolean =
        typeof req.body.includeRoofLayout === 'boolean'
          ? req.body.includeRoofLayout
          : existing?.includeRoofLayout ?? false;

      const data = {
        projectId: req.params.id,
        refNumber: req.body.refNumber,
        generatedAt: new Date(req.body.generatedAt),
        bomComments: req.body.bomComments ?? null,
        editedHtml,
        textOverrides: req.body.textOverrides ?? null,
        ...customSectionsPatch,
        summary: req.body.summary ?? null,
        includeRoofLayout,
        ...(Object.prototype.hasOwnProperty.call(req.body, 'proposalView')
          ? { proposalView: req.body.proposalView }
          : {}),
      };

      let proposal;
      if (existing) {
        proposal = await prisma.pEProposal.update({
          where: { id: existing.id },
          data,
        });
      } else {
        proposal = await prisma.pEProposal.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(proposal);
    } catch (error: any) {
      reportPeError(error, 'Error saving proposal artifact');
      res.status(500).json({ error: error.message || 'Failed to save proposal artifact' });
    }
  }
);

// Delete only the saved proposal artifact for a project (Admin only).
router.delete('/projects/:id/proposal', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!(await ensureProjectAccess(project, req, res))) {
      return;
    }
    if (!ensurePeDeleteAccess(req, res)) {
      return;
    }

    const result = await prisma.pEProposal.deleteMany({
      where: { projectId: req.params.id },
    });

    // Remove project from everyone's list and mark as removed so it does not appear in eligible for any user.
    await prisma.$transaction([
      prisma.pESelectedProject.deleteMany({ where: { projectId: req.params.id } }),
      prisma.pERemovedProject.deleteMany({ where: { projectId: req.params.id } }),
      prisma.pERemovedProject.create({
        data: { projectId: req.params.id, removedById: req.user!.id },
      }),
    ]);

    res.status(200).json({ message: 'Proposal cleared', deletedCount: result.count });
  } catch (error: any) {
    reportPeError(error, 'Error clearing proposal artifact');
    res.status(500).json({ error: error.message || 'Failed to clear proposal artifact' });
  }
});

// Remove project from Proposal Engine for everyone (Admin only). Deletes all PE artifacts.
router.delete('/projects/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!(await ensureProjectAccess(project, req, res))) {
      return;
    }
    if (!ensurePeDeleteAccess(req, res)) {
      return;
    }

    await prisma.$transaction([
      prisma.pECostingSheet.deleteMany({ where: { projectId: req.params.id } }),
      prisma.pEBomSheet.deleteMany({ where: { projectId: req.params.id } }),
      prisma.pERoiResult.deleteMany({ where: { projectId: req.params.id } }),
      prisma.pEProposal.deleteMany({ where: { projectId: req.params.id } }),
      // Remove from the selected list; user can re-select later if needed.
      prisma.pESelectedProject.deleteMany({ where: { projectId: req.params.id } }),
      // Legacy cleanup
      prisma.pERemovedProject.deleteMany({ where: { projectId: req.params.id } }),
    ]);

    res.status(200).json({ message: 'Project removed from Proposal Engine selection' });
  } catch (error: any) {
    reportPeError(error, 'Error removing project from Proposal Engine');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Share proposal as link (read-only view). Create = auth; Get by token = public.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SHARE_EXPIRY_HOURS = 48;
const MAX_PE_SHARES_PER_PROJECT = 10;
const MAX_SHARE_HTML_BYTES = 2_000_000; // 2 MB (utf8). Safety guard against accidental multi-MB shares.
const MAX_PROPOSAL_HTML_BYTES = 2_000_000; // 2 MB limit for stored proposal HTML as well.
const MAX_PROPOSAL_VIEW_JSON_BYTES = 2_000_000; // 2 MB for serialized proposalView (sheet + BOM + ROI snapshot)
const MAX_PROPOSAL_CUSTOM_SECTIONS_JSON_BYTES = 1_000_000; // 1 MB for custom rich sections before BOQ
const MAX_COSTING_ROWS = 5000; // Very generous guard against accidental huge uploads.
const MAX_BOM_ROWS = 8000; // Very generous guard.

/** Create a shareable link. Optional password and custom expiry; default 48h. */
router.post('/share', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const roleStr = role != null ? String(role).toUpperCase() : '';
    // View-only roles (Ops/Management/Finance) must not create shares; same as edit access.
    if (!role || (role !== UserRole.SALES && roleStr !== 'ADMIN')) {
      return res.status(403).json({
        error: 'Access denied. Only Sales (assigned project or customer) and Admin can create proposal share links.',
      });
    }

    const { projectId, proposalHtml, refNumber, password, expiresAt: expiresAtInput } = req.body as {
      projectId?: string;
      proposalHtml?: string;
      refNumber?: string;
      password?: string;
      expiresAt?: string;
    };

    if (!projectId || typeof projectId !== 'string' || !proposalHtml || typeof proposalHtml !== 'string') {
      return res.status(400).json({ error: 'projectId and proposalHtml are required.' });
    }

    const htmlBytes = Buffer.byteLength(proposalHtml, 'utf8');
    if (htmlBytes > MAX_SHARE_HTML_BYTES) {
      console.warn(
        `[pe][limit] SHARE_PAYLOAD_TOO_LARGE project=${projectId} user=${req.user?.id ?? 'unknown'} sizeBytes=${htmlBytes} limitBytes=${MAX_SHARE_HTML_BYTES}`,
      );
      if (req.user) {
        logSecurityAudit({
          userId: req.user.id,
          role: req.user.role,
          actionType: 'pe_limit_share_payload_too_large',
          entityType: 'Project',
          entityId: projectId,
          summary: `Share HTML bytes=${htmlBytes}, limit=${MAX_SHARE_HTML_BYTES}`,
          req,
        });
      }
      return res.status(413).json({
        error: `Proposal is too large to share. Please reduce content and try again. (Size: ${(htmlBytes / 1024 / 1024).toFixed(2)} MB, Limit: ${(MAX_SHARE_HTML_BYTES / 1024 / 1024).toFixed(2)} MB)`,
        code: 'PAYLOAD_TOO_LARGE',
        limitBytes: MAX_SHARE_HTML_BYTES,
        sizeBytes: htmlBytes,
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, salespersonId: true, customerId: true },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    if (!(await ensureProjectWriteAccess(project, req, res))) {
      return;
    }

    let expiresAt: Date;
    if (expiresAtInput && typeof expiresAtInput === 'string') {
      const parsed = new Date(expiresAtInput);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid expiresAt date.' });
      }
      expiresAt = parsed;
    } else {
      const now = new Date();
      expiresAt = new Date(now.getTime() + DEFAULT_SHARE_EXPIRY_HOURS * 60 * 60 * 1000);
    }

    if (expiresAt <= new Date()) {
      return res.status(400).json({ error: 'Expiry must be in the future.' });
    }

    let passwordHash: string | null = null;
    if (password != null && String(password).trim() !== '') {
      passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    const token = crypto.randomBytes(16).toString('hex');

    await prisma.pESharedProposal.create({
      data: {
        token,
        projectId,
        proposalHtml,
        refNumber: refNumber != null ? String(refNumber) : null,
        passwordHash,
        expiresAt,
      },
    });

    // DB bloat safety: keep only the most recent N share links per project.
    // (Old links will continue to expire naturally, but this prevents unbounded growth.)
    try {
      const old = await prisma.pESharedProposal.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip: MAX_PE_SHARES_PER_PROJECT,
        select: { token: true },
      });
      if (old.length > 0) {
        const del = await prisma.pESharedProposal.deleteMany({
          where: { token: { in: old.map((r) => r.token) } },
        });
        if (del.count > 0) {
          console.log(`[cleanup] Share cap: deleted ${del.count} old PE share links for project ${projectId}`);
        }
      }
    } catch {
      // best-effort cleanup; never block share creation
    }

    res.status(201).json({
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    reportPeError(error, 'Error creating proposal share');
    res.status(500).json({ error: error.message || 'Failed to create share link' });
  }
});

/** Get shared proposal by token (public). Optional ?password= for protected links. */
router.get('/share/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token?.trim();
    const password = typeof req.query.password === 'string' ? req.query.password : undefined;

    if (!token) {
      return res.status(404).json({ error: 'Not found.' });
    }

    const row = await prisma.pESharedProposal.findUnique({
      where: { token },
    });

    if (!row) {
      return res.status(404).json({ error: 'This link is invalid or has been removed.' });
    }

    if (row.expiresAt < new Date()) {
      return res.status(403).json({ error: 'This link has expired.', code: 'EXPIRED' });
    }

    if (row.passwordHash) {
      if (!password) {
        return res.status(401).json({ error: 'This link is protected by a password.', requiresPassword: true });
      }
      const valid = await bcrypt.compare(password, row.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password.', requiresPassword: true });
      }
    }

    res.json({
      html: row.proposalHtml,
      refNumber: row.refNumber ?? undefined,
      expiresAt: row.expiresAt.toISOString(),
    });
  } catch (error: any) {
    reportPeError(error, 'Error fetching shared proposal');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Admin-only: quick metrics endpoint for PE payload/size-limit rejections.
// Useful for monitoring if users are hitting guardrails in production.
router.get('/admin/limits-stats', authenticate, async (req: Request, res: Response) => {
  try {
    const roleStr = req.user?.role != null ? String(req.user.role).toUpperCase() : '';
    if (roleStr !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Admin can view Proposal Engine limit stats.' });
    }

    const daysRaw = typeof req.query.days === 'string' ? parseInt(req.query.days, 10) : NaN;
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 90) : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const actionTypes = [
      'pe_limit_costing_too_large',
      'pe_limit_bom_too_large',
      'pe_limit_proposal_too_large',
      'pe_limit_share_payload_too_large',
    ] as const;

    const [costingTooLarge, bomTooLarge, proposalTooLarge, shareTooLarge] = await Promise.all(
      actionTypes.map((actionType) =>
        prisma.securityAuditLog.count({
          where: {
            actionType,
            createdAt: { gte: since },
          },
        }),
      ),
    );

    const byType = {
      costingTooLarge,
      bomTooLarge,
      proposalTooLarge,
      shareTooLarge,
    };

    return res.json({
      windowDays: days,
      since: since.toISOString(),
      byType,
      total: costingTooLarge + bomTooLarge + proposalTooLarge + shareTooLarge,
    });
  } catch (error: any) {
    reportPeError(error, 'Error fetching Proposal Engine limit stats');
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;


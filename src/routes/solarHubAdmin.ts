import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ConsumerMaintenanceRequestStatus, UserRole } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { logSecurityAudit } from '../utils/auditLogger';
import { generateHubCredentialsPdf } from '../utils/hubCredentialsPdf';
import {
  activateSolarHubUser,
  bulkProvisionSolarHub,
  canAdminSolarHub,
  canManageSolarHub,
  canViewSolarHub,
  deactivateSolarHubUser,
  deleteSolarHubUser,
  getSolarHubUser,
  getSolarHubUserForProject,
  listHubMaintenanceRequests,
  listProvisioningGaps,
  listSolarHubUsers,
  provisionAllSolarHubGaps,
  provisionSolarHubForProjectAdmin,
  resetSolarHubPassword,
  resyncSolarHubUserFromCustomer,
  updateHubMaintenanceRequestStatus,
  verifyHubUserPassword,
} from '../services/solarHubAdminService';
import {
  getConsumerHelpArticleAdmin,
  getConsumerHelpFaqAdmin,
  listConsumerHelpArticlesAdmin,
  listConsumerHelpFaqsAdmin,
  reimportConsumerHelpFromRepo,
  updateConsumerHelpArticleAdmin,
  updateConsumerHelpFaqAdmin,
} from '../services/consumerHelpService';
import { CONSUMER_HELP_CATEGORIES } from '../constants/consumerHelpContent';

const router = express.Router();

function requireView(req: Request, res: Response): boolean {
  if (!req.user || !canViewSolarHub(req.user.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return false;
  }
  return true;
}

function requireManage(req: Request, res: Response): boolean {
  if (!req.user || !canManageSolarHub(req.user.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.user || !canAdminSolarHub(req.user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

router.get(
  '/users',
  authenticate,
  [
    query('search').optional().isString().trim(),
    query('active').optional().isIn(['true', 'false']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    if (!requireView(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await listSolarHubUsers({
        search: req.query.search as string | undefined,
        active: req.query.active as 'true' | 'false' | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return res.json(result);
    } catch (err) {
      console.error('Solar Hub list error:', err);
      return res.status(500).json({ error: 'Failed to load Solar Hub users' });
    }
  },
);

router.get('/users/:id', authenticate, async (req: Request, res: Response) => {
  if (!requireView(req, res)) return;
  try {
    const user = await getSolarHubUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'Solar Hub user not found' });
    return res.json(user);
  } catch (err) {
    console.error('Solar Hub get user error:', err);
    return res.status(500).json({ error: 'Failed to load Solar Hub user' });
  }
});

router.get('/projects/:projectId/user', authenticate, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const broadViewRoles: UserRole[] = [
    UserRole.ADMIN,
    UserRole.OPERATIONS,
    UserRole.MANAGEMENT,
    UserRole.SALES,
    UserRole.FINANCE,
  ];
  if (!broadViewRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const user = await getSolarHubUserForProject(req.params.projectId);
    return res.json({ user });
  } catch (err) {
    console.error('Solar Hub project user error:', err);
    return res.status(500).json({ error: 'Failed to load Solar Hub user' });
  }
});

router.post('/users/:id/deactivate', authenticate, async (req: Request, res: Response) => {
  if (!requireManage(req, res)) return;
  try {
    const user = await deactivateSolarHubUser(req.params.id);
    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'hub_user_deactivated',
      entityType: 'ConsumerUser',
      entityId: user.id,
      summary: `Deactivated Solar Hub user ${user.username}`,
      req,
    });
    return res.json(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to deactivate user';
    const status = msg.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: msg });
  }
});

router.post('/users/:id/activate', authenticate, async (req: Request, res: Response) => {
  if (!requireManage(req, res)) return;
  try {
    const user = await activateSolarHubUser(req.params.id);
    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'hub_user_activated',
      entityType: 'ConsumerUser',
      entityId: user.id,
      summary: `Activated Solar Hub user ${user.username}`,
      req,
    });
    return res.json(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to activate user';
    const status = msg.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: msg });
  }
});

router.delete('/users/:id', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const existing = await getSolarHubUser(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Solar Hub user not found' });

    await deleteSolarHubUser(req.params.id);
    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'hub_user_deleted',
      entityType: 'ConsumerUser',
      entityId: existing.id,
      summary: `Deleted Solar Hub user ${existing.username} (project #${existing.project.slNo})`,
      req,
    });
    return res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete user';
    const status = msg.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: msg });
  }
});

router.post(
  '/users/:id/reset-password',
  authenticate,
  [body('mode').optional().isIn(['default', 'generated'])],
  async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const mode = (req.body.mode as 'default' | 'generated') || 'default';
      const result = await resetSolarHubPassword(req.params.id, mode);
      logSecurityAudit({
        userId: req.user!.id,
        role: req.user!.role,
        actionType: 'hub_password_reset',
        entityType: 'ConsumerUser',
        entityId: req.params.id,
        summary: `Reset Solar Hub password for ${result.username} (${mode})`,
        req,
      });
      return res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      const status = msg.includes('not found') ? 404 : 400;
      return res.status(status).json({ error: msg });
    }
  },
);

router.post('/users/:id/resync', authenticate, async (req: Request, res: Response) => {
  if (!requireManage(req, res)) return;
  try {
    const user = await resyncSolarHubUserFromCustomer(req.params.id);
    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'hub_user_resynced',
      entityType: 'ConsumerUser',
      entityId: user.id,
      summary: `Re-synced Solar Hub user ${user.username} from Customer Master`,
      req,
    });
    return res.json(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to re-sync user';
    const status = msg.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: msg });
  }
});

router.post('/projects/:projectId/provision', authenticate, async (req: Request, res: Response) => {
  if (!requireManage(req, res)) return;
  try {
    const result = await provisionSolarHubForProjectAdmin(req.params.projectId);
    if (result.action === 'created' || result.action === 'reactivated' || result.action === 'synced') {
      logSecurityAudit({
        userId: req.user!.id,
        role: req.user!.role,
        actionType: 'hub_user_provisioned',
        entityType: 'Project',
        entityId: req.params.projectId,
        summary: `Solar Hub provision ${result.action} for project (${result.username ?? 'n/a'})`,
        req,
      });
    }
    return res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to provision Solar Hub account';
    return res.status(400).json({ error: msg });
  }
});

router.get(
  '/maintenance-requests',
  authenticate,
  [
    query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    if (!requireView(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await listHubMaintenanceRequests({
        status: req.query.status as ConsumerMaintenanceRequestStatus | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return res.json(result);
    } catch (err) {
      console.error('Solar Hub maintenance list error:', err);
      return res.status(500).json({ error: 'Failed to load maintenance requests' });
    }
  },
);

router.patch(
  '/maintenance-requests/:id',
  authenticate,
  [
    param('id').isString(),
    body('status').isIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  ],
  async (req: Request, res: Response) => {
    if (!requireManage(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const item = await updateHubMaintenanceRequestStatus(
        req.params.id,
        req.body.status as ConsumerMaintenanceRequestStatus,
      );
      logSecurityAudit({
        userId: req.user!.id,
        role: req.user!.role,
        actionType: 'hub_maintenance_status_updated',
        entityType: 'ConsumerMaintenanceRequest',
        entityId: item.id,
        summary: `Solar Hub maintenance #${item.id.slice(-6)} → ${item.status}`,
        req,
      });
      return res.json(item);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update maintenance request';
      const status = msg.includes('not found') ? 404 : 400;
      return res.status(status).json({ error: msg });
    }
  },
);

router.get(
  '/provisioning/gaps',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    if (!requireView(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await listProvisioningGaps({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return res.json(result);
    } catch (err) {
      console.error('Solar Hub provisioning gaps error:', err);
      return res.status(500).json({ error: 'Failed to load provisioning gaps' });
    }
  },
);

router.post(
  '/provisioning/bulk',
  authenticate,
  [body('projectIds').isArray({ min: 1 }), body('projectIds.*').isString()],
  async (req: Request, res: Response) => {
    if (!requireManage(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const summary = await bulkProvisionSolarHub(req.body.projectIds as string[]);
      if (summary.created + summary.reactivated + summary.synced > 0) {
        logSecurityAudit({
          userId: req.user!.id,
          role: req.user!.role,
          actionType: 'hub_bulk_provisioned',
          entityType: 'Project',
          entityId: 'bulk',
          summary: `Bulk Solar Hub provision: ${summary.created} created, ${summary.reactivated} reactivated`,
          req,
        });
      }
      return res.json(summary);
    } catch (err) {
      console.error('Solar Hub bulk provision error:', err);
      return res.status(500).json({ error: 'Failed to bulk provision Solar Hub accounts' });
    }
  },
);

router.post('/provisioning/provision-all', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const summary = await provisionAllSolarHubGaps();
    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'hub_bulk_provisioned',
      entityType: 'Project',
      entityId: 'all-gaps',
      summary: `Provision all gaps: ${summary.created} created, ${summary.reactivated} reactivated`,
      req,
    });
    return res.json(summary);
  } catch (err) {
    console.error('Solar Hub provision-all error:', err);
    return res.status(500).json({ error: 'Failed to provision all gaps' });
  }
});

router.post(
  '/users/:id/credentials-pdf',
  authenticate,
  [body('password').isString().isLength({ min: 1, max: 128 })],
  async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const user = await getSolarHubUser(req.params.id);
      if (!user) return res.status(404).json({ error: 'Solar Hub user not found' });

      const password = String(req.body.password);
      const valid = await verifyHubUserPassword(req.params.id, password);
      if (!valid) {
        return res.status(400).json({ error: 'Password does not match current account password' });
      }

      const pdf = await generateHubCredentialsPdf({
        username: user.username,
        password,
        customerName: user.project.customerName,
        projectSlNo: user.project.slNo,
      });

      const filename = `solar-hub-${user.username}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      logSecurityAudit({
        userId: req.user!.id,
        role: req.user!.role,
        actionType: 'hub_credentials_pdf',
        entityType: 'ConsumerUser',
        entityId: user.id,
        summary: `Downloaded Solar Hub credentials PDF for ${user.username}`,
        req,
      });
      return res.send(pdf);
    } catch (err) {
      console.error('Solar Hub credentials PDF error:', err);
      return res.status(500).json({ error: 'Failed to generate credentials PDF' });
    }
  },
);

router.get('/help/categories', authenticate, async (req: Request, res: Response) => {
  if (!requireView(req, res)) return;
  return res.json({
    categories: CONSUMER_HELP_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
    })),
  });
});

router.get('/help/articles', authenticate, async (req: Request, res: Response) => {
  if (!requireView(req, res)) return;
  try {
    const items = await listConsumerHelpArticlesAdmin();
    return res.json({ items });
  } catch (err) {
    console.error('Solar Hub help articles list error:', err);
    return res.status(500).json({ error: 'Failed to load help articles' });
  }
});

router.get('/help/articles/:id', authenticate, async (req: Request, res: Response) => {
  if (!requireView(req, res)) return;
  try {
    const item = await getConsumerHelpArticleAdmin(req.params.id);
    if (!item) return res.status(404).json({ error: 'Article not found' });
    return res.json(item);
  } catch (err) {
    console.error('Solar Hub help article get error:', err);
    return res.status(500).json({ error: 'Failed to load help article' });
  }
});

router.patch(
  '/help/articles/:id',
  authenticate,
  [
    body('title').optional().isString().trim().isLength({ min: 1, max: 500 }),
    body('subtitle').optional().isString().trim().isLength({ max: 500 }),
    body('category').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('readMinutes').optional().isInt({ min: 1, max: 120 }),
    body('markdown').optional().isString().isLength({ min: 1, max: 100_000 }),
    body('isPublished').optional().isBoolean(),
    body('sortOrder').optional().isInt({ min: 0, max: 9999 }),
  ],
  async (req: Request, res: Response) => {
    if (!requireManage(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const updated = await updateConsumerHelpArticleAdmin(req.params.id, req.body);
      logSecurityAudit({
        userId: req.user!.id,
        role: req.user!.role,
        actionType: 'hub_help_article_update',
        entityType: 'ConsumerHelpArticle',
        entityId: updated.id,
        summary: `Updated Solar Hub help article ${updated.id}`,
        req,
      });
      return res.json(updated);
    } catch (err) {
      console.error('Solar Hub help article patch error:', err);
      return res.status(500).json({ error: 'Failed to update help article' });
    }
  },
);

router.get('/help/faqs', authenticate, async (req: Request, res: Response) => {
  if (!requireView(req, res)) return;
  try {
    const items = await listConsumerHelpFaqsAdmin();
    return res.json({ items });
  } catch (err) {
    console.error('Solar Hub help faqs list error:', err);
    return res.status(500).json({ error: 'Failed to load help FAQs' });
  }
});

router.get('/help/faqs/:id', authenticate, async (req: Request, res: Response) => {
  if (!requireView(req, res)) return;
  try {
    const item = await getConsumerHelpFaqAdmin(req.params.id);
    if (!item) return res.status(404).json({ error: 'FAQ not found' });
    return res.json(item);
  } catch (err) {
    console.error('Solar Hub help faq get error:', err);
    return res.status(500).json({ error: 'Failed to load help FAQ' });
  }
});

router.patch(
  '/help/faqs/:id',
  authenticate,
  [
    body('category').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('question').optional().isString().trim().isLength({ min: 1, max: 500 }),
    body('answer').optional().isString().isLength({ min: 1, max: 20_000 }),
    body('articleId').optional({ nullable: true }).isString().trim().isLength({ max: 128 }),
    body('isPublished').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
    body('sortOrder').optional().isInt({ min: 0, max: 9999 }),
  ],
  async (req: Request, res: Response) => {
    if (!requireManage(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const body = req.body as {
        category?: string;
        question?: string;
        answer?: string;
        articleId?: string | null;
        isPublished?: boolean;
        isFeatured?: boolean;
        sortOrder?: number;
      };
      const updated = await updateConsumerHelpFaqAdmin(req.params.id, {
        ...body,
        articleId: body.articleId === '' ? null : body.articleId,
      });
      logSecurityAudit({
        userId: req.user!.id,
        role: req.user!.role,
        actionType: 'hub_help_faq_update',
        entityType: 'ConsumerHelpFaq',
        entityId: updated.id,
        summary: `Updated Solar Hub help FAQ ${updated.id}`,
        req,
      });
      return res.json(updated);
    } catch (err) {
      console.error('Solar Hub help faq patch error:', err);
      return res.status(500).json({ error: 'Failed to update help FAQ' });
    }
  },
);

router.post('/help/reimport', authenticate, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const summary = await reimportConsumerHelpFromRepo();
    logSecurityAudit({
      userId: req.user!.id,
      role: req.user!.role,
      actionType: 'hub_help_reimport',
      entityType: 'ConsumerHelpArticle',
      entityId: 'bulk',
      summary: `Reimported Solar Hub help from repo (${summary.articlesUpserted} articles, ${summary.faqsUpserted} FAQs)`,
      req,
    });
    return res.json(summary);
  } catch (err) {
    console.error('Solar Hub help reimport error:', err);
    return res.status(500).json({ error: 'Failed to reimport help content' });
  }
});

export default router;

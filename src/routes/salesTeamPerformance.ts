import express, { Request, Response } from 'express';
import { UserRole, ProjectStatus, ProjectStage } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Quarter definition: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar (same as dashboard)
const QUARTER_TO_MONTHS: Record<string, string[]> = {
  Q1: ['04', '05', '06'],
  Q2: ['07', '08', '09'],
  Q3: ['10', '11', '12'],
  Q4: ['01', '02', '03'],
};

// Revenue = confirmed/completed only (same as dashboard getRevenueWhere)
function getRevenueWhere(baseWhere: any): any {
  const baseAndConditions = baseWhere.AND || [];
  const { AND, ...baseWhereWithoutAnd } = baseWhere;
  const revenueFilter: any = {
    ...baseWhereWithoutAnd,
    projectCost: { not: null },
    projectStatus: {
      in: [
        ProjectStatus.CONFIRMED,
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ],
    },
  };
  const stageCondition = {
    OR: [
      { projectStage: null },
      { projectStage: { notIn: [ProjectStage.SURVEY, ProjectStage.PROPOSAL] } },
    ],
  };
  revenueFilter.AND = baseAndConditions.length > 0 ? [...baseAndConditions, stageCondition] : [stageCondition];
  return revenueFilter;
}

// Get sales team performance data with FY, Quarter and Month filters (aligned with dashboard)
// SALES role: sees only their own pipeline; ADMIN/MANAGEMENT: see all
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE),
  async (req: Request, res) => {
    try {
      const role = req.user?.role;
      const userId = req.user?.id;
      const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
      const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
      const quarterFilters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[] : [];

      // Pipeline = sum of order value for all project stages EXCEPT Lost
      const where: any = {
        salespersonId: { not: null },
        projectCost: { not: null },
        projectStatus: { not: ProjectStatus.LOST },
      };
      // Sales users see only their own pipeline
      if (role === UserRole.SALES && userId) {
        where.salespersonId = userId;
      }

      // Apply FY filter
      if (fyFilters.length > 0) {
        where.year = { in: fyFilters };
      }

      // Effective month filter: quarter expands to months; if both quarter and month, use intersection
      let effectiveMonthFilters: string[] = [];
      if (fyFilters.length === 1) {
        if (quarterFilters.length > 0) {
          const quarterMonths = new Set<string>();
          quarterFilters.forEach((q) => {
            const months = QUARTER_TO_MONTHS[q];
            if (months) months.forEach((m) => quarterMonths.add(m));
          });
          effectiveMonthFilters = monthFilters.length > 0
            ? monthFilters.filter((m) => quarterMonths.has(m))
            : Array.from(quarterMonths);
        } else {
          effectiveMonthFilters = monthFilters;
        }
      }

      // Get all projects matching FY filter
      const allProjects = await prisma.project.findMany({
        where,
        select: {
          id: true,
          projectCost: true,
          year: true,
          confirmationDate: true,
          createdAt: true,
          salespersonId: true,
          salesperson: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Filter by month/quarter if provided (only when exactly one FY)
      let filteredProjects = allProjects;
      if (effectiveMonthFilters.length > 0 && fyFilters.length === 1) {
        filteredProjects = allProjects.filter((project) => {
          if (!project.confirmationDate) {
            const date = new Date(project.createdAt);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return effectiveMonthFilters.includes(month);
          }
          const date = new Date(project.confirmationDate);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return effectiveMonthFilters.includes(month);
        });
      }

      // Group by salesperson
      const salespersonMap = new Map<string, { name: string; totalValue: number; projectCount: number }>();

      filteredProjects.forEach((project) => {
        if (!project.salespersonId || !project.salesperson) return;

        const existing = salespersonMap.get(project.salespersonId) || {
          name: project.salesperson.name,
          totalValue: 0,
          projectCount: 0,
        };

        existing.totalValue += project.projectCost || 0;
        existing.projectCount += 1;
        salespersonMap.set(project.salespersonId, existing);
      });

      // Convert to array and sort by total value (Pipeline by Sales Team Member)
      const salesTeamData = Array.from(salespersonMap.entries())
        .map(([salespersonId, data]) => ({
          salespersonId,
          salespersonName: data.name,
          totalOrderValue: data.totalValue,
          projectCount: data.projectCount,
        }))
        .sort((a, b) => b.totalOrderValue - a.totalOrderValue);

      // Revenue by salesperson (same FY/quarter/month filters; Revenue = confirmed/completed only)
      const revenueWhere: any = {
        salespersonId: role === UserRole.SALES && userId ? userId : { not: null },
      };
      if (fyFilters.length > 0) revenueWhere.year = { in: fyFilters };
      const revenueWhereFull = getRevenueWhere(revenueWhere);

      const revenueProjects = await prisma.project.findMany({
        where: revenueWhereFull,
        select: {
          id: true,
          projectCost: true,
          year: true,
          confirmationDate: true,
          createdAt: true,
          salespersonId: true,
          salesperson: { select: { id: true, name: true } },
        },
      });

      let revenueFiltered = revenueProjects;
      if (effectiveMonthFilters.length > 0 && fyFilters.length === 1) {
        revenueFiltered = revenueProjects.filter((project) => {
          if (!project.confirmationDate) {
            const date = new Date(project.createdAt);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return effectiveMonthFilters.includes(month);
          }
          const date = new Date(project.confirmationDate);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return effectiveMonthFilters.includes(month);
        });
      }

      const revenueMap = new Map<string, { name: string; revenue: number; projectCount: number }>();
      revenueFiltered.forEach((project) => {
        if (!project.salespersonId || !project.salesperson) return;
        const existing = revenueMap.get(project.salespersonId) || {
          name: project.salesperson.name,
          revenue: 0,
          projectCount: 0,
        };
        existing.revenue += project.projectCost || 0;
        existing.projectCount += 1;
        revenueMap.set(project.salespersonId, existing);
      });

      const revenueBySalesperson = Array.from(revenueMap.entries())
        .map(([salespersonId, data]) => ({
          salespersonId,
          salespersonName: data.name,
          revenue: data.revenue,
          projectCount: data.projectCount,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      res.json({ salesTeamData, revenueBySalesperson });
    } catch (error: any) {
      console.error('[Sales Team Performance API] Error:', error);
      res.status(500).json({
        error: error?.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack }),
      });
    }
  }
);

export default router;

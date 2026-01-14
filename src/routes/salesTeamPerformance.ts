import express from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get sales team performance data with FY and Month filters
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGEMENT),
  async (req: AuthRequest, res) => {
    try {
      const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
      const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];

      const where: any = {
        salespersonId: { not: null },
        projectCost: { not: null },
      };

      // Apply FY filter
      if (fyFilters.length > 0) {
        where.year = { in: fyFilters };
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

      // Filter by month if provided
      let filteredProjects = allProjects;
      if (monthFilters.length > 0 && fyFilters.length === 1) {
        // Only apply month filter if exactly one FY is selected
        filteredProjects = allProjects.filter((project) => {
          if (!project.confirmationDate) {
            // If no confirmation date, use createdAt
            const date = new Date(project.createdAt);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return monthFilters.includes(month);
          }
          const date = new Date(project.confirmationDate);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return monthFilters.includes(month);
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

      // Convert to array and sort by total value
      const salesTeamData = Array.from(salespersonMap.entries())
        .map(([salespersonId, data]) => ({
          salespersonId,
          salespersonName: data.name,
          totalOrderValue: data.totalValue,
          projectCount: data.projectCount,
        }))
        .sort((a, b) => b.totalOrderValue - a.totalOrderValue);

      res.json({ salesTeamData });
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

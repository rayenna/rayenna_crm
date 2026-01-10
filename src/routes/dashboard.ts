import express from 'express';
import { PrismaClient, UserRole, ProjectStatus } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Sales Dashboard
router.get('/sales', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const where: any = {};
    if (role === UserRole.SALES) {
      where.salespersonId = userId;
    }

    const [
      totalLeads,
      confirmedProjects,
      totalCapacity,
      totalRevenue,
      projectsByStatus,
      revenueBySalesperson,
    ] = await Promise.all([
      // Total leads
      prisma.project.count({
        where: { ...where, projectStatus: ProjectStatus.LEAD },
      }),
      // Confirmed projects
      prisma.project.count({
        where: { ...where, projectStatus: { not: ProjectStatus.LEAD } },
      }),
      // Total capacity sold
      prisma.project.aggregate({
        where: { ...where, systemCapacity: { not: null } },
        _sum: { systemCapacity: true },
      }),
      // Total revenue
      prisma.project.aggregate({
        where: { ...where, projectCost: { not: null } },
        _sum: { projectCost: true },
      }),
      // Projects by status
      prisma.project.groupBy({
        by: ['projectStatus'],
        where,
        _count: { id: true },
      }),
      // Revenue by salesperson
      role === UserRole.ADMIN || role === UserRole.MANAGEMENT
        ? prisma.project.groupBy({
            by: ['salespersonId'],
            where: { salespersonId: { not: null } },
            _sum: { projectCost: true },
            _count: { id: true },
          })
        : [],
    ]);

    // Get salesperson names for revenue breakdown
    let revenueBreakdown: Array<{
      salespersonId: string | null;
      salespersonName: string;
      revenue: number;
      projectCount: number;
    }> = [];
    if (revenueBySalesperson.length > 0) {
      const salespersonIds = revenueBySalesperson
        .map((r) => r.salespersonId)
        .filter((id): id is string => id !== null);
      const salespeople = await prisma.user.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true },
      });
      revenueBreakdown = revenueBySalesperson.map((r) => ({
        salespersonId: r.salespersonId,
        salespersonName: salespeople.find((s) => s.id === r.salespersonId)?.name || 'Unknown',
        revenue: r._sum.projectCost || 0,
        projectCount: r._count.id,
      }));
    }

    res.json({
      totalLeads,
      confirmedProjects,
      totalCapacity: totalCapacity._sum.systemCapacity || 0,
      totalRevenue: totalRevenue._sum.projectCost || 0,
      projectsByStatus: projectsByStatus.map((p) => ({
        status: p.projectStatus,
        count: p._count.id,
      })),
      revenueBySalesperson: revenueBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Operations Dashboard
router.get('/operations', authenticate, async (req: AuthRequest, res) => {
  try {
    const [
      pendingInstallation,
      submittedForSubsidy,
      subsidyCredited,
      pendingSubsidy,
      ksebBottlenecks,
      mnreBottlenecks,
    ] = await Promise.all([
      // Projects pending installation
      prisma.project.count({
        where: {
          projectStatus: { in: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
        },
      }),
      // Submitted for subsidy
      prisma.project.count({
        where: { projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
      }),
      // Subsidy credited
      prisma.project.count({
        where: { projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
      }),
      // Pending subsidy (submitted but not credited)
      prisma.project.findMany({
        where: {
          projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY,
          subsidyRequestDate: { not: null },
        },
        select: {
          id: true,
          customerName: true,
          subsidyRequestDate: true,
          projectStatus: true,
        },
      }),
      // KSEB bottlenecks (feasibility or registration pending)
      prisma.project.findMany({
        where: {
          OR: [
            { feasibilityDate: null, projectStatus: { not: ProjectStatus.LEAD } },
            { registrationDate: null, projectStatus: { not: ProjectStatus.LEAD } },
          ],
        },
        select: {
          id: true,
          customerName: true,
          feasibilityDate: true,
          registrationDate: true,
          projectStatus: true,
        },
      }),
      // MNRE bottlenecks
      prisma.project.findMany({
        where: {
          OR: [
            { mnrePortalRegistrationDate: null, projectStatus: { not: ProjectStatus.LEAD } },
            { installationCompletionDate: null, projectStatus: { not: ProjectStatus.LEAD } },
          ],
        },
        select: {
          id: true,
          customerName: true,
          mnrePortalRegistrationDate: true,
          installationCompletionDate: true,
          projectStatus: true,
        },
      }),
    ]);

    res.json({
      pendingInstallation,
      submittedForSubsidy,
      subsidyCredited,
      pendingSubsidy: pendingSubsidy.map((p) => ({
        ...p,
        daysPending: p.subsidyRequestDate
          ? Math.floor(
              (Date.now() - new Date(p.subsidyRequestDate).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
      })),
      ksebBottlenecks,
      mnreBottlenecks,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Finance Dashboard
router.get('/finance', authenticate, async (req: AuthRequest, res) => {
  try {
    const [
      totalProjectValue,
      totalAmountReceived,
      totalOutstanding,
      projectsByPaymentStatus,
      profitByProject,
      profitBySalesperson,
    ] = await Promise.all([
      // Total project value
      prisma.project.aggregate({
        _sum: { projectCost: true },
        where: { projectCost: { not: null } },
      }),
      // Total amount received
      prisma.project.aggregate({
        _sum: { totalAmountReceived: true },
      }),
      // Total outstanding
      prisma.project.aggregate({
        _sum: { balanceAmount: true },
      }),
      // Projects by payment status
      prisma.project.groupBy({
        by: ['paymentStatus'],
        _count: { id: true },
        _sum: { projectCost: true, balanceAmount: true },
      }),
      // Profit by project
      prisma.project.findMany({
        where: { finalProfit: { not: null } },
        select: {
          id: true,
          customerName: true,
          projectCost: true,
          finalProfit: true,
          salesperson: {
            select: { id: true, name: true },
          },
        },
        orderBy: { finalProfit: 'desc' },
        take: 20,
      }),
      // Profit by salesperson
      prisma.project.groupBy({
        by: ['salespersonId'],
        where: { salespersonId: { not: null }, finalProfit: { not: null } },
        _sum: { finalProfit: true },
        _count: { id: true },
      }),
    ]);

    // Get salesperson names for profit breakdown
    let profitBreakdown: Array<{
      salespersonId: string | null;
      salespersonName: string;
      totalProfit: number;
      projectCount: number;
    }> = [];
    if (profitBySalesperson.length > 0) {
      const salespersonIds = profitBySalesperson
        .map((p) => p.salespersonId)
        .filter((id): id is string => id !== null);
      const salespeople = await prisma.user.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true },
      });
      profitBreakdown = profitBySalesperson.map((p) => ({
        salespersonId: p.salespersonId,
        salespersonName: salespeople.find((s) => s.id === p.salespersonId)?.name || 'Unknown',
        totalProfit: p._sum.finalProfit || 0,
        projectCount: p._count.id,
      }));
    }

    res.json({
      totalProjectValue: totalProjectValue._sum.projectCost || 0,
      totalAmountReceived: totalAmountReceived._sum.totalAmountReceived || 0,
      totalOutstanding: totalOutstanding._sum.balanceAmount || 0,
      projectsByPaymentStatus: projectsByPaymentStatus.map((p) => ({
        status: p.paymentStatus,
        count: p._count.id,
        totalValue: p._sum.projectCost || 0,
        outstanding: p._sum.balanceAmount || 0,
      })),
      profitByProject,
      profitBySalesperson: profitBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Management Dashboard (aggregated view)
router.get('/management', authenticate, async (req: AuthRequest, res) => {
  try {
    const [sales, operations, finance] = await Promise.all([
      // Sales metrics
      (async () => {
        const [totalLeads, totalCapacity, totalRevenue] = await Promise.all([
          prisma.project.count({ where: { projectStatus: ProjectStatus.LEAD } }),
          prisma.project.aggregate({
            _sum: { systemCapacity: true },
            where: { systemCapacity: { not: null } },
          }),
          prisma.project.aggregate({
            _sum: { projectCost: true },
            where: { projectCost: { not: null } },
          }),
        ]);
        return {
          totalLeads,
          totalCapacity: totalCapacity._sum.systemCapacity || 0,
          totalRevenue: totalRevenue._sum.projectCost || 0,
        };
      })(),
      // Operations metrics
      (async () => {
        const [pendingInstallation, subsidyCredited, pendingSubsidy] = await Promise.all([
          prisma.project.count({
            where: {
              projectStatus: { in: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
            },
          }),
          prisma.project.count({
            where: { projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
          }),
          prisma.project.count({
            where: { projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
          }),
        ]);
        return {
          pendingInstallation,
          subsidyCredited,
          pendingSubsidy,
        };
      })(),
      // Finance metrics
      (async () => {
        const [totalValue, totalReceived, totalOutstanding, totalProfit] = await Promise.all([
          prisma.project.aggregate({
            _sum: { projectCost: true },
            where: { projectCost: { not: null } },
          }),
          prisma.project.aggregate({
            _sum: { totalAmountReceived: true },
          }),
          prisma.project.aggregate({
            _sum: { balanceAmount: true },
          }),
          prisma.project.aggregate({
            _sum: { finalProfit: true },
            where: { finalProfit: { not: null } },
          }),
        ]);
        return {
          totalValue: totalValue._sum.projectCost || 0,
          totalReceived: totalReceived._sum.totalAmountReceived || 0,
          totalOutstanding: totalOutstanding._sum.balanceAmount || 0,
          totalProfit: totalProfit._sum.finalProfit || 0,
        };
      })(),
    ]);

    res.json({
      sales,
      operations,
      finance,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

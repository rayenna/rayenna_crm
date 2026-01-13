import express from 'express';
import { PrismaClient, UserRole, ProjectStatus, ProjectStage } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getProjectsByStageWithSLA, calculateStatusIndicator } from '../utils/projectLifecycle';
import { predictProjectDelay } from '../utils/ai';

const router = express.Router();
const prisma = new PrismaClient();

// Sales Dashboard - Enhanced with Leads and Pipeline
router.get('/sales', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const where: any = {};
    if (role === UserRole.SALES) {
      where.salespersonId = userId;
    }

    const leadWhere: any = {};
    if (role === UserRole.SALES) {
      leadWhere.assignedSalesId = userId;
    }

    const [
      // Lead metrics
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      leadConversionRate,
      // Project pipeline metrics
      projectsByStage,
      projectsAtRisk,
      // Revenue metrics
      totalCapacity,
      totalRevenue,
      expectedRevenue,
      // Stage-wise metrics
      surveyProjects,
      proposalProjects,
      approvedProjects,
    ] = await Promise.all([
      // Total leads
      prisma.lead.count({ where: leadWhere }),
      // New leads
      prisma.lead.count({ where: { ...leadWhere, status: 'NEW' } }),
      // Qualified leads
      prisma.lead.count({ where: { ...leadWhere, status: 'QUALIFIED' } }),
      // Converted leads
      prisma.lead.count({ where: { ...leadWhere, status: 'CONVERTED' } }),
      // Lead conversion rate
      prisma.lead.count({ where: leadWhere }).then((total) => {
        return prisma.lead.count({ where: { ...leadWhere, status: 'CONVERTED' } }).then((converted) => {
          return total > 0 ? ((converted / total) * 100).toFixed(1) : '0';
        });
      }),
      // Projects by stage
      prisma.project.groupBy({
        by: ['projectStage'],
        where: { ...where, projectStage: { not: null } },
        _count: { id: true },
        _sum: { projectCost: true },
      }),
      // Projects at risk (RED status)
      prisma.project.count({
        where: { ...where, statusIndicator: 'RED' },
      }),
      // Total capacity
      prisma.project.aggregate({
        where: { ...where, systemCapacity: { not: null } },
        _sum: { systemCapacity: true },
      }),
      // Total revenue (confirmed projects)
      prisma.project.aggregate({
        where: { ...where, projectCost: { not: null }, projectStatus: { not: ProjectStatus.LEAD } },
        _sum: { projectCost: true },
      }),
      // Expected revenue (from leads)
      prisma.lead.aggregate({
        where: { ...leadWhere, expectedValue: { not: null } },
        _sum: { expectedValue: true },
      }),
      // Survey stage projects
      getProjectsByStageWithSLA('SURVEY'),
      // Proposal stage projects
      getProjectsByStageWithSLA('PROPOSAL'),
      // Approved stage projects
      getProjectsByStageWithSLA('APPROVED'),
    ]);

    // Lead source breakdown
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: leadWhere,
      _count: { id: true },
      _sum: { expectedValue: true },
    });

    res.json({
      // Lead metrics
      leads: {
        total: totalLeads,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        conversionRate: leadConversionRate,
        bySource: leadsBySource.map((l) => ({
          source: l.source,
          count: l._count.id,
          expectedValue: l._sum.expectedValue || 0,
        })),
      },
      // Pipeline metrics
      pipeline: {
        byStage: projectsByStage.map((p) => ({
          stage: p.projectStage,
          count: p._count.id,
          value: p._sum.projectCost || 0,
        })),
        atRisk: projectsAtRisk,
        survey: surveyProjects.length,
        proposal: proposalProjects.length,
        approved: approvedProjects.length,
      },
      // Revenue metrics
      revenue: {
        totalCapacity: totalCapacity._sum.systemCapacity || 0,
        totalRevenue: totalRevenue._sum.projectCost || 0,
        expectedRevenue: expectedRevenue._sum.expectedValue || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Operations Dashboard - Enhanced with Installations and SLA tracking
router.get('/operations', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const where: any = {};
    if (role === UserRole.OPERATIONS) {
      where.assignedOpsId = userId;
    }

    const [
      // Installation metrics
      pendingInstallations,
      inProgressInstallations,
      completedInstallations,
      // Project stage metrics
      installationProjects,
      billingProjects,
      liveProjects,
      amcProjects,
      // SLA metrics
      projectsBySLAStatus,
      overdueProjects,
      // Compliance metrics
      submittedForSubsidy,
      subsidyCredited,
      pendingSubsidy,
      ksebBottlenecks,
      mnreBottlenecks,
    ] = await Promise.all([
      // Pending installations
      prisma.installation.count({
        where: { status: 'PENDING' },
      }),
      // In progress installations
      prisma.installation.count({
        where: { status: 'IN_PROGRESS' },
      }),
      // Completed installations
      prisma.installation.count({
        where: { status: 'COMPLETED' },
      }),
      // Installation stage projects
      getProjectsByStageWithSLA('INSTALLATION'),
      // Billing stage projects
      getProjectsByStageWithSLA('BILLING'),
      // Live stage projects
      getProjectsByStageWithSLA('LIVE'),
      // AMC stage projects
      getProjectsByStageWithSLA('AMC'),
      // Projects by SLA status
      (prisma.project as any).groupBy({
        by: ['statusIndicator'],
        where: { ...where, statusIndicator: { not: null } },
        _count: { id: true },
      }),
      // Overdue projects (RED status)
      (prisma.project as any).findMany({
        where: { ...where, statusIndicator: 'RED' },
        include: {
          customer: { select: { customerName: true } },
          opsPerson: { select: { name: true } },
        },
        take: 20,
      }),
      // Submitted for subsidy
      prisma.project.count({
        where: { projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
      }),
      // Subsidy credited
      prisma.project.count({
        where: { projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
      }),
      // Pending subsidy
      prisma.project.findMany({
        where: {
          projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY,
          subsidyRequestDate: { not: null },
        },
        select: {
          id: true,
          customer: { select: { customerName: true } },
          subsidyRequestDate: true,
        },
      }),
      // KSEB bottlenecks
      prisma.project.findMany({
        where: {
          OR: [
            { feasibilityDate: null, projectStatus: { not: ProjectStatus.LEAD } },
            { registrationDate: null, projectStatus: { not: ProjectStatus.LEAD } },
          ],
        },
        select: {
          id: true,
          customer: { select: { customerName: true } },
          feasibilityDate: true,
          registrationDate: true,
        },
        take: 10,
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
          customer: { select: { customerName: true } },
          mnrePortalRegistrationDate: true,
          installationCompletionDate: true,
        },
        take: 10,
      }),
    ]);

    res.json({
      // Installation metrics
      installations: {
        pending: pendingInstallations,
        inProgress: inProgressInstallations,
        completed: completedInstallations,
        completionRate:
          completedInstallations + inProgressInstallations + pendingInstallations > 0
            ? ((completedInstallations / (completedInstallations + inProgressInstallations + pendingInstallations)) * 100).toFixed(1)
            : '0',
      },
      // Pipeline stages
      pipeline: {
        installation: installationProjects.length,
        billing: billingProjects.length,
        live: liveProjects.length,
        amc: amcProjects.length,
      },
      // SLA metrics
      sla: {
        byStatus: projectsBySLAStatus.map((p: any) => ({
          status: p.statusIndicator,
          count: p._count?.id || 0,
        })),
        overdue: overdueProjects.map((p: any) => ({
          id: p.id,
          customerName: p.customer?.customerName || 'Unknown',
          stage: p.projectStage,
          daysInStage: p.stageEnteredAt
            ? Math.floor((Date.now() - new Date(p.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          slaDays: p.slaDays || 0,
          owner: p.opsPerson?.name || 'Unassigned',
        })),
      },
      // Compliance metrics
      compliance: {
        submittedForSubsidy,
        subsidyCredited,
        pendingSubsidy: pendingSubsidy.map((p) => ({
          ...p,
          customerName: p.customer?.customerName || 'Unknown',
          daysPending: p.subsidyRequestDate
            ? Math.floor((Date.now() - new Date(p.subsidyRequestDate).getTime()) / (1000 * 60 * 60 * 24))
            : null,
        })),
        ksebBottlenecks: ksebBottlenecks.length,
        mnreBottlenecks: mnreBottlenecks.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching operations dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Finance Dashboard - Enhanced with Invoices and Payments
router.get('/finance', authenticate, async (req: AuthRequest, res) => {
  try {
    const [
      // Invoice metrics
      totalInvoices,
      unpaidInvoices,
      partPaidInvoices,
      paidInvoices,
      totalInvoiceAmount,
      totalPaidAmount,
      totalOutstanding,
      overdueInvoices,
      // Payment metrics
      paymentsByMode,
      recentPayments,
      // Project financials
      totalProjectValue,
      totalAmountReceived,
      totalOutstandingProjects,
      projectsByPaymentStatus,
      // Profit metrics
      totalProfit,
      profitByProject,
    ] = await Promise.all([
      // Total invoices
      prisma.invoice.count(),
      // Unpaid invoices
      prisma.invoice.count({ where: { status: 'UNPAID' } }),
      // Part paid invoices
      prisma.invoice.count({ where: { status: 'PART_PAID' } }),
      // Paid invoices
      prisma.invoice.count({ where: { status: 'PAID' } }),
      // Total invoice amount
      prisma.invoice.aggregate({
        _sum: { total: true },
      }),
      // Total paid amount (from payments)
      prisma.payment.aggregate({
        _sum: { amount: true },
      }),
      // Total outstanding (invoices - payments)
      prisma.invoice.findMany({
        include: { payments: true },
      }).then((invoices) => {
        return invoices.reduce((sum, inv) => {
          const paid = inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
          return sum + (inv.total - paid);
        }, 0);
      }),
      // Overdue invoices
      prisma.invoice.findMany({
        where: {
          status: { in: ['UNPAID', 'PART_PAID'] },
          dueDate: { lt: new Date() },
        },
        include: {
          project: {
            include: {
              customer: { select: { customerName: true } },
            },
          },
        },
        take: 20,
      }),
      // Payments by mode
      prisma.payment.groupBy({
        by: ['mode'],
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Recent payments
      prisma.payment.findMany({
        include: {
          invoice: {
            include: {
              project: {
                include: {
                  customer: { select: { customerName: true } },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
      // Total project value
      prisma.project.aggregate({
        _sum: { projectCost: true },
        where: { projectCost: { not: null } },
      }),
      // Total amount received (legacy)
      prisma.project.aggregate({
        _sum: { totalAmountReceived: true },
      }),
      // Total outstanding (legacy)
      prisma.project.aggregate({
        _sum: { balanceAmount: true },
      }),
      // Projects by payment status
      prisma.project.groupBy({
        by: ['paymentStatus'],
        _count: { id: true },
        _sum: { projectCost: true, balanceAmount: true },
      }),
      // Total profit
      prisma.project.aggregate({
        _sum: { grossProfit: true },
        where: { grossProfit: { not: null } },
      }),
      // Profit by project
      prisma.project.findMany({
        where: { finalProfit: { not: null } },
        select: {
          id: true,
          customer: { select: { customerName: true } },
          projectCost: true,
          finalProfit: true,
        },
        orderBy: { finalProfit: 'desc' },
        take: 20,
      }),
    ]);

    res.json({
      // Invoice metrics
      invoices: {
        total: totalInvoices,
        unpaid: unpaidInvoices,
        partPaid: partPaidInvoices,
        paid: paidInvoices,
        totalAmount: totalInvoiceAmount._sum.total || 0,
        totalPaid: totalPaidAmount._sum.amount || 0,
        totalOutstanding,
        overdue: overdueInvoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.project?.customer?.customerName || 'Unknown',
          amount: inv.amount,
          total: inv.total,
          dueDate: inv.dueDate,
          daysOverdue: inv.dueDate
            ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        })),
      },
      // Payment metrics
      payments: {
        byMode: paymentsByMode.map((p) => ({
          mode: p.mode,
          amount: p._sum.amount || 0,
          count: p._count.id,
        })),
        recent: recentPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          mode: p.mode,
          paymentDate: p.paymentDate,
          customerName: p.invoice?.project?.customer?.customerName || 'Unknown',
        })),
      },
      // Project financials
      projects: {
        totalValue: totalProjectValue._sum.projectCost || 0,
        totalReceived: totalAmountReceived._sum.totalAmountReceived || 0,
        totalOutstanding: totalOutstandingProjects._sum.balanceAmount || 0,
        byPaymentStatus: projectsByPaymentStatus.map((p) => ({
          status: p.paymentStatus,
          count: p._count.id,
          totalValue: p._sum.projectCost || 0,
          outstanding: p._sum.balanceAmount || 0,
        })),
      },
      // Profit metrics
      profit: {
        total: totalProfit._sum.grossProfit || 0,
        byProject: profitByProject,
      },
    });
  } catch (error: any) {
    console.error('Error fetching finance dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Management Dashboard - Comprehensive overview
router.get('/management', authenticate, async (req: AuthRequest, res) => {
  try {
    const [
      // Sales metrics
      salesMetrics,
      // Operations metrics
      operationsMetrics,
      // Finance metrics
      financeMetrics,
      // Service metrics
      serviceMetrics,
      // Project lifecycle overview
      projectsByStage,
      // AI predictions
      atRiskProjects,
    ] = await Promise.all([
      // Sales metrics
      (async () => {
        const [totalLeads, convertedLeads, totalCapacity, totalRevenue] = await Promise.all([
          prisma.lead.count(),
          prisma.lead.count({ where: { status: 'CONVERTED' } }),
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
          convertedLeads,
          conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0',
          totalCapacity: totalCapacity._sum.systemCapacity || 0,
          totalRevenue: totalRevenue._sum.projectCost || 0,
        };
      })(),
      // Operations metrics
      (async () => {
        const [pendingInstallation, completedInstallation, liveProjects, amcProjects] = await Promise.all([
          prisma.installation.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
          prisma.installation.count({ where: { status: 'COMPLETED' } }),
          prisma.project.count({ where: { projectStage: 'LIVE' } }),
          prisma.project.count({ where: { projectStage: 'AMC' } }),
        ]);
        return {
          pendingInstallation,
          completedInstallation,
          liveProjects,
          amcProjects,
        };
      })(),
      // Finance metrics
      (async () => {
        const [totalValue, totalReceived, totalOutstanding, totalProfit, unpaidInvoices] = await Promise.all([
          prisma.project.aggregate({
            _sum: { projectCost: true },
            where: { projectCost: { not: null } },
          }),
          prisma.payment.aggregate({
            _sum: { amount: true },
          }),
          prisma.invoice.findMany({
            include: { payments: true },
          }).then((invoices) => {
            return invoices.reduce((sum, inv) => {
              const paid = inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
              return sum + (inv.total - paid);
            }, 0);
          }),
          prisma.project.aggregate({
            _sum: { grossProfit: true },
            where: { grossProfit: { not: null } },
          }),
          prisma.invoice.count({ where: { status: { in: ['UNPAID', 'PART_PAID'] } } }),
        ]);
        return {
          totalValue: totalValue._sum.projectCost || 0,
          totalReceived: totalReceived._sum.amount || 0,
          totalOutstanding,
          totalProfit: totalProfit._sum.grossProfit || 0,
          unpaidInvoices,
        };
      })(),
      // Service metrics
      (async () => {
        const [openTickets, resolvedTickets, activeAMC] = await Promise.all([
          prisma.serviceTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
          prisma.serviceTicket.count({ where: { status: 'RESOLVED' } }),
          prisma.aMCContract.count({
            where: { endDate: { gte: new Date() } },
          }),
        ]);
        return {
          openTickets,
          resolvedTickets,
          activeAMC,
        };
      })(),
      // Projects by stage
      prisma.project.groupBy({
        by: ['projectStage'],
        where: { projectStage: { not: null } },
        _count: { id: true },
        _sum: { projectCost: true },
      }),
      // At-risk projects (RED status)
      (prisma.project as any).findMany({
        where: { statusIndicator: 'RED' },
        include: {
          customer: { select: { customerName: true } },
          salesperson: { select: { name: true } },
          opsPerson: { select: { name: true } },
        },
        take: 10,
      }),
    ]);

    res.json({
      sales: salesMetrics,
      operations: operationsMetrics,
      finance: financeMetrics,
      service: serviceMetrics,
      pipeline: {
        byStage: projectsByStage.map((p: any) => ({
          stage: p.projectStage,
          count: p._count?.id || 0,
          value: p._sum?.projectCost || 0,
        })),
      },
      atRisk: atRiskProjects.map((p: any) => ({
        id: p.id,
        customerName: p.customer?.customerName || 'Unknown',
        stage: p.projectStage,
        status: p.statusIndicator,
        salesOwner: p.salesperson?.name || 'Unassigned',
        opsOwner: p.opsPerson?.name || 'Unassigned',
      })),
    });
  } catch (error: any) {
    console.error('Error fetching management dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

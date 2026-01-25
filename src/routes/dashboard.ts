import express, { Request, Response } from 'express';
import { UserRole, ProjectStatus, LeadStatus, ProjectStage } from '@prisma/client';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Helper function to apply FY and Month filters to project queries
function applyDateFilters(
  baseWhere: any,
  fyFilters: string[],
  monthFilters: string[]
): any {
  let where = { ...baseWhere };

  // Apply FY filter
  if (fyFilters.length > 0) {
    where.year = { in: fyFilters };
  }

  // Apply month filter using date range filtering
  // Month filter only applies if exactly one FY is selected
  if (monthFilters.length > 0 && fyFilters.length === 1) {
    const fy = fyFilters[0];
    // Extract year from FY (e.g., "2024-25" -> 2024 or 2025)
    const yearMatch = fy.match(/(\d{4})/);
    if (yearMatch) {
      const startYear = parseInt(yearMatch[1]);
      
      // Build date filters for each selected month
      const dateFilters: any[] = [];
      
      monthFilters.forEach((month) => {
        const monthNum = parseInt(month);
        let year = startYear;
        
        // Months 1-3 (Jan-Mar) belong to the second year of the FY
        // Months 4-12 (Apr-Dec) belong to the first year of the FY
        if (monthNum >= 1 && monthNum <= 3) {
          year = startYear + 1;
        }
        
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
        
        dateFilters.push({
          OR: [
            { confirmationDate: { gte: startDate, lte: endDate } },
            { createdAt: { gte: startDate, lte: endDate } },
          ],
        });
      });
      
      if (dateFilters.length > 0) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: dateFilters,
          },
        ];
      }
    }
  }

  return where;
}

// Helper function to create revenue filter (excludes Leads, Site Survey, and Proposal stages)
function getRevenueWhere(baseWhere: any): any {
  // Extract AND conditions from baseWhere if they exist
  const baseAndConditions = baseWhere.AND || [];
  // Remove AND from baseWhere to avoid duplication
  const { AND, ...baseWhereWithoutAnd } = baseWhere;
  
  // Build revenue filter: Only include confirmed/completed projects
  // Exclude LEAD status (already excluded by projectStatus filter)
  // Exclude SURVEY and PROPOSAL stages
  // Note: We exclude null projectStage only for Lead status projects, but since we're already
  // filtering by status CONFIRMED/COMPLETED, null projectStage is allowed (confirmed orders may not have stage set)
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

  // Exclude SURVEY and PROPOSAL stages
  // Allow null projectStage (confirmed orders may not have stage set)
  // Prisma notIn doesn't handle null well, so we use OR to explicitly include null
  const stageCondition = {
    OR: [
      { projectStage: null }, // Include null stages
      { projectStage: { notIn: [ProjectStage.SURVEY, ProjectStage.PROPOSAL] } }, // Exclude Survey and Proposal
    ],
  };

  // Combine all conditions
  if (baseAndConditions.length > 0) {
    revenueFilter.AND = [...baseAndConditions, stageCondition];
  } else {
    revenueFilter.AND = [stageCondition];
  }
  
  console.log('[REVENUE FILTER] Final filter:', JSON.stringify(revenueFilter, null, 2));

  return revenueFilter;
}

// Sales Dashboard
router.get('/sales', authenticate, async (req: Request, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];

    const baseWhere: any = {};
    if (role === UserRole.SALES) {
      baseWhere.salespersonId = userId;
    }
    
    // Apply FY and month filters
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters);

    // Debug: Check revenue filter
    const revenueWhere = getRevenueWhere(where);
    console.log('[SALES DASHBOARD] Revenue filter:', JSON.stringify(revenueWhere, null, 2));
    
    // Debug: Count projects matching revenue filter
    const revenueCount = await prisma.project.count({ where: revenueWhere });
    console.log('[SALES DASHBOARD] Projects matching revenue filter:', revenueCount);
    
    // Debug: Sample projects
    const sampleProjects = await prisma.project.findMany({
      where: revenueWhere,
      take: 3,
      select: { id: true, projectStatus: true, projectStage: true, projectCost: true },
    });
    console.log('[SALES DASHBOARD] Sample projects:', sampleProjects);

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
      // Total capacity sold (only confirmed/completed projects, same filter as Total Revenue)
      (async () => {
        const capacityWhere = getRevenueWhere(where);
        capacityWhere.systemCapacity = { not: null };
        return await prisma.project.aggregate({
          where: capacityWhere,
          _sum: { systemCapacity: true },
        });
      })(),
      // Total revenue (only confirmed/completed projects, excluding leads/survey/proposal)
      (async () => {
        const revenueWhere = getRevenueWhere(where);
        console.log('[SALES DASHBOARD] Revenue filter:', JSON.stringify(revenueWhere, null, 2));
        const result = await prisma.project.aggregate({
          where: revenueWhere,
          _sum: { projectCost: true },
        });
        console.log('[SALES DASHBOARD] Revenue result:', result);
        return result;
      })(),
      // Projects by status
      prisma.project.groupBy({
        by: ['projectStatus'],
        where,
        _count: { id: true },
      }),
      // Revenue by salesperson (only confirmed/completed projects, excluding leads/survey/proposal)
      role === UserRole.ADMIN || role === UserRole.MANAGEMENT
        ? prisma.project.groupBy({
            by: ['salespersonId'],
            where: getRevenueWhere({ ...where, salespersonId: { not: null } }),
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

    // Calculate project value by type for pie chart (only confirmed/completed projects)
    const projectValueByType = await prisma.project.groupBy({
      by: ['type'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
      _count: { id: true },
    });

    const valueByType = projectValueByType.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    // Calculate project value and profit by financial year (only confirmed/completed projects)
    const projectValueByFY = await prisma.project.groupBy({
      by: ['year'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
    });

    const profitByFY = await prisma.project.groupBy({
      by: ['year'],
      where: { ...getRevenueWhere(where), grossProfit: { not: null } },
      _sum: { grossProfit: true },
    });

    // Combine the data by financial year
    const allFYs = new Set([
      ...projectValueByFY.map((item) => item.year),
      ...profitByFY.map((item) => item.year),
    ]);

    const projectValueProfitByFY = Array.from(allFYs)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFY.find((item) => item.year === fy)?._sum.grossProfit || 0,
      }));

    // Build leads where clause with salesperson and date filters
    const leadsWhere: any = {};
    if (role === UserRole.SALES) {
      leadsWhere.assignedSalesId = userId;
    }
    
    // Apply date filters to leads based on createdAt
    if (fyFilters.length > 0) {
      // Build date filters for leads (filter by createdAt)
      if (monthFilters.length > 0 && fyFilters.length === 1) {
        // Month filter only applies if exactly one FY is selected
        const fy = fyFilters[0];
        const yearMatch = fy.match(/(\d{4})/);
        if (yearMatch) {
          const startYear = parseInt(yearMatch[1]);
          const dateFilters: any[] = [];
          
          monthFilters.forEach((month) => {
            const monthNum = parseInt(month);
            let year = startYear;
            
            // Months 1-3 (Jan-Mar) belong to the second year of the FY
            // Months 4-12 (Apr-Dec) belong to the first year of the FY
            if (monthNum >= 1 && monthNum <= 3) {
              year = startYear + 1;
            }
            
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
            
            dateFilters.push({
              createdAt: { gte: startDate, lte: endDate },
            });
          });
          
          if (dateFilters.length > 0) {
            leadsWhere.OR = dateFilters;
          }
        }
      } else {
        // Only FY filter (no month) - filter by FY date range
        const fyDateRanges: any[] = [];
        fyFilters.forEach((fy) => {
          const yearMatch = fy.match(/(\d{4})/);
          if (yearMatch) {
            const startYear = parseInt(yearMatch[1]);
            const startDate = new Date(startYear, 3, 1); // April 1
            const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // March 31
            fyDateRanges.push({
              createdAt: { gte: startDate, lte: endDate },
            });
          }
        });
        
        if (fyDateRanges.length > 0) {
          leadsWhere.OR = fyDateRanges;
        }
      }
    }
    
    // Get leads data
    const leadsData = await prisma.lead.findMany({
      where: leadsWhere,
      select: {
        status: true,
        source: true,
        expectedValue: true,
      },
    });

    const totalLeadsCount = leadsData.length;
    const newLeads = leadsData.filter((l) => l.status === LeadStatus.NEW).length;
    const qualifiedLeads = leadsData.filter((l) => l.status === LeadStatus.QUALIFIED).length;
    const convertedLeads = leadsData.filter((l) => l.status === LeadStatus.CONVERTED).length;
    const conversionRate = totalLeadsCount > 0 ? ((convertedLeads / totalLeadsCount) * 100).toFixed(1) : '0';

    // Leads by source
    const leadsBySource = leadsData.reduce((acc: any, lead) => {
      const source = lead.source || 'UNKNOWN';
      if (!acc[source]) {
        acc[source] = { count: 0, expectedValue: 0 };
      }
      acc[source].count++;
      acc[source].expectedValue += lead.expectedValue || 0;
      return acc;
    }, {});

    const leadsBySourceArray = Object.entries(leadsBySource).map(([source, data]: [string, any]) => ({
      source,
      count: data.count,
      expectedValue: data.expectedValue,
    }));

    // Pipeline by stage
    const pipelineSurvey = await prisma.project.count({
      where: { ...where, projectStage: ProjectStage.SURVEY },
    });
    const pipelineProposal = await prisma.project.count({
      where: { ...where, projectStage: ProjectStage.PROPOSAL },
    });
    const pipelineApproved = await prisma.project.count({
      where: { ...where, projectStage: ProjectStage.APPROVED },
    });
    const pipelineAtRisk = await prisma.project.count({
      where: {
        ...where,
        statusIndicator: 'RED',
      },
    });

    // Total Pipeline - Sum of projectCost for projects in Lead (null), Site Survey, or Proposal stages (exclude LOST projects)
    const totalPipeline = await prisma.project.aggregate({
      where: {
        ...where,
        projectCost: { not: null },
        projectStatus: { not: ProjectStatus.LOST }, // Exclude LOST projects
        OR: [
          { projectStage: null }, // Lead stage
          { projectStage: ProjectStage.SURVEY }, // Site Survey
          { projectStage: ProjectStage.PROPOSAL }, // Proposal
        ],
      },
      _sum: { projectCost: true },
    });

    // Get customer/project profitability data for word cloud
    const profitabilityData = await prisma.project.findMany({
      where: {
        ...where,
        profitability: { not: null },
        // customerId is a required field, so it can never be null - no need to filter
      },
      select: {
        id: true,
        profitability: true,
        customer: {
          select: {
            firstName: true, // Primary - used for word cloud
            customerName: true, // Fallback only if firstName is null/empty
          },
        },
      },
      orderBy: {
        profitability: 'desc',
      },
      take: 50, // Limit to top 50 for word cloud
    });

    // Map to word cloud data - use firstName (required), profitability from Sales & Commercial section
    const wordCloudData = profitabilityData.map((p) => {
      // Use firstName - only fallback to customerName if firstName is truly empty/null
      const firstName = p.customer?.firstName?.trim();
      const text = firstName || p.customer?.customerName?.trim() || 'Unknown';
      
      // Profitability from Sales & Commercial section
      const profitability = p.profitability || 0;
      
      return {
        text: text || 'Unknown',
        value: profitability,
      };
    });

    res.json({
      leads: {
        total: totalLeadsCount,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        conversionRate,
        bySource: leadsBySourceArray,
      },
      revenue: {
        totalCapacity: totalCapacity._sum.systemCapacity || 0,
        totalRevenue: totalRevenue._sum.projectCost || 0,
        expectedRevenue: totalRevenue._sum.projectCost || 0, // Using same for now
      },
      pipeline: {
        survey: pipelineSurvey,
        proposal: pipelineProposal,
        approved: pipelineApproved,
        atRisk: pipelineAtRisk,
      },
      totalPipeline: totalPipeline._sum.projectCost || 0,
      revenueBySalesperson: revenueBreakdown,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
      wordCloudData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Operations Dashboard
router.get('/operations', authenticate, async (req: Request, res) => {
  try {
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    
    const baseWhere: any = {};
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters);
    
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
          ...where,
          projectStatus: { in: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
        },
      }),
      // Submitted for subsidy
      prisma.project.count({
        where: { ...where, projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
      }),
      // Subsidy credited
      prisma.project.count({
        where: { ...where, projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
      }),
      // Pending subsidy (submitted but not credited)
      prisma.project.findMany({
        where: {
          ...where,
          projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY,
          subsidyRequestDate: { not: null },
        },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
          subsidyRequestDate: true,
          projectStatus: true,
        },
      }),
      // KSEB bottlenecks (feasibility or registration pending)
      prisma.project.findMany({
        where: {
          ...where,
          OR: [
            { feasibilityDate: null, projectStatus: { not: ProjectStatus.LEAD } },
            { registrationDate: null, projectStatus: { not: ProjectStatus.LEAD } },
          ],
        },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
          feasibilityDate: true,
          registrationDate: true,
          projectStatus: true,
        },
      }),
      // MNRE bottlenecks
      prisma.project.findMany({
        where: {
          ...where,
          OR: [
            { mnrePortalRegistrationDate: null, projectStatus: { not: ProjectStatus.LEAD } },
            { installationCompletionDate: null, projectStatus: { not: ProjectStatus.LEAD } },
          ],
        },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
          mnrePortalRegistrationDate: true,
          installationCompletionDate: true,
          projectStatus: true,
        },
      }),
    ]);

    // Calculate project value by type for pie chart (with optional FY filter) - only confirmed/completed projects
    const projectValueByType = await prisma.project.groupBy({
      by: ['type'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
      _count: { id: true },
    });

    const valueByType = projectValueByType.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    // Calculate project value and profit by financial year (only confirmed/completed projects)
    const projectValueByFY = await prisma.project.groupBy({
      by: ['year'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
    });

    const profitByFY = await prisma.project.groupBy({
      by: ['year'],
      where: { ...getRevenueWhere(where), grossProfit: { not: null } },
      _sum: { grossProfit: true },
    });

    // Combine the data by financial year
    const allFYs = new Set([
      ...projectValueByFY.map((item) => item.year),
      ...profitByFY.map((item) => item.year),
    ]);

    const projectValueProfitByFY = Array.from(allFYs)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFY.find((item) => item.year === fy)?._sum.grossProfit || 0,
      }));

    res.json({
      pendingInstallation,
      submittedForSubsidy,
      subsidyCredited,
      pendingSubsidy: pendingSubsidy.map((p) => ({
        ...p,
        customerName: p.customer?.customerName || 'Unknown',
        daysPending: p.subsidyRequestDate
          ? Math.floor(
              (Date.now() - new Date(p.subsidyRequestDate).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
      })),
      ksebBottlenecks,
      mnreBottlenecks,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Finance Dashboard
router.get('/finance', authenticate, async (req: Request, res) => {
  try {
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    
    const baseWhere: any = {};
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters);
    
      const [
      totalProjectValue,
      totalAmountReceived,
      profitByProject,
      profitBySalesperson,
    ] = await Promise.all([
      // Total project value (only confirmed/completed projects)
      prisma.project.aggregate({
        _sum: { projectCost: true },
        where: getRevenueWhere(where),
      }),
      // Total amount received
      prisma.project.aggregate({
        _sum: { totalAmountReceived: true },
        where,
      }),
      // Profit by project
      prisma.project.findMany({
        where: { ...where, finalProfit: { not: null } },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
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
        where: { ...where, salespersonId: { not: null }, finalProfit: { not: null } },
        _sum: { finalProfit: true },
        _count: { id: true },
      }),
    ]);
    
    // Calculate total outstanding - only include PENDING and PARTIAL (exclude N/A and FULLY_PAID)
    const projectsForOutstanding = await prisma.project.findMany({
      where: { ...where },
      select: {
        id: true,
        paymentStatus: true,
        projectCost: true,
        projectStatus: true,
        balanceAmount: true,
      },
    });
    
    const totalOutstanding = projectsForOutstanding
      .filter((project) => {
        // Check if project should show N/A
        const hasNoOrderValue = !project.projectCost || project.projectCost === 0;
        const isEarlyOrLostStage = 
          project.projectStatus === ProjectStatus.LEAD ||
          project.projectStatus === ProjectStatus.SITE_SURVEY ||
          project.projectStatus === ProjectStatus.PROPOSAL ||
          project.projectStatus === ProjectStatus.LOST;
        
        // Exclude N/A projects
        if (hasNoOrderValue || isEarlyOrLostStage) return false;
        
        // Only include PENDING and PARTIAL
        return project.paymentStatus === 'PENDING' || project.paymentStatus === 'PARTIAL';
      })
      .reduce((sum, project) => sum + (project.balanceAmount || 0), 0);
    
    // Projects by payment status - calculate effective payment status
    const allProjects = await prisma.project.findMany({
      where: { ...where },
      select: {
        id: true,
        paymentStatus: true,
        projectCost: true,
        projectStatus: true,
        balanceAmount: true,
      },
    });
    
    // Calculate effective payment status for each project
    const projectsByEffectiveStatus: Record<string, { count: number; totalValue: number; outstanding: number }> = {};
    
    allProjects.forEach((project) => {
      // Check if project should show N/A
      const hasNoOrderValue = !project.projectCost || project.projectCost === 0;
      const isEarlyOrLostStage = 
        project.projectStatus === ProjectStatus.LEAD ||
        project.projectStatus === ProjectStatus.SITE_SURVEY ||
        project.projectStatus === ProjectStatus.PROPOSAL ||
        project.projectStatus === ProjectStatus.LOST;
      
      const effectiveStatus = (hasNoOrderValue || isEarlyOrLostStage) ? 'N/A' : (project.paymentStatus || 'PENDING');
      
      if (!projectsByEffectiveStatus[effectiveStatus]) {
        projectsByEffectiveStatus[effectiveStatus] = {
          count: 0,
          totalValue: 0,
          outstanding: 0,
        };
      }
      
      projectsByEffectiveStatus[effectiveStatus].count++;
      projectsByEffectiveStatus[effectiveStatus].totalValue += project.projectCost || 0;
      // Only add outstanding for PENDING and PARTIAL (not N/A or FULLY_PAID)
      if (effectiveStatus === 'PENDING' || effectiveStatus === 'PARTIAL') {
        projectsByEffectiveStatus[effectiveStatus].outstanding += project.balanceAmount || 0;
      }
    });
    
    const projectsByPaymentStatus = Object.entries(projectsByEffectiveStatus).map(([status, data]) => ({
      status,
      count: data.count,
      totalValue: data.totalValue,
      outstanding: data.outstanding,
    }));

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

    // Calculate project value by type for pie chart (only confirmed/completed projects)
    const projectValueByType = await prisma.project.groupBy({
      by: ['type'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
      _count: { id: true },
    });

    const valueByType = projectValueByType.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    // Calculate project value and profit by financial year
    const projectValueByFY = await prisma.project.groupBy({
      by: ['year'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
    });

    const profitByFY = await prisma.project.groupBy({
      by: ['year'],
      where: { ...getRevenueWhere(where), grossProfit: { not: null } },
      _sum: { grossProfit: true },
    });

    // Combine the data by financial year
    const allFYs = new Set([
      ...projectValueByFY.map((item) => item.year),
      ...profitByFY.map((item) => item.year),
    ]);

    const projectValueProfitByFY = Array.from(allFYs)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFY.find((item) => item.year === fy)?._sum.grossProfit || 0,
      }));

    res.json({
      totalProjectValue: totalProjectValue._sum.projectCost || 0,
      totalAmountReceived: totalAmountReceived._sum.totalAmountReceived || 0,
      totalOutstanding: totalOutstanding, // Use the calculated totalOutstanding (only PENDING and PARTIAL)
      projectsByPaymentStatus, // Use the calculated effective payment status
      profitByProject,
      profitBySalesperson: profitBreakdown,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Management Dashboard (aggregated view)
router.get('/management', authenticate, async (req: Request, res) => {
  try {
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    
    const baseWhere: any = {};
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters);

    const [sales, operations, finance] = await Promise.all([
      // Sales metrics
      (async () => {
        const [totalLeads, totalCapacity, totalRevenue] = await Promise.all([
          prisma.project.count({ where: { ...where, projectStatus: ProjectStatus.LEAD } }),
          (async () => {
            const capacityWhere = getRevenueWhere(where);
            capacityWhere.systemCapacity = { not: null };
            return await prisma.project.aggregate({
              _sum: { systemCapacity: true },
              where: capacityWhere, // Use same filter as Total Revenue (only confirmed/completed projects)
            });
          })(),
          prisma.project.aggregate({
            _sum: { projectCost: true },
            where: getRevenueWhere(where), // Use getRevenueWhere to exclude LOST and only include confirmed/completed projects
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
              ...where,
              projectStatus: { in: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
            },
          }),
          prisma.project.count({
            where: { ...where, projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
          }),
          prisma.project.count({
            where: { ...where, projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
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
            where: getRevenueWhere(where),
          }),
          prisma.project.aggregate({
            _sum: { totalAmountReceived: true },
            where,
          }),
          prisma.project.aggregate({
            _sum: { balanceAmount: true },
            where,
          }),
          prisma.project.aggregate({
            _sum: { grossProfit: true },
            where: { ...where, grossProfit: { not: null } },
          }),
        ]);
        return {
          totalValue: totalValue._sum.projectCost || 0,
          totalReceived: totalReceived._sum.totalAmountReceived || 0,
          totalOutstanding: totalOutstanding._sum.balanceAmount || 0,
          totalProfit: totalProfit._sum.grossProfit || 0,
        };
      })(),
    ]);

    // Calculate project value by type (with optional FY filter) - only confirmed/completed projects
    const projectValueByType = await prisma.project.groupBy({
      by: ['type'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
      _count: { id: true },
    });

    // Format the data for the chart
    const valueByType = projectValueByType.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    // Calculate total for percentage calculation
    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);

    // Add percentage to each item
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    // Calculate project value and profit by financial year
    const projectValueByFY = await prisma.project.groupBy({
      by: ['year'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
    });

    const profitByFY = await prisma.project.groupBy({
      by: ['year'],
      where: { ...getRevenueWhere(where), grossProfit: { not: null } },
      _sum: { grossProfit: true },
    });

    // Combine the data by financial year
    const allFYs = new Set([
      ...projectValueByFY.map((item) => item.year),
      ...profitByFY.map((item) => item.year),
    ]);

    const projectValueProfitByFY = Array.from(allFYs)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFY.find((item) => item.year === fy)?._sum.grossProfit || 0,
      }));

    // Total Pipeline - Sum of projectCost for projects in Lead (null), Site Survey, or Proposal stages (exclude LOST projects)
    const totalPipeline = await prisma.project.aggregate({
      where: {
        ...where,
        projectCost: { not: null },
        projectStatus: { not: ProjectStatus.LOST }, // Exclude LOST projects
        OR: [
          { projectStage: null }, // Lead stage
          { projectStage: ProjectStage.SURVEY }, // Site Survey
          { projectStage: ProjectStage.PROPOSAL }, // Proposal
        ],
      },
      _sum: { projectCost: true },
    });

    // Get customer/project profitability data for word cloud
    const profitabilityData = await prisma.project.findMany({
      where: {
        ...where,
        profitability: { not: null },
      },
      include: {
        customer: {
          select: {
            firstName: true, // Primary - used for word cloud
            customerName: true, // Fallback only if firstName is null/empty
          },
        },
      },
      orderBy: {
        profitability: 'desc',
      },
      take: 50, // Limit to top 50 for word cloud
    });

    // Map to word cloud data - use firstName (required), profitability from Sales & Commercial section
    const wordCloudData = profitabilityData.map((p) => {
      // First Name from Customer (fallback to customerName if firstName is empty)
      const firstName = p.customer?.firstName?.trim();
      const text = firstName || p.customer?.customerName?.trim() || 'Unknown';
      
      // Profitability from Sales & Commercial section
      const profitability = p.profitability || 0;
      
      return {
        text: text || 'Unknown',
        value: profitability,
      };
    });

    res.json({
      sales,
      operations,
      finance,
      totalPipeline: totalPipeline._sum.projectCost || 0,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
      wordCloudData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

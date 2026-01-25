import { ProjectStage } from '@prisma/client';
import prisma from '../prisma';

// SLA configuration for each stage (in days)
const STAGE_SLA: Record<ProjectStage, number> = {
  SURVEY: 7, // 7 days for survey
  PROPOSAL: 14, // 14 days for proposal
  APPROVED: 5, // 5 days for approval
  INSTALLATION: 30, // 30 days for installation
  BILLING: 7, // 7 days for billing
  LIVE: 3, // 3 days to go live
  AMC: 365, // 365 days for AMC (ongoing)
  LOST: 0, // Lost projects don't have SLA
};

/**
 * Calculate status indicator based on SLA
 */
export function calculateStatusIndicator(
  stageEnteredAt: Date | null,
  slaDays: number | null
): 'GREEN' | 'AMBER' | 'RED' {
  if (!stageEnteredAt || !slaDays) {
    return 'GREEN';
  }

  const daysInStage = Math.floor(
    (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const percentage = (daysInStage / slaDays) * 100;

  if (percentage < 70) {
    return 'GREEN';
  } else if (percentage < 90) {
    return 'AMBER';
  } else {
    return 'RED';
  }
}

/**
 * Update project stage and track SLA
 */
export async function updateProjectStage(
  projectId: string,
  newStage: ProjectStage,
  userId: string
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const slaDays = STAGE_SLA[newStage];
  const stageEnteredAt = new Date();

  // Update project with new stage (using any to avoid strict typing issues on new fields)
  await (prisma.project as any).update({
    where: { id: projectId },
    data: {
      projectStage: newStage,
      stageEnteredAt,
      slaDays,
      statusIndicator: calculateStatusIndicator(stageEnteredAt, slaDays),
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      projectId,
      userId,
      action: 'stage_changed',
      field: 'projectStage',
      oldValue: project.projectStage || '',
      newValue: newStage,
      remarks: `Stage changed to ${newStage}`,
    },
  });
}

/**
 * Get project owner (Sales or Ops) based on stage
 */
export function getProjectOwner(stage: ProjectStage | null): 'SALES' | 'OPS' {
  if (!stage) {
    return 'SALES';
  }

  // Sales owns: Survey, Proposal, Approved
  // Ops owns: Installation, Billing, Live, AMC
  const salesStages: ProjectStage[] = ['SURVEY', 'PROPOSAL', 'APPROVED'];
  return salesStages.includes(stage) ? 'SALES' : 'OPS';
}

/**
 * Update status indicators for all projects (run as cron job)
 */
export async function updateAllProjectStatusIndicators(): Promise<void> {
  const projects = await (prisma.project as any).findMany({
    where: {
      projectStage: { not: null },
      stageEnteredAt: { not: null },
      slaDays: { not: null },
    },
  });

  for (const project of projects as any[]) {
    if (project.stageEnteredAt && project.slaDays) {
      const statusIndicator = calculateStatusIndicator(
        project.stageEnteredAt,
        project.slaDays
      );

      if (statusIndicator !== project.statusIndicator) {
        await (prisma.project as any).update({
          where: { id: project.id },
          data: { statusIndicator },
        });
      }
    }
  }
}

/**
 * Get projects by stage with SLA status
 */
export async function getProjectsByStageWithSLA(stage: ProjectStage) {
  const projects = await (prisma.project as any).findMany({
    where: {
      projectStage: stage,
    },
    include: {
      customer: true,
      salesperson: true,
      opsPerson: true,
    },
  });

  return (projects as any[]).map((project) => {
    const daysInStage = project.stageEnteredAt
      ? Math.floor(
          (Date.now() - new Date(project.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;
    const slaDays = project.slaDays || 0;
    const daysRemaining = Math.max(0, slaDays - daysInStage);
    const percentage = slaDays > 0 ? (daysInStage / slaDays) * 100 : 0;

    return {
      ...project,
      daysInStage,
      daysRemaining,
      slaPercentage: percentage,
      owner: getProjectOwner(project.projectStage),
    };
  });
}

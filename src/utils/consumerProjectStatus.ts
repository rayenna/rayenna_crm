import { ProjectStage, ProjectStatus } from '@prisma/client';

export type ConsumerProjectStepState = 'complete' | 'current' | 'upcoming';

export type ConsumerProjectStep = {
  key: string;
  label: string;
  state: ConsumerProjectStepState;
};

export type ConsumerProjectStatusDto = {
  headline: string;
  subline: string | null;
  progressPercent: number;
  steps: ConsumerProjectStep[];
  isLive: boolean;
};

const STEP_DEFS = [
  { key: 'survey', label: 'Survey' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'approved', label: 'Approved' },
  { key: 'installation', label: 'Installation' },
  { key: 'billing', label: 'Billing' },
  { key: 'live', label: 'Live' },
] as const;

function stageIndex(
  projectStage: ProjectStage | null,
  projectStatus: ProjectStatus,
): number {
  if (projectStage === ProjectStage.LOST || projectStatus === ProjectStatus.LOST) {
    return -1;
  }

  if (projectStage) {
    const map: Record<ProjectStage, number> = {
      SURVEY: 0,
      PROPOSAL: 1,
      APPROVED: 2,
      INSTALLATION: 3,
      BILLING: 4,
      LIVE: 5,
      AMC: 5,
      LOST: -1,
    };
    return map[projectStage];
  }

  const statusMap: Record<ProjectStatus, number> = {
    LEAD: 0,
    SITE_SURVEY: 0,
    PROPOSAL: 1,
    CONFIRMED: 2,
    UNDER_INSTALLATION: 3,
    SUBMITTED_FOR_SUBSIDY: 4,
    COMPLETED: 5,
    COMPLETED_SUBSIDY_CREDITED: 5,
    LOST: -1,
  };
  return statusMap[projectStatus] ?? 0;
}

function headlineForIndex(index: number, isLive: boolean): string {
  if (index < 0) return 'Project on hold';
  if (isLive) return 'Your system is live';
  const headlines = [
    'Site survey in progress',
    'Proposal under review',
    'Project approved',
    'Installation in progress',
    'Billing & subsidy processing',
    'Commissioning complete',
  ];
  return headlines[index] ?? 'Project in progress';
}

function sublineForIndex(index: number, isLive: boolean): string | null {
  if (index < 0) return 'Contact your Rayenna coordinator for updates';
  if (isLive) return 'Generating clean energy for your home';
  const sublines = [
    'Our team is assessing your site',
    'We are preparing your solar proposal',
    'Awaiting installation scheduling',
    'Our crew is working on your rooftop',
    'Final paperwork and grid connection',
    'Welcome to solar — start tracking your energy',
  ];
  return sublines[index] ?? null;
}

export function buildConsumerProjectStatus(
  projectStage: ProjectStage | null,
  projectStatus: ProjectStatus,
): ConsumerProjectStatusDto {
  const index = stageIndex(projectStage, projectStatus);

  if (index < 0) {
    return {
      headline: 'Project on hold',
      subline: 'Contact your Rayenna coordinator for updates',
      progressPercent: 0,
      steps: STEP_DEFS.map((step) => ({ ...step, state: 'upcoming' as const })),
      isLive: false,
    };
  }

  const isLive = index >= 5;
  const currentIndex = Math.min(index, STEP_DEFS.length - 1);

  const steps: ConsumerProjectStep[] = STEP_DEFS.map((step, i) => {
    let state: ConsumerProjectStepState;
    if (isLive || i < currentIndex) {
      state = 'complete';
    } else if (i === currentIndex) {
      state = 'current';
    } else {
      state = 'upcoming';
    }
    return { ...step, state };
  });

  const progressPercent = isLive
    ? 100
    : Math.round(((currentIndex + 1) / STEP_DEFS.length) * 100);

  return {
    headline: headlineForIndex(currentIndex, isLive),
    subline: sublineForIndex(currentIndex, isLive),
    progressPercent,
    steps,
    isLive,
  };
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

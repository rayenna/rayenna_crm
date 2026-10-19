/**
 * Ask Zenith — Installation Status as shown conceptually in Project Lifecycle:
 * last completed lifecycle milestone + Project Status (incl. pending subsidy).
 */
import { ProjectStatus, ProjectType } from '@prisma/client';

/** Same stage labels as Project Detail → Project Lifecycle. */
export const PROJECT_STATUS_LIFECYCLE_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  SITE_SURVEY: 'Site Survey',
  PROPOSAL: 'Proposal',
  CONFIRMED: 'Confirmed Order',
  UNDER_INSTALLATION: 'Installation',
  SUBMITTED_FOR_SUBSIDY: 'Submitted for Subsidy',
  COMPLETED: 'Completed',
  COMPLETED_SUBSIDY_CREDITED: 'Completed – Subsidy Credited',
  LOST: 'Lost',
};

export type LifecycleMilestoneKey =
  | 'mnrePortal'
  | 'feasibility'
  | 'registration'
  | 'installComplete'
  | 'completionReport'
  | 'netMeter'
  | 'subsidyCredited';

/** Ordered Project Lifecycle date fields (UI labels). */
export const LIFECYCLE_MILESTONES: {
  key: LifecycleMilestoneKey;
  /** Phrase when this is the latest milestone (“… complete”). */
  completePhrase: string;
  field: string;
}[] = [
  {
    key: 'mnrePortal',
    completePhrase: 'MNRE portal registration complete',
    field: 'mnrePortalRegistrationDate',
  },
  {
    key: 'feasibility',
    completePhrase: 'Feasibility (DISCOM) complete',
    field: 'feasibilityDate',
  },
  {
    key: 'registration',
    completePhrase: 'DISCOM registration complete',
    field: 'registrationDate',
  },
  {
    key: 'installComplete',
    completePhrase: 'Installation complete',
    field: 'installationCompletionDate',
  },
  {
    key: 'completionReport',
    completePhrase: 'Completion report submitted',
    field: 'completionReportSubmissionDate',
  },
  {
    // UI label on Project Detail is “Net Meter Installation Date” (stored as subsidyRequestDate).
    key: 'netMeter',
    completePhrase: 'Net Meter Installation complete',
    field: 'subsidyRequestDate',
  },
  {
    key: 'subsidyCredited',
    completePhrase: 'Subsidy credited',
    field: 'subsidyCreditedDate',
  },
];

export type LifecycleProjectDates = {
  projectStatus: ProjectStatus | string;
  type?: ProjectType | string | null;
  mnrePortalRegistrationDate?: Date | string | null;
  feasibilityDate?: Date | string | null;
  registrationDate?: Date | string | null;
  installationCompletionDate?: Date | string | null;
  completionReportSubmissionDate?: Date | string | null;
  /** Project Detail labels this Net Meter Installation Date */
  subsidyRequestDate?: Date | string | null;
  subsidyCreditedDate?: Date | string | null;
};

function toTime(v: Date | string | null | undefined): number | null {
  if (v == null) return null;
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

function milestoneDate(
  project: LifecycleProjectDates,
  field: (typeof LIFECYCLE_MILESTONES)[number]['field'],
): Date | string | null | undefined {
  switch (field) {
    case 'mnrePortalRegistrationDate':
      return project.mnrePortalRegistrationDate;
    case 'feasibilityDate':
      return project.feasibilityDate;
    case 'registrationDate':
      return project.registrationDate;
    case 'installationCompletionDate':
      return project.installationCompletionDate;
    case 'completionReportSubmissionDate':
      return project.completionReportSubmissionDate;
    case 'subsidyRequestDate':
      return project.subsidyRequestDate;
    case 'subsidyCreditedDate':
      return project.subsidyCreditedDate;
    default:
      return null;
  }
}

export function latestLifecycleMilestone(project: LifecycleProjectDates): {
  key: LifecycleMilestoneKey;
  completePhrase: string;
  at: Date;
} | null {
  let best: { key: LifecycleMilestoneKey; completePhrase: string; at: Date; t: number } | null =
    null;
  for (const m of LIFECYCLE_MILESTONES) {
    const raw = milestoneDate(project, m.field);
    const t = toTime(raw);
    if (t == null) continue;
    if (!best || t >= best.t) {
      best = {
        key: m.key,
        completePhrase: m.completePhrase,
        at: raw instanceof Date ? raw : new Date(raw as string),
        t,
      };
    }
  }
  if (!best) return null;
  return { key: best.key, completePhrase: best.completePhrase, at: best.at };
}

function isPendingSubsidy(project: LifecycleProjectDates): boolean {
  return (
    project.type === ProjectType.SUBSIDY &&
    project.projectStatus === ProjectStatus.COMPLETED
  );
}

/**
 * Meaningful Installation Status for Ask (Project Lifecycle semantics).
 * Example: “Net Meter Installation complete and Subsidy credited”
 */
export function buildLifecycleInstallationStatus(project: LifecycleProjectDates): string {
  const status = String(project.projectStatus || '');
  const statusLabel =
    PROJECT_STATUS_LIFECYCLE_LABEL[status] || status.replace(/_/g, ' ') || 'Unknown stage';
  const latest = latestLifecycleMilestone(project);
  const hasNetMeter = toTime(project.subsidyRequestDate) != null;
  const pendingSubsidy = isPendingSubsidy(project);

  if (status === ProjectStatus.COMPLETED_SUBSIDY_CREDITED) {
    if (hasNetMeter) {
      return 'Net Meter Installation complete and Subsidy credited';
    }
    if (latest && latest.key !== 'subsidyCredited') {
      return `${latest.completePhrase} and Subsidy credited`;
    }
    return 'Subsidy credited';
  }

  if (pendingSubsidy) {
    if (latest) {
      return `${latest.completePhrase} · Pending subsidy credit`;
    }
    return 'Completed · Pending subsidy credit';
  }

  if (status === ProjectStatus.UNDER_INSTALLATION) {
    if (latest) {
      return `${latest.completePhrase} · Under Installation`;
    }
    return 'Under Installation — no lifecycle dates recorded yet';
  }

  if (status === ProjectStatus.CONFIRMED) {
    if (latest) {
      return `${latest.completePhrase} · Confirmed Order`;
    }
    return 'Confirmed Order — installation not started';
  }

  if (status === ProjectStatus.SUBMITTED_FOR_SUBSIDY) {
    if (latest) {
      return `${latest.completePhrase} · Submitted for Subsidy`;
    }
    return 'Submitted for Subsidy';
  }

  if (status === ProjectStatus.LOST) {
    return latest ? `${latest.completePhrase} · Lost` : 'Lost';
  }

  // Early pipeline or Completed (non-subsidy)
  if (status === ProjectStatus.COMPLETED) {
    if (latest) return `${latest.completePhrase} · Completed`;
    return 'Completed';
  }

  if (latest) {
    return `${latest.completePhrase} · ${statusLabel}`;
  }
  return statusLabel;
}

export function formatProjectStatusLifecycleLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return PROJECT_STATUS_LIFECYCLE_LABEL[status] || status.replace(/_/g, ' ');
}

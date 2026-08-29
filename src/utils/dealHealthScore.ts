/**
 * Deal Health numeric score for list/export sort.
 * KEEP IN SYNC with client/src/utils/dealHealthScore.ts (same factor maths).
 */
import { LeadSource, PaymentStatus, ProjectStatus } from '@prisma/client';

const EXPECTED_DAYS_PER_STATUS: Partial<Record<ProjectStatus, number>> = {
  [ProjectStatus.LEAD]: 7,
  [ProjectStatus.SITE_SURVEY]: 14,
  [ProjectStatus.PROPOSAL]: 21,
  [ProjectStatus.CONFIRMED]: 30,
  [ProjectStatus.UNDER_INSTALLATION]: 60,
  [ProjectStatus.SUBMITTED_FOR_SUBSIDY]: 21,
};

const UNDER_INSTALLATION_CONFIDENCE_PTS = 15;

const PRE_ORDER: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
];

const SOURCE_SCORES: Partial<Record<LeadSource, number>> = {
  [LeadSource.REFERRAL]: 10,
  [LeadSource.MANAGEMENT_CONNECT]: 8,
  [LeadSource.CHANNEL_PARTNER]: 8,
  [LeadSource.DIGITAL_MARKETING]: 6,
  [LeadSource.SALES]: 5,
  [LeadSource.WEBSITE]: 4,
  [LeadSource.GOOGLE]: 4,
  [LeadSource.OTHER]: 3,
};

function daysSinceDate(d: Date | null | undefined, today: Date): number {
  if (!d) return 999;
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - dd.getTime()) / 86400000));
}

function sameCalendarDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function scoreDealValue(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1_500_000) return 12;
  if (value > 800_000) return 15;
  if (value >= 200_000) return 20;
  return 10;
}

function latestDate(dates: Array<Date | null | undefined>): Date | null {
  let best: Date | null = null;
  for (const d of dates) {
    if (!d || Number.isNaN(d.getTime())) continue;
    if (!best || d.getTime() > best.getTime()) best = d;
  }
  return best;
}

function scoreCommitmentBooked(args: {
  hasConfirmation: boolean;
  advance: number;
  orderValue: number;
  paymentStatus: PaymentStatus | null;
  balanceAmount: number | null;
  expectedCommissioningDate: Date | null | undefined;
  today: Date;
}): number {
  let score = 0;
  if (args.hasConfirmation) score += 4;

  if (args.hasConfirmation && args.advance > 0 && args.orderValue > 0) {
    score += args.advance >= args.orderValue * 0.5 ? 6 : 3;
  }

  const bal = args.balanceAmount != null ? Number(args.balanceAmount) : NaN;
  const ps = args.paymentStatus;
  const fullyPaid =
    ps === PaymentStatus.FULLY_PAID ||
    (args.orderValue > 0 && Number.isFinite(bal) && bal <= 0 && args.advance > 0);
  const partial =
    ps === PaymentStatus.PARTIAL ||
    (Number.isFinite(bal) && bal > 0 && args.advance > 0 && args.orderValue > 0 && bal < args.orderValue);

  if (fullyPaid) score += 5;
  else if (partial) score += 3;
  else if (args.hasConfirmation) score += 1;

  if (args.expectedCommissioningDate && !Number.isNaN(args.expectedCommissioningDate.getTime())) {
    const closeDate = new Date(args.expectedCommissioningDate);
    closeDate.setHours(0, 0, 0, 0);
    const delta = Math.floor((closeDate.getTime() - args.today.getTime()) / 86400000);
    if (delta < 0) score = Math.max(0, score - 3);
  }

  return Math.min(15, score);
}

function scoreCommitmentPreOrder(args: {
  orderValue: number;
  expectedCommissioningDate: Date | null | undefined;
  today: Date;
}): number {
  let score = 0;
  if (args.orderValue > 0) score += 5;
  if (args.expectedCommissioningDate && !Number.isNaN(args.expectedCommissioningDate.getTime())) {
    const closeDate = new Date(args.expectedCommissioningDate);
    closeDate.setHours(0, 0, 0, 0);
    const delta = Math.floor((closeDate.getTime() - args.today.getTime()) / 86400000);
    score += delta < 0 ? 3 : 10;
  } else {
    score += 5;
  }
  return Math.min(15, score);
}

export function computeDealHealthScoreForProjectList(p: {
  projectStatus: ProjectStatus;
  updatedAt: Date;
  stageEnteredAt: Date | null;
  projectCost: number | null;
  confirmationDate: Date | null;
  advanceReceived: number | null;
  leadSource: LeadSource | null;
  expectedCommissioningDate?: Date | null;
  paymentStatus?: PaymentStatus | null;
  balanceAmount?: number | null;
  lastRemarkAt?: Date | null;
  lastPaymentDate?: Date | null;
  advanceReceivedDate?: Date | null;
  lastTaskActivityAt?: Date | null;
}): number | null {
  if (
    p.projectStatus === ProjectStatus.COMPLETED ||
    p.projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
    p.projectStatus === ProjectStatus.LOST
  ) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const underInstall = p.projectStatus === ProjectStatus.UNDER_INSTALLATION;

  const activityAnchor = latestDate([
    p.lastRemarkAt,
    p.lastTaskActivityAt,
    p.lastPaymentDate,
    p.advanceReceivedDate,
    p.updatedAt,
  ]);
  const daysSinceActivity = daysSinceDate(activityAnchor, today);

  let factor1 = 0;
  if (underInstall) {
    if (daysSinceActivity <= 7) factor1 = 30;
    else if (daysSinceActivity <= 14) factor1 = 22;
    else if (daysSinceActivity <= 30) factor1 = 15;
    else if (daysSinceActivity <= 60) factor1 = 8;
    else factor1 = 0;
  } else if (daysSinceActivity <= 3) factor1 = 30;
  else if (daysSinceActivity <= 7) factor1 = 22;
  else if (daysSinceActivity <= 14) factor1 = 12;
  else if (daysSinceActivity <= 30) factor1 = 5;
  else factor1 = 0;

  const expectedDays = EXPECTED_DAYS_PER_STATUS[p.projectStatus] ?? 14;
  const hasRealStage = p.stageEnteredAt != null;
  const stageAnchor = p.stageEnteredAt ?? p.updatedAt;
  const stageAnchorIsFallback = !hasRealStage || sameCalendarDay(p.stageEnteredAt, p.updatedAt);
  const daysInStage = daysSinceDate(stageAnchor, today);

  let factor2 = 0;
  if (daysInStage <= expectedDays) factor2 = 25;
  else if (daysInStage <= expectedDays * 1.5) factor2 = 15;
  else if (daysInStage <= expectedDays * 2) factor2 = 8;
  else factor2 = 0;

  if (!underInstall && stageAnchorIsFallback && factor1 > 0) {
    factor1 = Math.round(factor1 * 0.55);
  }

  const value = Number(p.projectCost ?? 0);
  const factor3 = scoreDealValue(value);

  const hasConfirmation =
    p.confirmationDate != null && !Number.isNaN(new Date(p.confirmationDate).getTime());
  const advance = Number(p.advanceReceived ?? 0);
  const isPreOrder = PRE_ORDER.includes(p.projectStatus);

  const factor4 =
    hasConfirmation || !isPreOrder
      ? scoreCommitmentBooked({
          hasConfirmation,
          advance,
          orderValue: value,
          paymentStatus: p.paymentStatus ?? null,
          balanceAmount: p.balanceAmount ?? null,
          expectedCommissioningDate: p.expectedCommissioningDate,
          today,
        })
      : scoreCommitmentPreOrder({
          orderValue: value,
          expectedCommissioningDate: p.expectedCommissioningDate,
          today,
        });

  const factor5 =
    p.leadSource && SOURCE_SCORES[p.leadSource] != null
      ? (SOURCE_SCORES[p.leadSource] as number)
      : p.leadSource
        ? 3
        : 2;

  const factor6 = underInstall ? UNDER_INSTALLATION_CONFIDENCE_PTS : 0;

  const raw = factor1 + factor2 + factor3 + factor4 + factor5 + factor6;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Data Sense — cross-field “Needs review” flags.
 * KEEP IN SYNC with client/src/utils/dataSense.ts (evaluate rules).
 */
import { PaymentStatus, ProjectStatus, type Prisma } from '@prisma/client';
import prisma from '../prisma';

export const DATA_SENSE_TIMEZONE = 'Asia/Kolkata';

export const DATA_SENSE_TERMINAL_STATUSES: ProjectStatus[] = [
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
  ProjectStatus.LOST,
];

export const DATA_SENSE_CONFIRMED_PLUS_STATUSES: ProjectStatus[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
];

export const DATA_SENSE_EARLY_PIPELINE_STATUSES: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
];

export const DATA_SENSE_STAGE_SLA_DAYS: Record<string, number> = {
  [ProjectStatus.LEAD]: 7,
  [ProjectStatus.SITE_SURVEY]: 14,
  [ProjectStatus.PROPOSAL]: 21,
  [ProjectStatus.CONFIRMED]: 30,
  [ProjectStatus.UNDER_INSTALLATION]: 60,
  [ProjectStatus.SUBMITTED_FOR_SUBSIDY]: 21,
};

export const DATA_SENSE_NO_ADVANCE_GRACE_DAYS = 14;

export const DATA_SENSE_RULE_IDS = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'C2',
] as const;

export type DataSenseRuleId = (typeof DATA_SENSE_RULE_IDS)[number];

export type DataSenseFinding = {
  id: DataSenseRuleId;
  title: string;
  detail: string;
  severity: 'critical' | 'warning';
};

export type DataSenseInput = {
  projectStatus: string;
  expectedCommissioningDate?: string | Date | null;
  confirmationDate?: string | Date | null;
  lostDate?: string | Date | null;
  lostReason?: string | null;
  projectCost?: number | null;
  advanceReceived?: number | null;
  paymentStatus?: string | null;
  stageEnteredAt?: string | Date | null;
  systemCapacity?: number | null;
  balanceAmount?: number | null;
};

export function calendarYmdInTimeZone(date: Date, timeZone: string = DATA_SENSE_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function startOfTodayInIst(now: Date = new Date()): Date {
  const ymd = calendarYmdInTimeZone(now);
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
}

function addIstCalendarDays(startOfTodayIst: Date, days: number): Date {
  return new Date(startOfTodayIst.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPastCalendarDate(v: string | Date | null | undefined, now: Date): boolean {
  const d = toDate(v);
  if (!d) return false;
  return calendarYmdInTimeZone(d) < calendarYmdInTimeZone(now);
}

export function calendarDaysBetweenIst(
  from: string | Date | null | undefined,
  to: Date,
): number | null {
  const d = toDate(from);
  if (!d) return null;
  const a = calendarYmdInTimeZone(d);
  const b = calendarYmdInTimeZone(to);
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.floor((utcB - utcA) / (24 * 60 * 60 * 1000));
}

function isBlank(v: string | null | undefined): boolean {
  return v == null || String(v).trim() === '';
}

function isConfirmedPlus(status: string): boolean {
  return (DATA_SENSE_CONFIRMED_PLUS_STATUSES as string[]).includes(status);
}

function isTerminal(status: string): boolean {
  return (DATA_SENSE_TERMINAL_STATUSES as string[]).includes(status);
}

function isEarlyPipeline(status: string): boolean {
  return (DATA_SENSE_EARLY_PIPELINE_STATUSES as string[]).includes(status);
}

function money(v: number | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function capacityInvalid(v: number | null | undefined): boolean {
  const n = money(v);
  return n == null || n <= 0;
}

export function evaluateDataSense(project: DataSenseInput, now: Date = new Date()): DataSenseFinding[] {
  const findings: DataSenseFinding[] = [];
  const status = project.projectStatus;

  if (!isTerminal(status) && isPastCalendarDate(project.expectedCommissioningDate, now)) {
    findings.push({
      id: 'A1',
      severity: 'critical',
      title: 'Expected commissioning date has passed',
      detail:
        'This deal is still open. Update the expected commissioning date, or move status to Completed, Subsidy Credited, or Lost.',
    });
  }

  if (isConfirmedPlus(status) && !toDate(project.confirmationDate)) {
    findings.push({
      id: 'A2',
      severity: 'warning',
      title: 'Confirmation date missing',
      detail:
        'Confirmed and later stages should have a confirmation date so collections and reporting stay accurate.',
    });
  }

  if (status === ProjectStatus.LOST) {
    const missingDate = !toDate(project.lostDate);
    const missingReason = isBlank(project.lostReason ?? undefined);
    if (missingDate || missingReason) {
      const bits: string[] = [];
      if (missingDate) bits.push('lost date');
      if (missingReason) bits.push('reason for loss');
      findings.push({
        id: 'A3',
        severity: 'warning',
        title: 'Lost record incomplete',
        detail: `This Lost project is missing ${bits.join(' and ')}.`,
      });
    }
  }

  const confirm = toDate(project.confirmationDate);
  const commission = toDate(project.expectedCommissioningDate);
  if (confirm && commission && calendarYmdInTimeZone(commission) < calendarYmdInTimeZone(confirm)) {
    findings.push({
      id: 'A4',
      severity: 'critical',
      title: 'Commissioning date before confirmation',
      detail:
        'Expected commissioning is earlier than the confirmation date. Fix the dates so the timeline is possible.',
    });
  }

  if (isEarlyPipeline(status) && confirm) {
    findings.push({
      id: 'A5',
      severity: 'warning',
      title: 'Confirmation date on an early-stage deal',
      detail:
        'A confirmation date is set while status is still Lead, Site Survey, or Proposal. Move the stage or clear the date.',
    });
  }

  const slaDays = DATA_SENSE_STAGE_SLA_DAYS[status];
  const daysInStage = calendarDaysBetweenIst(project.stageEnteredAt, now);
  if (slaDays != null && daysInStage != null && daysInStage > slaDays) {
    findings.push({
      id: 'A6',
      severity: 'warning',
      title: 'Longer in this stage than expected',
      detail: `This deal has been in the current stage for ${daysInStage} days (expected ${slaDays}). Move the stage or log why it is stuck.`,
    });
  }

  const cost = money(project.projectCost) ?? 0;
  const advance = money(project.advanceReceived);
  const advanceZero = advance == null || advance <= 0;
  if (
    isConfirmedPlus(status) &&
    cost > 0 &&
    advanceZero &&
    project.paymentStatus === PaymentStatus.PENDING
  ) {
    findings.push({
      id: 'B1',
      severity: 'warning',
      title: 'No advance recorded',
      detail:
        'This confirmed deal has an order value but payment status is still Pending and advance received is ₹0.',
    });
  }

  const daysSinceConfirm = calendarDaysBetweenIst(project.confirmationDate, now);
  if (
    isConfirmedPlus(status) &&
    cost > 0 &&
    advanceZero &&
    project.paymentStatus === PaymentStatus.PENDING &&
    daysSinceConfirm != null &&
    daysSinceConfirm > DATA_SENSE_NO_ADVANCE_GRACE_DAYS
  ) {
    findings.push({
      id: 'B2',
      severity: 'warning',
      title: 'No advance after confirmation window',
      detail: `Payment is still Pending with ₹0 advance more than ${DATA_SENSE_NO_ADVANCE_GRACE_DAYS} days after confirmation.`,
    });
  }

  const costNum = money(project.projectCost);
  const advNum = money(project.advanceReceived);
  if (costNum != null && advNum != null && advNum > costNum) {
    findings.push({
      id: 'B3',
      severity: 'critical',
      title: 'Advance exceeds order value',
      detail: 'Advance received is greater than project cost. Check the amounts.',
    });
  }

  const balance = money(project.balanceAmount);
  if (
    (status === ProjectStatus.COMPLETED || status === ProjectStatus.COMPLETED_SUBSIDY_CREDITED) &&
    project.paymentStatus === PaymentStatus.PENDING &&
    balance != null &&
    balance > 0
  ) {
    findings.push({
      id: 'B4',
      severity: 'warning',
      title: 'Completed with payment still pending',
      detail: 'This project is Completed (or Subsidy Credited) but payment is Pending with a remaining balance.',
    });
  }

  if (project.paymentStatus === PaymentStatus.FULLY_PAID && balance != null && balance > 0) {
    findings.push({
      id: 'B5',
      severity: 'critical',
      title: 'Marked fully paid with a balance',
      detail: 'Payment status is Fully Paid but outstanding balance is greater than ₹0. Reconcile payments.',
    });
  }

  if (isConfirmedPlus(status) && capacityInvalid(project.systemCapacity)) {
    findings.push({
      id: 'C2',
      severity: 'warning',
      title: 'System capacity missing',
      detail: 'Confirmed and later stages should have a valid system capacity (kW) for reporting and proposals.',
    });
  }

  return findings;
}

export function projectNeedsDataSenseReview(project: DataSenseInput, now: Date = new Date()): boolean {
  return evaluateDataSense(project, now).length > 0;
}

/** Soft-block on save (P3): user must confirm. Not a hard reject. */
export const DATA_SENSE_SOFT_BLOCK_RULE_IDS: DataSenseRuleId[] = ['A4', 'B3'];

export const DATA_SENSE_IMPOSSIBLE_CODE = 'DATA_SENSE_IMPOSSIBLE';

export function dataSenseImpossibleFindings(
  project: DataSenseInput,
  now: Date = new Date(),
): DataSenseFinding[] {
  return evaluateDataSense(project, now).filter((f) =>
    (DATA_SENSE_SOFT_BLOCK_RULE_IDS as readonly string[]).includes(f.id),
  );
}

export function dataSenseAckFromBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const v = (body as Record<string, unknown>).acknowledgeDataSenseImpossibilities;
  return v === true || v === 'true' || v === 1 || v === '1';
}

export type DataSensePersistedSlice = {
  projectStatus?: string | null;
  expectedCommissioningDate?: Date | string | null;
  confirmationDate?: Date | string | null;
  projectCost?: unknown;
  advanceReceived?: unknown;
};

function patchHas(patch: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined;
}

function coerceDate(v: unknown): string | Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' || typeof v === 'number') return v as string;
  return null;
}

function coerceMoney(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function dataSenseInputFromPersistedAndPatch(
  persisted: DataSensePersistedSlice | null,
  patch: Record<string, unknown>,
): DataSenseInput {
  return {
    projectStatus: patchHas(patch, 'projectStatus')
      ? String(patch.projectStatus ?? '')
      : String(persisted?.projectStatus ?? ''),
    expectedCommissioningDate: coerceDate(
      patchHas(patch, 'expectedCommissioningDate')
        ? patch.expectedCommissioningDate
        : persisted?.expectedCommissioningDate,
    ),
    confirmationDate: coerceDate(
      patchHas(patch, 'confirmationDate') ? patch.confirmationDate : persisted?.confirmationDate,
    ),
    projectCost: patchHas(patch, 'projectCost')
      ? coerceMoney(patch.projectCost)
      : coerceMoney(persisted?.projectCost),
    advanceReceived: patchHas(patch, 'advanceReceived')
      ? coerceMoney(patch.advanceReceived)
      : coerceMoney(persisted?.advanceReceived),
  };
}

export function dataSenseImpossibleConflict(
  body: unknown,
  persisted: DataSensePersistedSlice | null,
  now: Date = new Date(),
): DataSenseFinding[] {
  if (dataSenseAckFromBody(body)) return [];
  const patch = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  return dataSenseImpossibleFindings(dataSenseInputFromPersistedAndPatch(persisted, patch), now);
}

export function dataSenseImpossibleHttpBody(findings: DataSenseFinding[]) {
  return {
    error: 'These dates or amounts cannot both be true. Fix them, or save anyway if you are sure.',
    code: DATA_SENSE_IMPOSSIBLE_CODE,
    findings,
  };
}

export const DATA_SENSE_MY_DAY_RULE_IDS: DataSenseRuleId[] = ['A1', 'A2', 'A4', 'B1', 'B2', 'B3', 'B5'];

export const DATA_SENSE_RULE_SHORT_LABEL: Record<DataSenseRuleId, string> = {
  A1: 'Overdue commissioning',
  A2: 'Missing confirmation',
  A3: 'Incomplete Lost',
  A4: 'Dates reversed',
  A5: 'Confirm date too early',
  A6: 'Stuck in stage',
  B1: 'No advance',
  B2: 'Advance overdue',
  B3: 'Advance > order',
  B4: 'Done, still pending',
  B5: 'Paid but balance',
  C2: 'No system size',
};

export function parseDataSenseRule(raw: unknown): DataSenseRuleId | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return (DATA_SENSE_RULE_IDS as readonly string[]).includes(v) ? (v as DataSenseRuleId) : null;
}

const DATA_SENSE_STAGE_LABELS: Record<string, string> = {
  [ProjectStatus.LEAD]: 'Lead',
  [ProjectStatus.SITE_SURVEY]: 'Site Survey',
  [ProjectStatus.PROPOSAL]: 'Proposal',
  [ProjectStatus.CONFIRMED]: 'Confirmed',
  [ProjectStatus.UNDER_INSTALLATION]: 'Under Installation',
  [ProjectStatus.SUBMITTED_FOR_SUBSIDY]: 'Submitted for Subsidy',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.COMPLETED_SUBSIDY_CREDITED]: 'Completed – Subsidy Credited',
  [ProjectStatus.LOST]: 'Lost',
};

const noAdvanceConfirmedPending = {
  AND: [
    { projectStatus: { in: DATA_SENSE_CONFIRMED_PLUS_STATUSES } },
    { projectCost: { gt: 0 } },
    { paymentStatus: PaymentStatus.PENDING },
    { OR: [{ advanceReceived: null }, { advanceReceived: { lte: 0 } }] },
  ],
};

function a6PrismaOr(now: Date): object {
  const startToday = startOfTodayInIst(now);
  return {
    OR: Object.entries(DATA_SENSE_STAGE_SLA_DAYS).map(([status, sla]) => ({
      AND: [
        { projectStatus: status as ProjectStatus },
        { stageEnteredAt: { not: null } },
        { stageEnteredAt: { lt: addIstCalendarDays(startToday, -sla) } },
      ],
    })),
  };
}

export function dataSensePrismaClauseForRule(now: Date, rule: DataSenseRuleId): object {
  const startToday = startOfTodayInIst(now);
  switch (rule) {
    case 'A1':
      return {
        AND: [
          { projectStatus: { notIn: DATA_SENSE_TERMINAL_STATUSES } },
          { expectedCommissioningDate: { not: null } },
          { expectedCommissioningDate: { lt: startToday } },
        ],
      };
    case 'A2':
      return {
        AND: [
          { projectStatus: { in: DATA_SENSE_CONFIRMED_PLUS_STATUSES } },
          { confirmationDate: null },
        ],
      };
    case 'A3':
      return {
        AND: [
          { projectStatus: ProjectStatus.LOST },
          { OR: [{ lostDate: null }, { lostReason: null }] },
        ],
      };
    case 'A4':
      return {
        AND: [
          { expectedCommissioningDate: { not: null } },
          { confirmationDate: { not: null } },
          {
            expectedCommissioningDate: {
              lt: prisma.project.fields.confirmationDate,
            },
          },
        ],
      };
    case 'A5':
      return {
        AND: [
          { projectStatus: { in: DATA_SENSE_EARLY_PIPELINE_STATUSES } },
          { confirmationDate: { not: null } },
        ],
      };
    case 'A6':
      return a6PrismaOr(now);
    case 'B1':
      return noAdvanceConfirmedPending;
    case 'B2':
      return {
        AND: [
          noAdvanceConfirmedPending,
          { confirmationDate: { not: null } },
          { confirmationDate: { lt: addIstCalendarDays(startToday, -DATA_SENSE_NO_ADVANCE_GRACE_DAYS) } },
        ],
      };
    case 'B3':
      return {
        AND: [
          { advanceReceived: { not: null } },
          { projectCost: { not: null } },
          {
            advanceReceived: {
              gt: prisma.project.fields.projectCost,
            },
          },
        ],
      };
    case 'B4':
      return {
        AND: [
          {
            projectStatus: {
              in: [ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED],
            },
          },
          { paymentStatus: PaymentStatus.PENDING },
          { balanceAmount: { gt: 0 } },
        ],
      };
    case 'B5':
      return {
        AND: [{ paymentStatus: PaymentStatus.FULLY_PAID }, { balanceAmount: { gt: 0 } }],
      };
    case 'C2':
      return {
        AND: [
          { projectStatus: { in: DATA_SENSE_CONFIRMED_PLUS_STATUSES } },
          { OR: [{ systemCapacity: null }, { systemCapacity: { lte: 0 } }] },
        ],
      };
  }
}

export function dataSensePrismaClause(now: Date = new Date(), rule?: DataSenseRuleId | null): object {
  if (rule) return dataSensePrismaClauseForRule(now, rule);
  return dataSenseNeedsReviewPrismaOr(now);
}

export type DataSenseGapRow = {
  projectId: string;
  projectSerialNumber: number | null;
  customerName: string;
  stageLabel: string;
  ruleIds: DataSenseRuleId[];
  primaryRuleId: DataSenseRuleId;
  primaryTitle: string;
  severity: 'critical' | 'warning';
};

/** Projects matching Data Sense rules (My Day uses a subset). */
export async function loadDataSenseGaps(
  where: Prisma.ProjectWhereInput,
  options?: { salespersonId?: string; take?: number; now?: Date },
): Promise<DataSenseGapRow[]> {
  const now = options?.now ?? new Date();
  const take = options?.take ?? 25;
  const rows = await prisma.project.findMany({
    where: {
      AND: [
        where,
        ...(options?.salespersonId ? [{ salespersonId: options.salespersonId }] : []),
        {
          OR: DATA_SENSE_MY_DAY_RULE_IDS.map((id) => dataSensePrismaClauseForRule(now, id)),
        },
      ],
    },
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      expectedCommissioningDate: true,
      confirmationDate: true,
      lostDate: true,
      lostReason: true,
      projectCost: true,
      advanceReceived: true,
      paymentStatus: true,
      stageEnteredAt: true,
      systemCapacity: true,
      balanceAmount: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take,
  });

  const out: DataSenseGapRow[] = [];
  for (const p of rows) {
    const findings = evaluateDataSense(
      {
        projectStatus: p.projectStatus,
        expectedCommissioningDate: p.expectedCommissioningDate,
        confirmationDate: p.confirmationDate,
        lostDate: p.lostDate,
        lostReason: p.lostReason,
        projectCost: p.projectCost,
        advanceReceived: p.advanceReceived,
        paymentStatus: p.paymentStatus,
        stageEnteredAt: p.stageEnteredAt,
        systemCapacity: p.systemCapacity,
        balanceAmount: p.balanceAmount,
      },
      now,
    ).filter((f) => DATA_SENSE_MY_DAY_RULE_IDS.includes(f.id));
    if (!findings.length) continue;
    const primary = findings.find((f) => f.severity === 'critical') ?? findings[0]!;
    const customerName =
      p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown';
    out.push({
      projectId: p.id,
      projectSerialNumber: p.slNo,
      customerName,
      stageLabel: DATA_SENSE_STAGE_LABELS[p.projectStatus] || String(p.projectStatus),
      ruleIds: findings.map((f) => f.id),
      primaryRuleId: primary.id,
      primaryTitle: primary.title,
      severity: primary.severity,
    });
  }
  return out;
}

/** Prisma OR matching evaluateDataSense (any shipped rule). */
export function dataSenseNeedsReviewPrismaOr(now: Date = new Date()): object {
  return {
    OR: DATA_SENSE_RULE_IDS.map((id) => dataSensePrismaClauseForRule(now, id)),
  };
}

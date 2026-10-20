/**
 * Ask Zenith — “Who should I call today?” maps to Hit List + outstanding chase.
 */
import { PaymentStatus, ProjectStatus, type Prisma, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import type { ZenithNlIntent, ZenithNlTableRow, ZenithNlViz } from './catalog';
import { metricAllowedForRole } from './catalog';
import { primaryPhoneFromCustomer } from '../../utils/consumerCustomerProfile';

const SCAN_CAP = 80;
const RESULT_CAP = 5;

const OPEN_PIPELINE: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
];

const STATUS_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  SITE_SURVEY: 'Site Survey',
  PROPOSAL: 'Proposal',
  CONFIRMED: 'Confirmed',
  UNDER_INSTALLATION: 'Under Installation',
};

type CallUrgency = 'critical' | 'warning';

type CallRow = {
  projectId: string;
  slNo: number;
  customerName: string;
  why: string;
  stage: string;
  stageStatus: string;
  phone?: string;
  value: number;
  urgency: CallUrgency;
  rank: number;
};

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function money(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function displayName(c: { customerName?: string | null; firstName?: string | null } | null): string {
  const first = c?.firstName?.trim();
  if (first) return first;
  return c?.customerName?.trim() || 'Unknown';
}

function daysBetween(from: Date | null | undefined, today: Date): number {
  if (!from) return 0;
  return Math.floor((today.getTime() - from.getTime()) / 86400000);
}

function daysUntil(to: Date | null | undefined, today: Date): number | null {
  if (!to) return null;
  return Math.ceil((to.getTime() - today.getTime()) / 86400000);
}

export function matchWhoToCallIntent(question: string, role: UserRole): ZenithNlIntent | null {
  if (!metricAllowedForRole('who_to_call', role)) return null;
  const q = norm(question);
  if (!q) return null;
  const hit =
    /\bwho\s+(should|do|shall|can)\s+i\s+(call|phone|ring|follow\s*up)\b/.test(q) ||
    /\bwho\s+to\s+(call|phone|follow\s*up)\b/.test(q) ||
    /\b(call\s+list|who\s+needs?\s+(a\s+)?(call|follow[- ]?up))\b/.test(q) ||
    /\bwho\s+should\s+i\s+(chase|nudge|follow\s*up)\b/.test(q);
  if (!hit) return null;
  return {
    metric: 'who_to_call',
    viz: 'table',
    insightHints: 'who to call',
  };
}

function customerPhone(
  c: {
    phone?: string | null;
    contactNumbers?: string | null;
    contacts?: unknown;
  } | null,
): string | undefined {
  if (!c) return undefined;
  return primaryPhoneFromCustomer(c as Parameters<typeof primaryPhoneFromCustomer>[0]) || undefined;
}

function scorePipelineRow(p: {
  id: string;
  slNo: number;
  projectStatus: ProjectStatus;
  projectCost: number | null;
  createdAt: Date;
  updatedAt: Date;
  expectedCommissioningDate: Date | null;
  customer: {
    customerName: string | null;
    firstName: string | null;
    phone?: string | null;
    contactNumbers?: string | null;
    contacts?: unknown;
  } | null;
}): CallRow | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stage = STATUS_LABEL[p.projectStatus] || p.projectStatus;
  const customerName = displayName(p.customer);
  const value = Number(p.projectCost) || 0;
  const base = {
    projectId: p.id,
    slNo: p.slNo,
    customerName,
    stage,
    stageStatus: p.projectStatus,
    phone: customerPhone(p.customer),
    value,
  };

  const closeDays = daysUntil(p.expectedCommissioningDate, today);
  if (closeDays != null && closeDays < 0) {
    return {
      ...base,
      why: `Overdue close · ${Math.abs(closeDays)}d past expected date`,
      urgency: 'critical',
      rank: 0,
    };
  }
  if (closeDays != null && closeDays <= 7) {
    return {
      ...base,
      why: `Closing soon · ${closeDays}d left`,
      urgency: 'critical',
      rank: 1,
    };
  }

  const quiet = daysBetween(p.updatedAt, today);
  if (p.projectStatus === ProjectStatus.PROPOSAL && quiet >= 14) {
    return {
      ...base,
      why: `Stalled proposal · ${quiet}d no movement`,
      urgency: 'warning',
      rank: 2,
    };
  }
  if (p.projectStatus === ProjectStatus.SITE_SURVEY && quiet >= 7) {
    return {
      ...base,
      why: `Survey nudge · ${quiet}d no movement`,
      urgency: 'warning',
      rank: 3,
    };
  }
  if (p.projectStatus === ProjectStatus.LEAD) {
    const sinceCreate = daysBetween(p.createdAt, today);
    const moved =
      Math.abs(p.updatedAt.getTime() - p.createdAt.getTime()) <= 86400000;
    if (sinceCreate >= 5 && moved) {
      return {
        ...base,
        why: `Going cold · ${sinceCreate}d since contact`,
        urgency: 'warning',
        rank: 4,
      };
    }
  }
  return null;
}

export async function execWhoToCall(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const [pipeline, outstanding] = await Promise.all([
    prisma.project.findMany({
      where: { ...where, projectStatus: { in: OPEN_PIPELINE } },
      select: {
        id: true,
        slNo: true,
        projectStatus: true,
        projectCost: true,
        createdAt: true,
        updatedAt: true,
        expectedCommissioningDate: true,
        customer: {
          select: { customerName: true, firstName: true, phone: true, contactNumbers: true, contacts: true },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: SCAN_CAP,
    }),
    prisma.project.findMany({
      where: {
        ...where,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        balanceAmount: { gt: 0 },
        projectStatus: { notIn: [ProjectStatus.LOST] },
      },
      select: {
        id: true,
        slNo: true,
        projectStatus: true,
        projectCost: true,
        balanceAmount: true,
        lastPaymentDate: true,
        confirmationDate: true,
        customer: {
          select: { customerName: true, firstName: true, phone: true, contactNumbers: true, contacts: true },
        },
      },
      orderBy: { balanceAmount: 'desc' },
      take: 12,
    }),
  ]);

  const scored: CallRow[] = [];
  for (const p of pipeline) {
    const row = scorePipelineRow(p);
    if (row) scored.push(row);
  }

  const today = new Date();
  for (const p of outstanding) {
    const age = daysBetween(p.lastPaymentDate || p.confirmationDate, today);
    if (age < 14 && scored.some((s) => s.projectId === p.id)) continue;
    const balance = Math.round(Number(p.balanceAmount) || 0);
    scored.push({
      projectId: p.id,
      slNo: p.slNo,
      customerName: displayName(p.customer),
      why: `Chase payment · ${money(balance)} outstanding${age > 0 ? ` · ${age}d` : ''}`,
      stage: STATUS_LABEL[p.projectStatus] || p.projectStatus,
      stageStatus: p.projectStatus,
      phone: customerPhone(p.customer),
      value: Number(p.projectCost) || 0,
      urgency: age > 60 ? 'critical' : 'warning',
      rank: age > 60 ? 0 : 5,
    });
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.urgency !== b.urgency) return a.urgency === 'critical' ? -1 : 1;
    return b.value - a.value;
  });

  const seen = new Set<string>();
  const top: CallRow[] = [];
  for (const row of scored) {
    if (seen.has(row.projectId)) continue;
    seen.add(row.projectId);
    top.push(row);
    if (top.length >= RESULT_CAP) break;
  }

  if (top.length === 0) {
    return {
      insight:
        'Nobody is flagged to call right now — Hit List and outstanding chase are clear under your filters.',
      viz: {
        kind: 'table',
        title: 'Who to call',
        columns: [
          { key: 'who', label: 'Who' },
          { key: 'why', label: 'Why' },
          { key: 'slNo', label: 'SL' },
          { key: 'stage', label: 'Stage' },
          { key: 'value', label: 'Deal (₹)' },
        ],
        rows: [],
      },
    };
  }

  const rows: ZenithNlTableRow[] = top.map((r) => ({
    who: r.customerName,
    why: r.why,
    slNo: r.slNo,
    stage: r.stage,
    value: Math.round(r.value),
    href: `/projects?search=${encodeURIComponent(`SL ${r.slNo}`)}`,
    projectId: r.projectId,
    phone: r.phone,
    customerName: r.customerName,
    stageStatus: r.stageStatus,
  }));

  const names = top.map((r) => r.customerName).join(', ');
  return {
    insight: `Call these ${top.length} first: ${names}. Ranked from Hit List (overdue / stalled) and outstanding chase — tap a row to open the project.`,
    viz: {
      kind: 'table',
      title: 'Who to call today',
      columns: [
        { key: 'who', label: 'Who' },
        { key: 'why', label: 'Why' },
        { key: 'slNo', label: 'SL' },
        { key: 'stage', label: 'Stage' },
        { key: 'value', label: 'Deal (₹)' },
      ],
      rows,
    },
  };
}

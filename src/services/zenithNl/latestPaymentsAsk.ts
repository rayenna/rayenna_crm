/**
 * Ask Zenith — latest payments received (same events as Payment Radar).
 */
import { type Prisma, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import type { ZenithNlIntent, ZenithNlViz } from './catalog';
import { metricAllowedForRole } from './catalog';
import { projectsHrefForAskProjectIds } from './projectsHref';

const ROLES: UserRole[] = [
  UserRole.FINANCE,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.SALES,
];

const WORD_LIMITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
};

const INSTALLMENT_LABEL: Record<string, string> = {
  ADVANCE: 'Advance',
  PAYMENT_1: 'Payment 1',
  PAYMENT_2: 'Payment 2',
  PAYMENT_3: 'Payment 3',
  LAST_PAYMENT: 'Last',
};

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseLatestPaymentsLimit(question: string): number {
  const q = norm(question);
  const m =
    q.match(/\b(?:last|latest|recent)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/) ||
    q.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:latest|recent|last)\s+payments?\b/);
  if (!m?.[1]) return 5;
  const raw = m[1];
  const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : WORD_LIMITS[raw];
  if (!n || !Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(25, n));
}

/** “list the last five payments received” / “latest payments” → latest_payments_received */
export function matchLatestPaymentsIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('latest_payments_received', role)) return null;
  if (!ROLES.includes(role)) return null;
  const q = norm(question);
  if (!q || q.length < 8) return null;

  const aboutPayments =
    /\bpayments?\s+received\b/.test(q) ||
    /\breceived\s+payments?\b/.test(q) ||
    (/\bpayments?\b/.test(q) &&
      /\b(last|latest|recent|radar)\b/.test(q) &&
      !/\b(pending|outstanding|unpaid|overdue|not\s+received|haven'?t\s+received)\b/.test(q));

  if (!aboutPayments) return null;
  // Avoid stealing unpaid / outstanding lists.
  if (/\b(unpaid|outstanding|overdue|ageing|aging|not\s+(yet\s+)?paid)\b/.test(q)) return null;

  const limit = parseLatestPaymentsLimit(q);
  return {
    metric: 'latest_payments_received',
    viz: 'table',
    filters: { detailSlice: String(limit) },
    insightHints: `latest ${limit} payments received`,
  };
}

function money(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

type PaymentEvent = {
  projectId: string;
  slNo: number | null;
  customer: string;
  salesperson: string;
  amount: number;
  receivedAt: string;
  type: string;
};

export async function execLatestPaymentsReceived(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const parsed = parseInt(String(intent.filters?.detailSlice || ''), 10);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(25, parsed) : 5;

  const projects = await prisma.project.findMany({
    where: {
      ...where,
      projectCost: { gt: 0 },
      OR: [
        { advanceReceivedDate: { not: null } },
        { payment1Date: { not: null } },
        { payment2Date: { not: null } },
        { payment3Date: { not: null } },
        { lastPaymentDate: { not: null } },
      ],
    },
    select: {
      id: true,
      slNo: true,
      advanceReceived: true,
      advanceReceivedDate: true,
      payment1: true,
      payment1Date: true,
      payment2: true,
      payment2Date: true,
      payment3: true,
      payment3Date: true,
      lastPayment: true,
      lastPaymentDate: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
      customer: { select: { customerName: true, firstName: true } },
    },
    // Same cohort strategy as Payment Radar (dashboard take:40); larger take so
    // “last N by received date” is not skewed by recently touched older projects.
    orderBy: { updatedAt: 'desc' },
    take: 120,
  });

  const events: PaymentEvent[] = [];
  const push = (
    p: (typeof projects)[number],
    type: keyof typeof INSTALLMENT_LABEL,
    amount: unknown,
    date: Date | null | undefined,
  ) => {
    if (!date) return;
    const amt = Number(amount ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) return;
    events.push({
      projectId: p.id,
      slNo: typeof p.slNo === 'number' ? p.slNo : null,
      customer: p.customer?.customerName?.trim() || p.customer?.firstName?.trim() || '—',
      salesperson: p.salesperson?.name?.trim() || (p.salespersonId ? '—' : 'Unassigned'),
      amount: amt,
      receivedAt: date.toISOString(),
      type: INSTALLMENT_LABEL[type] || type,
    });
  };

  for (const p of projects) {
    push(p, 'ADVANCE', p.advanceReceived, p.advanceReceivedDate);
    push(p, 'PAYMENT_1', p.payment1, p.payment1Date);
    push(p, 'PAYMENT_2', p.payment2, p.payment2Date);
    push(p, 'PAYMENT_3', p.payment3, p.payment3Date);
    push(p, 'LAST_PAYMENT', p.lastPayment, p.lastPaymentDate);
  }

  events.sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  const rows = events.slice(0, limit);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const href = projectsHrefForAskProjectIds(rows.map((r) => r.projectId)) || undefined;

  if (rows.length === 0) {
    return {
      insight: 'No payment receipts found under your Zenith filters (same source as Payment Radar → Latest payments received).',
      viz: {
        kind: 'table',
        title: 'Latest payments received',
        columns: [
          { key: 'slNo', label: 'SL No' },
          { key: 'customer', label: 'Project' },
          { key: 'salesperson', label: 'Sales' },
          { key: 'amount', label: 'Amt (₹)' },
          { key: 'received', label: 'Received' },
          { key: 'type', label: 'Type' },
        ],
        rows: [],
      },
      projectsHref: '/zenith#zenith-payment-radar',
    };
  }

  return {
    insight: `Latest ${rows.length} payment${rows.length === 1 ? '' : 's'} received (Payment Radar): ${money(total)} total. Same receipts as Zenith → Payment radar → Latest payments received.`,
    viz: {
      kind: 'table',
      title: `Latest ${rows.length} payments received`,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Project' },
        { key: 'salesperson', label: 'Sales' },
        { key: 'amount', label: 'Amt (₹)' },
        { key: 'received', label: 'Received' },
        { key: 'type', label: 'Type' },
      ],
      rows: rows.map((r) => ({
        slNo: r.slNo,
        customer: r.customer,
        salesperson: r.salesperson,
        amount: Math.round(r.amount),
        received: formatDate(r.receivedAt),
        type: r.type,
        projectId: r.projectId,
        href: `/projects/${r.projectId}`,
      })),
    },
    projectsHref: href || '/zenith#zenith-payment-radar',
  };
}

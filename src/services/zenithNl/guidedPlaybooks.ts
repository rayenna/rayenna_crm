/**
 * Guided Ask playbooks — closed catalog packs (not free-form agents).
 * Each playbook is a chip → metric guided_playbook + detailSlice.
 */
import {
  PaymentStatus,
  ProjectStatus,
  UserRole,
  type Prisma,
} from '@prisma/client';
import prisma from '../../prisma';
import { primaryPhoneFromCustomer } from '../../utils/consumerCustomerProfile';
import {
  metricAllowedForRole,
  type ZenithNlAskSection,
  type ZenithNlIntent,
  type ZenithNlMetric,
  type ZenithNlViz,
} from './catalog';
import { projectsHrefForAskProjectIds } from './projectsHref';
import { execWhoToCall } from './whoToCallAsk';
import { execPipelineHealth } from './pipelineHealthAsk';
import { execSubsidyChasePack } from './subsidyChaseAsk';
import type { ZenithNlDateFilter } from './projectsHref';
import { execTicketQueue } from './ticketQueueAsk';

const TABLE_CAP = 20;

export type GuidedPlaybookDef = {
  id: string;
  /** Exact chip phrase. */
  ask: string;
  title: string;
  description: string;
  roles: UserRole[];
};

const ALL_ASK: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
];

const SALES_PLUS: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
];

const OPS_PLUS: UserRole[] = [
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.FINANCE,
];

/** Closed playbook catalog — grow by adding rows + chip intents, never free-form agents. */
export const GUIDED_PLAYBOOKS: GuidedPlaybookDef[] = [
  {
    id: 'chase_unpaid_under_install',
    ask: 'Chase unpaid under-install',
    title: 'Chase unpaid under-install',
    description:
      'Under-installation deals with balance due — Call / WhatsApp / Payment / Remark',
    roles: ALL_ASK,
  },
  {
    id: 'unstick_stalled_pipeline',
    ask: 'Unstick stalled pipeline',
    title: 'Unstick stalled pipeline',
    description: 'Stalled deals + who to call — work the hit list',
    roles: SALES_PLUS,
  },
  {
    id: 'chase_subsidy_credit',
    ask: 'Chase subsidy credit',
    title: 'Chase subsidy credit',
    description: 'Pending subsidy credit + docs gaps + owner + wait days',
    roles: OPS_PLUS,
  },
  {
    id: 'clear_overdue_tickets',
    ask: 'Clear overdue tickets',
    title: 'Clear overdue tickets',
    description: 'Overdue support tickets — Start / Close / Call from Ask',
    roles: [
      UserRole.SALES,
      UserRole.OPERATIONS,
      UserRole.MANAGEMENT,
      UserRole.ADMIN,
    ],
  },
];

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function playbooksForRole(role: UserRole): GuidedPlaybookDef[] {
  return GUIDED_PLAYBOOKS.filter((p) => p.roles.includes(role));
}

export function playbookAsksForRole(role: UserRole): string[] {
  return playbooksForRole(role).map((p) => p.ask);
}

export function matchGuidedPlaybookIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('guided_playbook', role)) return null;
  const q = norm(question);
  for (const pb of GUIDED_PLAYBOOKS) {
    if (!pb.roles.includes(role)) continue;
    if (norm(pb.ask) === q) {
      return {
        metric: 'guided_playbook',
        viz: 'table',
        filters: { detailSlice: pb.id },
        insightHints: pb.title,
      };
    }
  }
  // Soft paraphrases for the hero playbook
  if (
    playbooksForRole(role).some((p) => p.id === 'chase_unpaid_under_install') &&
    (/\bchase\s+unpaid\s+under[-\s]?install/.test(q) ||
      /\bunpaid\s+under[-\s]?install(ation)?\s+(chase|list|pack)\b/.test(q) ||
      /\bunder[-\s]?install(ation)?\s+.*\b(unpaid|not\s+fully\s+paid|balance)\b.*\b(chase|call)\b/.test(
        q,
      ))
  ) {
    return {
      metric: 'guided_playbook',
      viz: 'table',
      filters: { detailSlice: 'chase_unpaid_under_install' },
      insightHints: 'chase unpaid under-install',
    };
  }
  if (
    playbooksForRole(role).some((p) => p.id === 'unstick_stalled_pipeline') &&
    /\bunstick\s+stalled\b/.test(q)
  ) {
    return {
      metric: 'guided_playbook',
      viz: 'table',
      filters: { detailSlice: 'unstick_stalled_pipeline' },
      insightHints: 'unstick stalled pipeline',
    };
  }
  if (
    playbooksForRole(role).some((p) => p.id === 'clear_overdue_tickets') &&
    /\bclear\s+overdue\s+tickets?\b/.test(q)
  ) {
    return {
      metric: 'guided_playbook',
      viz: 'table',
      filters: { detailSlice: 'clear_overdue_tickets' },
      insightHints: 'clear overdue tickets',
    };
  }
  return null;
}

async function execUnpaidUnderInstallChase(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      projectStatus: ProjectStatus.UNDER_INSTALLATION,
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
      balanceAmount: { gt: 0 },
    },
    select: {
      id: true,
      slNo: true,
      projectCost: true,
      balanceAmount: true,
      paymentStatus: true,
      updatedAt: true,
      customer: {
        select: {
          customerName: true,
          firstName: true,
          phone: true,
          contactNumbers: true,
          contacts: true,
        },
      },
      salesperson: { select: { name: true } },
    },
    orderBy: [{ balanceAmount: 'desc' }, { updatedAt: 'asc' }],
    take: 80,
  });

  const rows = projects.slice(0, TABLE_CAP).map((p) => {
    const who =
      p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown';
    const phone = p.customer
      ? primaryPhoneFromCustomer(p.customer as Parameters<typeof primaryPhoneFromCustomer>[0])
      : null;
    const balance = Math.round(Number(p.balanceAmount) || 0);
    return {
      slNo: p.slNo,
      customer: who,
      owner: p.salesperson?.name?.trim() || '—',
      payment: p.paymentStatus,
      balance,
      value: Math.round(Number(p.projectCost) || 0),
      projectId: p.id,
      href: `/projects/${p.id}`,
      phone: phone || undefined,
      customerName: who,
      why: `Under-install · ₹${balance.toLocaleString('en-IN')} outstanding`,
    };
  });

  const totalBal = rows.reduce((s, r) => s + Number(r.balance || 0), 0);
  if (rows.length === 0) {
    return {
      insight:
        'No under-installation projects with outstanding balance match your filters. Playbook complete for now.',
      viz: {
        kind: 'table',
        title: 'Under-install · unpaid',
        columns: [
          { key: 'slNo', label: 'SL No' },
          { key: 'customer', label: 'Customer' },
          { key: 'owner', label: 'Owner' },
          { key: 'payment', label: 'Payment' },
          { key: 'balance', label: 'Balance (₹)' },
        ],
        rows: [],
      },
    };
  }

  return {
    insight: `Playbook step 1 — ${rows.length} under-install deal${rows.length === 1 ? '' : 's'} with ₹${totalBal.toLocaleString('en-IN')} outstanding. Call / WA, then Payment or Remark.`,
    viz: {
      kind: 'table',
      title: 'Under-install · unpaid',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'owner', label: 'Owner' },
        { key: 'payment', label: 'Payment' },
        { key: 'balance', label: 'Balance (₹)' },
      ],
      rows,
    },
    projectsHref: projectsHrefForAskProjectIds(rows.map((r) => String(r.projectId))) || undefined,
  };
}

async function runSection(
  title: string,
  metric: ZenithNlMetric,
  run: () => Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }>,
): Promise<ZenithNlAskSection> {
  const r = await run();
  return {
    metric,
    title,
    insight: r.insight,
    viz: r.viz,
    projectsHref: r.projectsHref ?? null,
  };
}

/**
 * Execute a closed playbook by detailSlice id.
 */
export async function execGuidedPlaybook(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
  ctx: { userId: string; role: UserRole; dateFilter: ZenithNlDateFilter },
): Promise<{
  viz: ZenithNlViz;
  insight: string;
  sections: ZenithNlAskSection[];
  projectsHref?: string;
}> {
  const slice = (intent.filters?.detailSlice || '').trim() || 'chase_unpaid_under_install';
  const def = GUIDED_PLAYBOOKS.find((p) => p.id === slice);
  const sections: ZenithNlAskSection[] = [];

  if (slice === 'chase_unpaid_under_install') {
    sections.push(
      await runSection('Under-install · unpaid', 'guided_playbook', () =>
        execUnpaidUnderInstallChase(where),
      ),
    );
    if (metricAllowedForRole('who_to_call', ctx.role)) {
      sections.push(
        await runSection('Who to call next', 'who_to_call', () => execWhoToCall(where)),
      );
    }
  } else if (slice === 'unstick_stalled_pipeline') {
    sections.push(
      await runSection('Stalled pipeline', 'pipeline_health', () =>
        execPipelineHealth(
          {
            metric: 'pipeline_health',
            viz: 'table',
            filters: { detailSlice: 'stalled' },
          },
          where,
        ),
      ),
    );
    if (metricAllowedForRole('who_to_call', ctx.role)) {
      sections.push(
        await runSection('Who to call', 'who_to_call', () => execWhoToCall(where)),
      );
    }
  } else if (slice === 'chase_subsidy_credit') {
    sections.push(
      await runSection('Subsidy chase', 'subsidy_chase_pack', () =>
        execSubsidyChasePack(where),
      ),
    );
  } else if (slice === 'clear_overdue_tickets') {
    sections.push(
      await runSection('Overdue tickets', 'support_tickets_summary', () =>
        execTicketQueue(
          {
            metric: 'support_tickets_summary',
            viz: 'table',
            filters: { detailSlice: 'overdue' },
          },
          {
            userId: ctx.userId,
            role: ctx.role,
            dateFilter: ctx.dateFilter,
          },
        ),
      ),
    );
  } else {
    sections.push(
      await runSection('Under-install · unpaid', 'guided_playbook', () =>
        execUnpaidUnderInstallChase(where),
      ),
    );
  }

  const packed = sections.slice(0, 3);
  const first = packed[0];
  const title = def?.title || 'Guided playbook';
  const insight = packed.length
    ? `Guided playbook · ${title}: ${packed.map((s) => s.title).join(' → ')}. Work each block — not a free-form agent.`
    : `Playbook “${title}” has no steps for your role.`;

  return {
    insight,
    viz: first?.viz ?? {
      kind: 'table',
      title,
      columns: [{ key: 'label', label: 'Step' }],
      rows: [],
    },
    sections: packed,
    projectsHref: first?.projectsHref || undefined,
  };
}

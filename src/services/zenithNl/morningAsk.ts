/**
 * Ask Zenith — role morning brief: stacks 2–3 metrics into one answer.
 */
import { UserRole, type Prisma } from '@prisma/client';
import type { ZenithNlIntent, ZenithNlMetric, ZenithNlViz } from './catalog';
import { metricAllowedForRole } from './catalog';
import { execWhoToCall } from './whoToCallAsk';
import { execPipelineHealth } from './pipelineHealthAsk';
import { execLatestPaymentsReceived } from './latestPaymentsAsk';
import { execSubsidyChasePack } from './subsidyChaseAsk';
import { execTicketQueue } from './ticketQueueAsk';
import type { ZenithNlDateFilter } from './projectsHref';

export type ZenithNlAskSection = {
  metric: ZenithNlMetric;
  title: string;
  insight: string;
  viz: ZenithNlViz;
  projectsHref?: string | null;
};

function stalledIntent(): ZenithNlIntent {
  return {
    metric: 'pipeline_health',
    viz: 'table',
    filters: { detailSlice: 'stalled' },
    insightHints: 'stalled pipeline',
  };
}

function paymentsIntent(): ZenithNlIntent {
  return {
    metric: 'latest_payments_received',
    viz: 'table',
    filters: { detailSlice: '5' },
    insightHints: 'latest payments',
  };
}

function ticketOverdueIntent(): ZenithNlIntent {
  return {
    metric: 'support_tickets_summary',
    viz: 'table',
    filters: { detailSlice: 'overdue' },
    insightHints: 'overdue tickets',
  };
}

export function matchMorningBriefIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('morning_brief', role)) return null;
  const q = question.trim().toLowerCase().replace(/\s+/g, ' ');
  // Leave Help/FAQ wording to help_lookup (“What are Ask playbooks and Morning Ask?”).
  if (/^(what|how|where|why|who|can|does|do)\b/.test(q) && /\?$/.test(q.trim())) {
    return null;
  }
  if (
    /\b(my\s+)?morning\s+(ask|brief|stack|pack)\b/.test(q) ||
    /\bstart\s+(my\s+)?day\b/.test(q) ||
    /\bmorning\s+(checklist|priorities|focus)\b/.test(q) ||
    q === 'my morning ask' ||
    q === 'morning ask'
  ) {
    return {
      metric: 'morning_brief',
      viz: 'table',
      insightHints: 'morning brief',
    };
  }
  return null;
}

async function runSection(
  label: string,
  metric: ZenithNlMetric,
  run: () => Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }>,
): Promise<ZenithNlAskSection> {
  const r = await run();
  return {
    metric,
    title: label,
    insight: r.insight,
    viz: r.viz,
    projectsHref: r.projectsHref ?? null,
  };
}

/**
 * Role stacks:
 * - Sales / Mgmt / Admin: who-to-call + stalled + latest payments
 * - Operations: who-to-call + subsidy chase + overdue tickets
 * - Finance: latest payments + who-to-call (collections nudge)
 */
export async function execMorningBrief(
  where: Prisma.ProjectWhereInput,
  ctx: { userId: string; role: UserRole; dateFilter: ZenithNlDateFilter },
): Promise<{
  viz: ZenithNlViz;
  insight: string;
  sections: ZenithNlAskSection[];
  projectsHref?: string;
}> {
  const sections: ZenithNlAskSection[] = [];
  const role = ctx.role;

  if (metricAllowedForRole('who_to_call', role)) {
    sections.push(
      await runSection('Who to call', 'who_to_call', () => execWhoToCall(where)),
    );
  }

  if (
    (role === UserRole.SALES || role === UserRole.MANAGEMENT || role === UserRole.ADMIN) &&
    metricAllowedForRole('pipeline_health', role)
  ) {
    sections.push(
      await runSection('Stalled pipeline', 'pipeline_health', () =>
        execPipelineHealth(stalledIntent(), where),
      ),
    );
  }

  if (
    (role === UserRole.SALES ||
      role === UserRole.MANAGEMENT ||
      role === UserRole.ADMIN ||
      role === UserRole.FINANCE) &&
    metricAllowedForRole('latest_payments_received', role)
  ) {
    sections.push(
      await runSection('Latest payments', 'latest_payments_received', () =>
        execLatestPaymentsReceived(where, paymentsIntent()),
      ),
    );
  }

  if (role === UserRole.OPERATIONS && metricAllowedForRole('subsidy_chase_pack', role)) {
    sections.push(
      await runSection('Subsidy chase', 'subsidy_chase_pack', () =>
        execSubsidyChasePack(where),
      ),
    );
  }

  if (
    (role === UserRole.OPERATIONS || role === UserRole.ADMIN || role === UserRole.MANAGEMENT) &&
    metricAllowedForRole('support_tickets_summary', role) &&
    sections.length < 3
  ) {
    sections.push(
      await runSection('Overdue tickets', 'support_tickets_summary', () =>
        execTicketQueue(ticketOverdueIntent(), {
          userId: ctx.userId,
          role: ctx.role,
          dateFilter: ctx.dateFilter,
        }),
      ),
    );
  }

  const packed = sections.slice(0, 3);
  const titles = packed.map((s) => s.title).join(' · ');
  const first = packed[0];
  const insight = packed.length
    ? `Morning Ask (${role}): ${titles}. Act from each block — Call / WA / Remark / Payment / Ticket.`
    : 'Morning Ask has no metrics available for your role.';

  return {
    insight,
    viz: first?.viz ?? {
      kind: 'table',
      title: 'Morning Ask',
      columns: [{ key: 'label', label: 'Item' }],
      rows: [],
    },
    sections: packed,
    projectsHref: first?.projectsHref || undefined,
  };
}

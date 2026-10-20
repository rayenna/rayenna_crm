/**
 * Ask Zenith — open / overdue / oldest / mine support-ticket queue (one row per ticket).
 */
import { SupportTicketStatus, type Prisma, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { isSupportTicketOverdue } from '../../utils/supportTicketQueue';
import { primaryPhoneFromCustomer } from '../../utils/consumerCustomerProfile';
import type { ZenithNlIntent, ZenithNlTableRow, ZenithNlViz } from './catalog';
import { supportTicketCreatedAtWhere } from './ticketDateFilter';
import type { ZenithNlDateFilter } from './projectsHref';

const TABLE_CAP = 12;

function daysOld(createdAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86400000));
}

function displayName(c: { customerName?: string | null; firstName?: string | null } | null): string {
  return c?.firstName?.trim() || c?.customerName?.trim() || 'Unknown';
}

export function ticketQueueSlice(intent: ZenithNlIntent): 'oldest' | 'overdue' | 'mine' | 'queue' | null {
  const slice = (intent.filters?.detailSlice || '').toLowerCase();
  if (slice === 'oldest' || slice === 'overdue' || slice === 'mine' || slice === 'queue') {
    return slice;
  }
  if (intent.viz === 'table' && intent.metric === 'support_tickets_summary') return 'queue';
  return null;
}

export async function execTicketQueue(
  intent: ZenithNlIntent,
  ctx: { userId: string; role: UserRole; dateFilter: ZenithNlDateFilter },
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const slice = ticketQueueSlice(intent) || 'queue';
  const now = new Date();
  const ticketWhere: Prisma.SupportTicketWhereInput = {
    status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] },
    ...supportTicketCreatedAtWhere(ctx.dateFilter),
  };
  if (ctx.role === UserRole.SALES) {
    ticketWhere.project = { salespersonId: ctx.userId };
  }
  if (slice === 'mine') {
    ticketWhere.createdById = ctx.userId;
  }

  const tickets = await prisma.supportTicket.findMany({
    where: ticketWhere,
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      source: true,
      createdAt: true,
      projectId: true,
      createdBy: { select: { name: true } },
      project: {
        select: {
          slNo: true,
          customer: {
            select: {
              firstName: true,
              customerName: true,
              phone: true,
              contactNumbers: true,
              contacts: true,
            },
          },
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, followUpDate: true },
      },
    },
    take: 80,
  });

  type Row = {
    age: number;
    overdue: boolean;
    row: ZenithNlTableRow;
  };
  const scored: Row[] = tickets.map((t) => {
    const overdue = isSupportTicketOverdue(t, now);
    const customer = displayName(t.project.customer);
    const phone = t.project.customer
      ? primaryPhoneFromCustomer(t.project.customer as Parameters<typeof primaryPhoneFromCustomer>[0])
      : null;
    return {
      age: daysOld(t.createdAt, now),
      overdue,
      row: {
        ticket: t.ticketNumber,
        who: customer,
        title: t.title.slice(0, 80),
        age: daysOld(t.createdAt, now),
        owner: t.createdBy?.name?.trim() || '—',
        sla: overdue ? 'Overdue' : 'On track',
        href: `/support-tickets?q=${encodeURIComponent(t.ticketNumber)}`,
        projectId: t.projectId,
        slNo: t.project.slNo,
        phone: phone || undefined,
        ticketId: t.id,
        customerName: customer,
      },
    };
  });

  let filtered = scored;
  if (slice === 'overdue') filtered = scored.filter((s) => s.overdue);
  filtered.sort((a, b) => {
    if (slice === 'oldest') return b.age - a.age;
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return b.age - a.age;
  });
  const top = filtered.slice(0, TABLE_CAP);

  const href = slice === 'overdue' ? '/support-tickets?filter=overdue' : '/support-tickets';
  if (top.length === 0) {
    const empty =
      slice === 'overdue'
        ? 'No overdue tickets in your book.'
        : slice === 'mine'
          ? 'No open tickets you created.'
          : 'No open tickets in your book.';
    return {
      insight: `${empty} Create a ticket from Ask if something needs a follow-up.`,
      viz: {
        kind: 'table',
        title: slice === 'overdue' ? 'Overdue tickets' : 'Open ticket queue',
        columns: [
          { key: 'ticket', label: 'Ticket' },
          { key: 'who', label: 'Customer' },
          { key: 'title', label: 'Issue' },
          { key: 'age', label: 'Age (d)' },
          { key: 'owner', label: 'Opened by' },
          { key: 'sla', label: 'SLA' },
        ],
        rows: [],
      },
      projectsHref: href,
    };
  }

  const oldest = top[0];
  const insight =
    slice === 'oldest'
      ? `Oldest open ticket: ${oldest.row.ticket} for ${oldest.row.who} (${oldest.age}d). ${top.length} in queue.`
      : slice === 'overdue'
        ? `${top.length} overdue ticket${top.length === 1 ? '' : 's'} — oldest ${oldest.age}d (${oldest.row.who}).`
        : `${top.length} open ticket${top.length === 1 ? '' : 's'} in queue. Oldest: ${oldest.row.ticket} · ${oldest.row.who} · ${oldest.age}d.`;

  return {
    insight,
    viz: {
      kind: 'table',
      title: slice === 'overdue' ? 'Overdue ticket queue' : 'Open ticket queue',
      columns: [
        { key: 'ticket', label: 'Ticket' },
        { key: 'who', label: 'Customer' },
        { key: 'title', label: 'Issue' },
        { key: 'age', label: 'Age (d)' },
        { key: 'owner', label: 'Opened by' },
        { key: 'sla', label: 'SLA' },
      ],
      rows: top.map((s) => s.row),
    },
    projectsHref: href,
  };
}

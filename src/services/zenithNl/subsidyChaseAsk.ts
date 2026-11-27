/**
 * Ask Zenith — Subsidy chase pack: pending credit + docs gaps + owner + days waiting.
 */
import { ProjectStatus, ProjectType, type Prisma, type UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { primaryPhoneFromCustomer } from '../../utils/consumerCustomerProfile';
import { metricAllowedForRole, type ZenithNlIntent, type ZenithNlViz } from './catalog';
import { projectsHrefForAskProjectIds } from './projectsHref';

const TABLE_CAP = 25;

function daysSince(d: Date | null | undefined, now: Date): number | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function docsGapLabel(docCategories: string[]): string {
  const set = new Set(docCategories.map((c) => String(c || '').toLowerCase()));
  const missing: string[] = [];
  if (![...set].some((c) => c.includes('kseb'))) missing.push('KSEB');
  if (![...set].some((c) => c.includes('mnre'))) missing.push('MNRE');
  if (![...set].some((c) => c.includes('agreement') || c.includes('contract'))) {
    missing.push('Agreement');
  }
  if (docCategories.length === 0) return 'No docs';
  if (missing.length === 0) return 'Docs OK';
  return `Missing ${missing.join('/')}`;
}

/**
 * Chase list for subsidy credit: completed / submitted subsidy jobs awaiting credit,
 * with owner, wait days, and document gaps for Call / WA / Remark.
 */
export async function execSubsidyChasePack(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const now = new Date();
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      type: ProjectType.SUBSIDY,
      subsidyCreditedDate: null,
      projectStatus: {
        in: [ProjectStatus.COMPLETED, ProjectStatus.SUBMITTED_FOR_SUBSIDY],
      },
    },
    select: {
      id: true,
      slNo: true,
      projectCost: true,
      projectStatus: true,
      subsidyRequestDate: true,
      installationCompletionDate: true,
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
      opsPerson: { select: { name: true } },
      documents: { select: { category: true }, take: 40 },
    },
    orderBy: [{ subsidyRequestDate: 'asc' }, { updatedAt: 'asc' }],
    take: 120,
  });

  const chase = projects
    .map((p) => {
      const waitFrom = p.subsidyRequestDate || p.installationCompletionDate || p.updatedAt;
      const days = daysSince(waitFrom, now);
      const owner =
        p.opsPerson?.name?.trim() || p.salesperson?.name?.trim() || 'Unassigned';
      const who =
        p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown';
      const phone = p.customer
        ? primaryPhoneFromCustomer(p.customer as Parameters<typeof primaryPhoneFromCustomer>[0])
        : null;
      const docs = docsGapLabel(p.documents.map((d) => d.category || ''));
      const priority =
        (docs.startsWith('Missing') || docs === 'No docs' ? 2 : 0) +
        (days != null && days >= 21 ? 2 : days != null && days >= 7 ? 1 : 0);
      return {
        priority,
        days: days ?? 999,
        row: {
          slNo: p.slNo,
          customer: who,
          owner,
          days: days ?? '—',
          docs,
          status: p.projectStatus,
          value: Math.round(Number(p.projectCost) || 0),
          projectId: p.id,
          href: `/projects/${p.id}`,
          phone: phone || undefined,
          customerName: who,
          why: `Subsidy chase · ${docs} · ${days != null ? `${days}d waiting` : 'waiting'}`,
        },
      };
    })
    .sort((a, b) => b.priority - a.priority || a.days - b.days)
    .slice(0, TABLE_CAP);

  const ids = chase.map((c) => String(c.row.projectId));
  const docsGapCount = chase.filter((c) => String(c.row.docs).startsWith('Missing') || c.row.docs === 'No docs')
    .length;
  const avgWait =
    chase.length > 0
      ? Math.round(
          chase.reduce((s, c) => s + (typeof c.row.days === 'number' ? c.row.days : 0), 0) /
            chase.length,
        )
      : 0;

  if (chase.length === 0) {
    return {
      insight:
        'No subsidy chase items match your filters (completed / submitted awaiting credit).',
      viz: {
        kind: 'table',
        title: 'Subsidy chase pack',
        columns: [
          { key: 'slNo', label: 'SL No' },
          { key: 'customer', label: 'Customer' },
          { key: 'owner', label: 'Owner' },
          { key: 'days', label: 'Days waiting' },
          { key: 'docs', label: 'Docs' },
          { key: 'value', label: 'Order (₹)' },
        ],
        rows: [],
      },
    };
  }

  return {
    insight: `Subsidy chase: ${chase.length} deal${chase.length === 1 ? '' : 's'} · ${docsGapCount} with doc gaps · avg ${avgWait}d waiting. Use Call / WhatsApp / Remark on each row.`,
    viz: {
      kind: 'table',
      title: 'Subsidy chase pack',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'owner', label: 'Owner' },
        { key: 'days', label: 'Days waiting' },
        { key: 'docs', label: 'Docs' },
        { key: 'value', label: 'Order (₹)' },
      ],
      rows: chase.map((c) => c.row),
    },
    projectsHref: projectsHrefForAskProjectIds(ids) || undefined,
  };
}

export function matchSubsidyChaseIntent(
  question: string,
  role?: UserRole,
): ZenithNlIntent | null {
  const q = question.trim().toLowerCase().replace(/\s+/g, ' ');
  const hit =
    /\bsubsidy\s+chase\b/.test(q) ||
    /\bchase\s+(pack|list|subsidy)\b/.test(q) ||
    /\bsubsidy\s+(follow[-\s]?ups?|pipeline\s+chase)\b/.test(q) ||
    /\b(pending\s+subsidy|awaiting\s+subsidy)\b.*\b(docs?|owner|chase|call)\b/.test(q);
  if (!hit) return null;
  if (role && !metricAllowedForRole('subsidy_chase_pack', role)) return null;
  return {
    metric: 'subsidy_chase_pack',
    viz: 'table',
    insightHints: 'subsidy chase',
  };
}

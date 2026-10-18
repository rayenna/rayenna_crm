/**
 * Ask Zenith — write/edit navigation (resolve project/customer → edit/detail href).
 * Does not mutate CRM data; opens the form the user needs.
 */
import { UserRole } from '@prisma/client';
import prisma from '../../prisma';
import {
  actionAllowedForRole,
  type ZenithAskActionMatch,
  type ZenithAskActionId,
} from './askActions';

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseSlNo(q: string): number | null {
  const m =
    q.match(/\b(?:sl\s*no\.?|sl\.?|project\s*#|#)\s*(\d{1,8})\b/) ||
    q.match(/\b(?:for|on|of)\s+(?:project\s+)?(?:sl\s*)?(\d{1,6})\b/);
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

async function projectEditHref(slNo: number, focus?: string): Promise<string | null> {
  const p = await prisma.project.findFirst({
    where: { slNo },
    select: { id: true },
  });
  if (!p) return null;
  const qs = focus ? `?focus=${encodeURIComponent(focus)}` : '';
  return `/projects/${p.id}/edit${qs}`;
}

async function projectDetailHref(slNo: number, focus?: string): Promise<string | null> {
  const p = await prisma.project.findFirst({
    where: { slNo },
    select: { id: true },
  });
  if (!p) return null;
  const qs = focus ? `?focus=${encodeURIComponent(focus)}` : '';
  return `/projects/${p.id}${qs}`;
}

function build(
  action: ZenithAskActionId,
  href: string,
  label: string,
  message: string,
): ZenithAskActionMatch {
  return { action, label, href, message, autoNavigate: true };
}

/**
 * Match update-payment / change-status / assign-ops / add-remark / edit-customer.
 * Runs after sync create/nav actions; before analytics.
 */
export async function matchAskEditActionIntent(
  question: string,
  role: UserRole,
): Promise<ZenithAskActionMatch | null> {
  const q = norm(question);
  if (!q || q.length < 6) return null;

  // Update payment for SL …
  if (
    /\b(update|edit|enter|record|add)\b/.test(q) &&
    /\b(payment|advance|p[123]|collections?)\b/.test(q)
  ) {
    if (!actionAllowedForRole('edit_project_payment', role)) return null;
    const sl = parseSlNo(q);
    if (!sl) {
      return build(
        'edit_project_payment',
        '/projects',
        'Update payment',
        'Open a project (or ask “update payment for SL 123”) to edit payments.',
      );
    }
    const href = await projectEditHref(sl, 'payment');
    if (!href) {
      return build(
        'edit_project_payment',
        `/projects?search=${sl}`,
        'Update payment',
        `No project found for SL ${sl}.`,
      );
    }
    return build(
      'edit_project_payment',
      href,
      'Update payment',
      `Opening SL ${sl} to update payment…`,
    );
  }

  // Change / update status for SL …
  if (
    /\b(change|update|set|mark)\b/.test(q) &&
    /\b(status|stage)\b/.test(q) &&
    !/\b(sla|indicator|payment\s+status)\b/.test(q)
  ) {
    if (!actionAllowedForRole('edit_project_status', role)) return null;
    const sl = parseSlNo(q);
    if (!sl) {
      return build(
        'edit_project_status',
        '/projects',
        'Update status',
        'Ask “change status of SL 123” to open that project’s edit form.',
      );
    }
    const href = await projectEditHref(sl, 'status');
    if (!href) {
      return build(
        'edit_project_status',
        `/projects?search=${sl}`,
        'Update status',
        `No project found for SL ${sl}.`,
      );
    }
    return build(
      'edit_project_status',
      href,
      'Update status',
      `Opening SL ${sl} to update status…`,
    );
  }

  // Assign ops … to SL …
  if (/\b(assign|reassign)\b/.test(q) && /\bops\b/.test(q)) {
    if (!actionAllowedForRole('assign_project_ops', role)) return null;
    const sl = parseSlNo(q);
    if (!sl) {
      return build(
        'assign_project_ops',
        '/projects',
        'Assign ops',
        'Ask “assign ops to SL 123” to open that project’s edit form.',
      );
    }
    const href = await projectEditHref(sl, 'ops');
    if (!href) {
      return build(
        'assign_project_ops',
        `/projects?search=${sl}`,
        'Assign ops',
        `No project found for SL ${sl}.`,
      );
    }
    return build(
      'assign_project_ops',
      href,
      'Assign ops',
      `Opening SL ${sl} to assign ops…`,
    );
  }

  // Add remark / note to SL …
  if (
    /\b(add|write|post)\b/.test(q) &&
    /\b(remark|note|comment)\b/.test(q) &&
    !/\b(list|show|all|projects?\s+with)\b/.test(q)
  ) {
    if (!actionAllowedForRole('add_project_remark', role)) return null;
    const sl = parseSlNo(q);
    if (!sl) {
      return build(
        'add_project_remark',
        '/projects',
        'Add remark',
        'Ask “add remark to SL 123” to open that project.',
      );
    }
    const href = await projectDetailHref(sl, 'remarks');
    if (!href) {
      return build(
        'add_project_remark',
        `/projects?search=${sl}`,
        'Add remark',
        `No project found for SL ${sl}.`,
      );
    }
    return build(
      'add_project_remark',
      href,
      'Add remark',
      `Opening SL ${sl} to add a remark…`,
    );
  }

  // Edit / update customer …
  if (
    /\b(edit|update)\b/.test(q) &&
    /\bcustomer\b/.test(q) &&
    !/\b(new|create)\b/.test(q)
  ) {
    if (!actionAllowedForRole('edit_customer', role)) return null;
    const name =
      q.match(/\b(?:edit|update)\s+customer\s+([a-z0-9][a-z0-9.\s'-]{1,40})$/)?.[1]?.trim() ||
      q.match(/\bcustomer\s+([a-z0-9][a-z0-9.\s'-]{1,40})\s+(?:edit|update)\b/)?.[1]?.trim();
    if (!name || /^(the|a|an|my|details?)$/.test(name)) {
      return build(
        'edit_customer',
        '/customers',
        'Edit customer',
        'Ask “edit customer Ramesh” or open Customers to edit.',
      );
    }
    const c = await prisma.customer.findFirst({
      where: {
        OR: [
          { customerId: { equals: name, mode: 'insensitive' } },
          { customerName: { contains: name, mode: 'insensitive' } },
          { firstName: { contains: name, mode: 'insensitive' } },
        ],
      },
      select: { id: true, customerName: true, firstName: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!c) {
      return build(
        'edit_customer',
        `/customers?q=${encodeURIComponent(name)}`,
        'Edit customer',
        `No customer found for “${name}”.`,
      );
    }
    return build(
      'edit_customer',
      `/customers/${c.id}`,
      'Edit customer',
      `Opening ${c.firstName || c.customerName || 'customer'}…`,
    );
  }

  return null;
}

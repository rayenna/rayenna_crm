import { UserRole } from '@prisma/client';
import prisma from '../../prisma';

export type LiveAskBook = {
  customerName: string | null;
  slNo: number | null;
};

function pickName(c: { firstName?: string | null; customerName?: string | null } | null): string | null {
  const first = c?.firstName?.trim();
  if (first && first.length >= 2 && !/^unknown$/i.test(first)) return first.split(/\s+/)[0] || first;
  const full = c?.customerName?.trim();
  if (!full) return null;
  const token = full.split(/\s+/)[0] || full;
  if (token.length < 2 || /^unknown$/i.test(token) || /^ramesh$/i.test(token)) return null;
  return token;
}

/** A real customer / SL from this user's book for example chips and did-you-mean. */
export async function loadLiveAskBook(userId: string, role: UserRole): Promise<LiveAskBook> {
  const where = role === UserRole.SALES ? { salespersonId: userId } : {};
  const project = await prisma.project.findFirst({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      slNo: true,
      customer: { select: { firstName: true, customerName: true } },
    },
  });
  if (project) {
    return {
      customerName: pickName(project.customer),
      slNo: project.slNo ?? null,
    };
  }
  const customerWhere = role === UserRole.SALES ? { salespersonId: userId } : {};
  const customer = await prisma.customer.findFirst({
    where: customerWhere,
    orderBy: { updatedAt: 'desc' },
    select: { firstName: true, customerName: true },
  });
  return { customerName: pickName(customer), slNo: null };
}

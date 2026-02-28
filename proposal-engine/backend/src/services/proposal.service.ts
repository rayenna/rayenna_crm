import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateProposalInput {
  customerName: string;
  systemSizeKw: number;
  location: string;
  tariff: number;
}

export interface CostingSummary {
  totalQuantity: number;
  totalCost: number;
  marginPercent: number;       // placeholder — set via env or hardcoded default
  marginAmount: number;        // totalCost * marginPercent / 100
  grandTotal: number;          // totalCost + marginAmount
  byCategory: Record<string, { quantity: number; cost: number }>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DEFAULT_MARGIN_PERCENT = Number(process.env.DEFAULT_MARGIN_PERCENT ?? 15);

function buildCostingSummary(
  costingItems: Array<{
    category: string;
    quantity: number;
    totalCost: number;
  }>
): CostingSummary {
  let totalQuantity = 0;
  let totalCost = 0;
  const byCategory: Record<string, { quantity: number; cost: number }> = {};

  for (const item of costingItems) {
    totalQuantity += item.quantity;
    totalCost += item.totalCost;

    if (!byCategory[item.category]) {
      byCategory[item.category] = { quantity: 0, cost: 0 };
    }
    byCategory[item.category].quantity += item.quantity;
    byCategory[item.category].cost += item.totalCost;
  }

  // Round to 2 decimal places throughout
  totalCost = Math.round(totalCost * 100) / 100;

  const marginAmount = Math.round(totalCost * DEFAULT_MARGIN_PERCENT) / 100;
  const grandTotal = Math.round((totalCost + marginAmount) * 100) / 100;

  // Round category costs
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].cost = Math.round(byCategory[cat].cost * 100) / 100;
    byCategory[cat].quantity = Math.round(byCategory[cat].quantity * 1000) / 1000;
  }

  return {
    totalQuantity: Math.round(totalQuantity * 1000) / 1000,
    totalCost,
    marginPercent: DEFAULT_MARGIN_PERCENT,
    marginAmount,
    grandTotal,
    byCategory,
  };
}

// ─────────────────────────────────────────────
// Service functions
// ─────────────────────────────────────────────

export async function createProposal(input: CreateProposalInput) {
  const proposal = await prisma.proposal.create({
    data: {
      customerName: input.customerName,
      systemSizeKw: input.systemSizeKw,
      location: input.location,
      tariff: input.tariff,
    },
  });
  return proposal;
}

export async function getProposalWithCosting(id: number) {
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      costingItems: {
        orderBy: { id: 'asc' },
      },
      bomItems: true,
      roi: true,
    },
  });

  if (!proposal) return null;

  const summary = buildCostingSummary(proposal.costingItems);

  return { proposal, summary };
}

export async function listProposals() {
  return prisma.proposal.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteProposal(id: number) {
  return prisma.proposal.delete({ where: { id } });
}

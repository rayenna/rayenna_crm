import { prisma } from '../lib/prisma';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type CostingCategory =
  | 'module'
  | 'inverter'
  | 'structure'
  | 'cable'
  | 'labour'
  | 'misc';

const VALID_CATEGORIES: CostingCategory[] = [
  'module',
  'inverter',
  'structure',
  'cable',
  'labour',
  'misc',
];

export interface AddCostingItemInput {
  proposalId: number;
  category: CostingCategory;
  itemName: string;
  quantity: number;
  unitCost: number;
}

export interface AddCostingItemResult {
  item: {
    id: number;
    proposalId: number;
    category: string;
    itemName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  };
}

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

export function validateCostingItemInput(body: Partial<AddCostingItemInput>): string | null {
  if (!body.proposalId || typeof body.proposalId !== 'number') {
    return 'proposalId must be a number';
  }
  if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
    return `category must be one of: ${VALID_CATEGORIES.join(', ')}`;
  }
  if (!body.itemName || typeof body.itemName !== 'string' || body.itemName.trim() === '') {
    return 'itemName is required';
  }
  if (body.quantity == null || body.quantity <= 0) {
    return 'quantity must be a positive number';
  }
  if (body.unitCost == null || body.unitCost < 0) {
    return 'unitCost must be >= 0';
  }
  return null;
}

// ─────────────────────────────────────────────
// Service functions
// ─────────────────────────────────────────────

export async function addCostingItem(input: AddCostingItemInput): Promise<AddCostingItemResult> {
  // Verify the proposal exists before inserting
  const proposal = await prisma.proposal.findUnique({
    where: { id: input.proposalId },
    select: { id: true },
  });
  if (!proposal) {
    throw new Error(`Proposal ${input.proposalId} not found`);
  }

  // Derive totalCost — quantity × unitCost, rounded to 2 dp
  const totalCost = Math.round(input.quantity * input.unitCost * 100) / 100;

  const item = await prisma.costingItem.create({
    data: {
      proposalId: input.proposalId,
      category: input.category,
      itemName: input.itemName.trim(),
      quantity: input.quantity,
      unitCost: input.unitCost,
      totalCost,
    },
  });

  return { item };
}

export async function getCostingItemsByProposal(proposalId: number) {
  return prisma.costingItem.findMany({
    where: { proposalId },
    orderBy: { id: 'asc' },
  });
}

export async function deleteCostingItem(id: number) {
  return prisma.costingItem.delete({ where: { id } });
}

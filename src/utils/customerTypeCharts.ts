import type { Prisma } from '@prisma/client';
import prisma from '../prisma';

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Residential',
  APARTMENT: 'Apartment',
  COMMERCIAL: 'Commercial',
};

const CUSTOMER_TYPE_ORDER = ['RESIDENTIAL', 'APARTMENT', 'COMMERCIAL'] as const;

export function getCustomerTypeChartLabel(customerType: string | null | undefined): string {
  if (!customerType) return CUSTOMER_TYPE_LABELS.RESIDENTIAL;
  return CUSTOMER_TYPE_LABELS[customerType] ?? customerType.replace(/_/g, ' ');
}

export type CustomerTypeChartSlice = {
  type: string;
  label: string;
  value: number;
  count: number;
  percentage?: string;
};

/** Sum order value grouped by linked customer’s Customer Master type. */
export async function aggregateProjectsByCustomerType(
  where: Prisma.ProjectWhereInput,
): Promise<CustomerTypeChartSlice[]> {
  const rows = await prisma.project.findMany({
    where,
    select: {
      projectCost: true,
      customer: { select: { customerType: true } },
    },
  });

  const map = new Map<string, { value: number; count: number }>();
  for (const row of rows) {
    const ct = row.customer?.customerType ?? 'RESIDENTIAL';
    const cur = map.get(ct) ?? { value: 0, count: 0 };
    cur.value += Number(row.projectCost) || 0;
    cur.count += 1;
    map.set(ct, cur);
  }

  const slices: CustomerTypeChartSlice[] = [];
  for (const ct of CUSTOMER_TYPE_ORDER) {
    const agg = map.get(ct);
    if (agg && agg.count > 0) {
      slices.push({
        type: ct,
        label: getCustomerTypeChartLabel(ct),
        value: agg.value,
        count: agg.count,
      });
    }
  }
  for (const [ct, agg] of map) {
    if (!CUSTOMER_TYPE_ORDER.includes(ct as (typeof CUSTOMER_TYPE_ORDER)[number]) && agg.count > 0) {
      slices.push({
        type: ct,
        label: getCustomerTypeChartLabel(ct),
        value: agg.value,
        count: agg.count,
      });
    }
  }
  return slices;
}

export function withChartPercentages(items: CustomerTypeChartSlice[]): CustomerTypeChartSlice[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map((item) => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
  }));
}

/** Zenith explorer + forecast: label from customer type on project. */
export function formatCustomerTypeForExplorer(
  customerType: string | null | undefined,
): string {
  return getCustomerTypeChartLabel(customerType);
}

const VALID_CUSTOMER_TYPES = new Set<string>(CUSTOMER_TYPE_ORDER);

/**
 * Prisma `where` clause for Projects list / export — matches donut chart cohorts.
 * Null `customerType` on Customer Master counts as Residential (same as `aggregateProjectsByCustomerType`).
 */
export function buildProjectsListCustomerTypeWhere(types: string[]): object | null {
  const valid = types.filter((t) => VALID_CUSTOMER_TYPES.has(t));
  if (valid.length === 0) return null;

  const branches: object[] = [];
  const nonResidential = valid.filter((t) => t !== 'RESIDENTIAL');
  if (nonResidential.length > 0) {
    branches.push({ customer: { customerType: { in: nonResidential } } });
  }
  if (valid.includes('RESIDENTIAL')) {
    branches.push({
      OR: [{ customer: { customerType: 'RESIDENTIAL' } }, { customer: { customerType: null } }],
    });
  }
  if (branches.length === 1) return branches[0]!;
  return { OR: branches };
}

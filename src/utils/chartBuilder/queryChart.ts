import {
  CustomerType,
  LeadSource,
  Prisma,
  ProjectStage,
  ProjectStatus,
  SystemType,
} from '@prisma/client';
import prisma from '../../prisma';
import { istMonthBoundsForFyMonth } from '../istCalendar';
import { capacityBandForKw, CAPACITY_BANDS } from '../../services/zenithNl/dimensionFilters';
import type {
  ChartBuilderDateFilters,
  ChartBuilderDimensionId,
  ChartBuilderMeasureId,
  ChartBuilderSpec,
} from './catalog';

const QUARTER_TO_MONTHS: Record<string, string[]> = {
  Q1: ['4', '5', '6'],
  Q2: ['7', '8', '9'],
  Q3: ['10', '11', '12'],
  Q4: ['1', '2', '3'],
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.LEAD]: 'Lead',
  [ProjectStatus.SITE_SURVEY]: 'Site Survey',
  [ProjectStatus.PROPOSAL]: 'Proposal',
  [ProjectStatus.CONFIRMED]: 'Confirmed Order',
  [ProjectStatus.UNDER_INSTALLATION]: 'Under Installation',
  [ProjectStatus.SUBMITTED_FOR_SUBSIDY]: 'Submitted for Subsidy',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.COMPLETED_SUBSIDY_CREDITED]: 'Completed - Subsidy Credited',
  [ProjectStatus.LOST]: 'Lost',
};

const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  [ProjectStage.SURVEY]: 'Survey',
  [ProjectStage.PROPOSAL]: 'Proposal',
  [ProjectStage.APPROVED]: 'Approved',
  [ProjectStage.INSTALLATION]: 'Installation',
  [ProjectStage.BILLING]: 'Billing',
  [ProjectStage.LIVE]: 'Live',
  [ProjectStage.AMC]: 'AMC',
  [ProjectStage.LOST]: 'Lost',
};

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.REFERRAL]: 'Referral',
  [LeadSource.GOOGLE]: 'Google',
  [LeadSource.CHANNEL_PARTNER]: 'Channel Partner',
  [LeadSource.DIGITAL_MARKETING]: 'Digital Marketing',
  [LeadSource.SALES]: 'Sales',
  [LeadSource.MANAGEMENT_CONNECT]: 'Management Connect',
  [LeadSource.OTHER]: 'Other',
};

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  [CustomerType.RESIDENTIAL]: 'Residential',
  [CustomerType.APARTMENT]: 'Apartment',
  [CustomerType.COMMERCIAL]: 'Commercial',
};

const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  [SystemType.ON_GRID]: 'On-grid',
  [SystemType.OFF_GRID]: 'Off-grid',
  [SystemType.HYBRID]: 'Hybrid',
};

const BANK_LABELS: Record<string, string> = {
  SBI: 'State Bank of India (SBI)',
  HDFC_BANK: 'HDFC Bank',
  ICICI_BANK: 'ICICI Bank',
  AXIS_BANK: 'Axis Bank',
  KOTAK_MAHINDRA_BANK: 'Kotak Mahindra Bank',
  INDUSIND_BANK: 'IndusInd Bank',
  YES_BANK: 'YES Bank',
  IDFC_FIRST_BANK: 'IDFC FIRST Bank',
  PUNJAB_NATIONAL_BANK: 'Punjab National Bank (PNB)',
  BANK_OF_BARODA: 'Bank of Baroda',
  CANARA_BANK: 'Canara Bank',
  UNION_BANK_OF_INDIA: 'Union Bank of India',
  FEDERAL_BANK: 'Federal Bank',
  SOUTH_INDIAN_BANK: 'South Indian Bank',
  CATHOLIC_SYRIAN_BANK: 'Catholic Syrian Bank',
  DHANLAXMI_BANK: 'Dhanlaxmi Bank',
  KERALA_GRAMIN_BANK: 'Kerala Gramin Bank',
  KERALA_BANK: 'Kerala Bank',
  KARNATAKA_BANK: 'Karnataka Bank',
  RBL_BANK: 'RBL Bank',
  TAMILNADU_MERCANTILE_BANK: 'Tamilnadu Mercantile Bank',
  CITY_UNION_BANK: 'City Union Bank',
  OTHER: 'Other',
};

export type ChartBuilderSeriesPoint = {
  label: string;
  value: number;
  count: number;
};

function applyDateFilters(
  baseWhere: Prisma.ProjectWhereInput,
  dates: ChartBuilderDateFilters,
): Prisma.ProjectWhereInput {
  const fyFilters = (dates.fy || []).filter(Boolean);
  const monthFilters = (dates.month || []).filter(Boolean);
  const quarterFilters = (dates.quarter || []).filter(Boolean);
  const where: Prisma.ProjectWhereInput = { ...baseWhere };

  if (fyFilters.length > 0) {
    where.year = { in: fyFilters };
  }

  if (fyFilters.length === 1) {
    let effectiveMonthFilters: string[] = [];
    if (quarterFilters.length > 0) {
      const quarterMonths = new Set<string>();
      quarterFilters.forEach((q) => {
        const months = QUARTER_TO_MONTHS[q];
        if (months) months.forEach((m) => quarterMonths.add(m));
      });
      effectiveMonthFilters =
        monthFilters.length > 0
          ? monthFilters.filter((m) => quarterMonths.has(m))
          : Array.from(quarterMonths);
    } else {
      effectiveMonthFilters = monthFilters;
    }

    if (effectiveMonthFilters.length > 0) {
      const fy = fyFilters[0]!;
      const yearMatch = fy.match(/(\d{4})/);
      if (yearMatch) {
        const startYear = parseInt(yearMatch[1], 10);
        const dateFilters: Prisma.ProjectWhereInput[] = [];
        effectiveMonthFilters.forEach((month) => {
          const monthNum = parseInt(month, 10);
          const { start, end } = istMonthBoundsForFyMonth(startYear, monthNum);
          dateFilters.push({ confirmationDate: { gte: start, lte: end } });
        });
        if (dateFilters.length > 0) {
          where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: dateFilters }];
        }
      }
    }
  }

  return where;
}

function cohortWhere(cohort: ChartBuilderSpec['cohort']): Prisma.ProjectWhereInput {
  if (cohort === 'revenue') {
    return {
      projectCost: { not: null },
      projectStatus: {
        in: [
          ProjectStatus.CONFIRMED,
          ProjectStatus.UNDER_INSTALLATION,
          ProjectStatus.COMPLETED,
          ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
        ],
      },
      AND: [
        {
          OR: [
            { projectStage: null },
            { projectStage: { notIn: [ProjectStage.SURVEY, ProjectStage.PROPOSAL] } },
          ],
        },
      ],
    };
  }
  if (cohort === 'pipeline') {
    return {
      projectCost: { not: null },
      projectStatus: { not: ProjectStatus.LOST },
    };
  }
  return { projectStatus: { not: ProjectStatus.LOST } };
}

function measureValue(
  measure: ChartBuilderMeasureId,
  p: {
    projectCost: number | null;
    grossProfit: number | null;
    systemCapacity: number | null;
  },
): number {
  if (measure === 'count') return 1;
  if (measure === 'orderValue') return Number(p.projectCost) || 0;
  if (measure === 'grossProfit') return Number(p.grossProfit) || 0;
  if (measure === 'systemCapacity') {
    const kw = Number(p.systemCapacity);
    return Number.isFinite(kw) && kw > 0 ? kw : 0;
  }
  return 0;
}

function labelForDimension(
  dimension: ChartBuilderDimensionId,
  raw: string | null | undefined,
): string {
  if (raw == null || String(raw).trim() === '') return 'Unknown';
  const v = String(raw).trim();
  if (dimension === 'leadSource') {
    return LEAD_SOURCE_LABELS[v as LeadSource] || v;
  }
  if (dimension === 'projectStatus') {
    return PROJECT_STATUS_LABELS[v as ProjectStatus] || v;
  }
  if (dimension === 'projectStage') {
    return PROJECT_STAGE_LABELS[v as ProjectStage] || v;
  }
  if (dimension === 'customerType') {
    return CUSTOMER_TYPE_LABELS[v as CustomerType] || v;
  }
  if (dimension === 'systemType') {
    return SYSTEM_TYPE_LABELS[v as SystemType] || v;
  }
  if (dimension === 'financingBank') {
    return BANK_LABELS[v] || v;
  }
  return v;
}

function sortSeries(
  dimension: ChartBuilderDimensionId,
  series: ChartBuilderSeriesPoint[],
): ChartBuilderSeriesPoint[] {
  if (dimension === 'capacityBand') {
    const order = CAPACITY_BANDS.map((b) => b.label);
    return [...series].sort((a, b) => {
      const ai = order.indexOf(a.label);
      const bi = order.indexOf(b.label);
      if (ai === -1 && bi === -1) return b.value - a.value;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }
  if (dimension === 'year') {
    return [...series].sort((a, b) => a.label.localeCompare(b.label));
  }
  return [...series].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/**
 * Aggregate projects for a ChartSpec. Uses in-memory aggregation so nested
 * dimensions (customer type, capacity band, salesperson names) stay correct.
 */
export async function queryChartBuilder(
  spec: ChartBuilderSpec,
  dates: ChartBuilderDateFilters = {},
): Promise<{ series: ChartBuilderSeriesPoint[]; title: string; valueLabel: string }> {
  let where = applyDateFilters(cohortWhere(spec.cohort), dates);
  if (spec.extraFilters?.availingLoan) {
    where = { ...where, availingLoan: true };
  }

  // Dimension-specific not-null filters improve signal (skip empty brands etc.)
  const andExtra: Prisma.ProjectWhereInput[] = Array.isArray(where.AND)
    ? [...where.AND]
    : where.AND
      ? [where.AND]
      : [];
  if (spec.dimension === 'panelBrand') {
    andExtra.push({ panelBrand: { not: null } }, { NOT: { panelBrand: '' } });
  } else if (spec.dimension === 'inverterBrand') {
    andExtra.push({ inverterBrand: { not: null } }, { NOT: { inverterBrand: '' } });
  } else if (spec.dimension === 'roofType') {
    andExtra.push({ roofType: { not: null } }, { NOT: { roofType: '' } });
  } else if (spec.dimension === 'financingBank') {
    andExtra.push({ financingBank: { not: null } }, { NOT: { financingBank: '' } });
  } else if (spec.dimension === 'capacityBand') {
    andExtra.push({ systemCapacity: { not: null, gt: 0 } });
  }
  if (andExtra.length > 0) {
    const { AND: _a, ...rest } = where;
    where = { ...rest, AND: andExtra };
  }

  const rows = await prisma.project.findMany({
    where,
    select: {
      projectCost: true,
      grossProfit: true,
      systemCapacity: true,
      leadSource: true,
      projectStatus: true,
      projectStage: true,
      roofType: true,
      panelBrand: true,
      inverterBrand: true,
      panelType: true,
      systemType: true,
      financingBank: true,
      year: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
      customer: { select: { customerType: true } },
    },
    take: 8000,
    orderBy: { updatedAt: 'desc' },
  });

  const map = new Map<string, { value: number; count: number }>();

  for (const p of rows) {
    let rawKey: string | null = null;
    switch (spec.dimension) {
      case 'leadSource':
        rawKey = p.leadSource;
        break;
      case 'projectStatus':
        rawKey = p.projectStatus;
        break;
      case 'projectStage':
        rawKey = p.projectStage;
        break;
      case 'salesperson':
        rawKey = p.salesperson?.name?.trim() || 'Unassigned';
        break;
      case 'customerType':
        rawKey = p.customer?.customerType ?? null;
        break;
      case 'roofType':
        rawKey = p.roofType;
        break;
      case 'panelBrand':
        rawKey = p.panelBrand;
        break;
      case 'inverterBrand':
        rawKey = p.inverterBrand;
        break;
      case 'panelType':
        rawKey = p.panelType;
        break;
      case 'systemType':
        rawKey = p.systemType;
        break;
      case 'financingBank':
        rawKey = p.financingBank;
        break;
      case 'year':
        rawKey = p.year;
        break;
      case 'capacityBand':
        rawKey = capacityBandForKw(p.systemCapacity);
        if (rawKey === 'Unknown') rawKey = null;
        break;
      default:
        rawKey = null;
    }

    if (spec.dimension === 'capacityBand' && !rawKey) continue;

    const label =
      spec.dimension === 'salesperson'
        ? rawKey || 'Unassigned'
        : labelForDimension(spec.dimension, rawKey);

    const add = measureValue(spec.measure, p);
    const prev = map.get(label) ?? { value: 0, count: 0 };
    prev.value += add;
    prev.count += 1;
    map.set(label, prev);
  }

  let series: ChartBuilderSeriesPoint[] = [...map.entries()].map(([label, v]) => ({
    label,
    value: spec.measure === 'count' ? v.count : Math.round(v.value * 100) / 100,
    count: v.count,
  }));

  series = sortSeries(spec.dimension, series).filter((s) => s.count > 0);

  const dimLabel =
    (
      {
        leadSource: 'Lead source',
        projectStatus: 'Project status',
        projectStage: 'Project stage',
        salesperson: 'Salesperson',
        customerType: 'Customer type',
        roofType: 'Roof type',
        panelBrand: 'Panel brand',
        inverterBrand: 'Inverter brand',
        panelType: 'Panel type',
        systemType: 'System type',
        financingBank: 'Financing bank',
        year: 'Financial year',
        capacityBand: 'System capacity band',
      } as Record<ChartBuilderDimensionId, string>
    )[spec.dimension] || spec.dimension;

  const measureMeta = (
    {
      count: { titlePart: 'Projects', valueLabel: 'Projects' },
      orderValue: { titlePart: 'Order value', valueLabel: 'Order value (₹)' },
      grossProfit: { titlePart: 'Gross profit', valueLabel: 'Gross profit (₹)' },
      systemCapacity: { titlePart: 'System capacity', valueLabel: 'Capacity (kW)' },
    } as Record<ChartBuilderMeasureId, { titlePart: string; valueLabel: string }>
  )[spec.measure];

  return {
    series,
    title: `${measureMeta.titlePart} by ${dimLabel.toLowerCase()}`,
    valueLabel: measureMeta.valueLabel,
  };
}

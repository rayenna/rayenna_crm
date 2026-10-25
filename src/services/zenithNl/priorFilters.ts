import type { ZenithNlIntent } from './catalog';

type PriorFilters = NonNullable<ZenithNlIntent['filters']>;

const PE_BUCKETS = new Set(['proposal-ready', 'draft', 'not-started', 'rest', 'active']);

function asTrimmedString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t !== '' ? t.slice(0, 200) : undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function asFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return undefined;
}

/**
 * Accept the full Ask intent filter bag on follow-up `prior` (not a short allow-list).
 * Unknown keys are ignored; values are coerced and length-capped.
 */
export function parseZenithNlPriorFilters(raw: unknown): PriorFilters | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const f = raw as Record<string, unknown>;
  const out: PriorFilters = {};

  const projectStatus = asTrimmedString(f.projectStatus);
  if (projectStatus) out.projectStatus = projectStatus;
  const paymentStatus = asTrimmedString(f.paymentStatus);
  if (paymentStatus) out.paymentStatus = paymentStatus;
  const installationStatus = asTrimmedString(f.installationStatus);
  if (installationStatus) {
    const upper = installationStatus.toUpperCase().replace(/\s+/g, '_');
    if (upper === 'PENDING' || upper === 'IN_PROGRESS' || upper === 'COMPLETED') {
      out.installationStatus = upper;
    }
  }
  const peBucket = asTrimmedString(f.peBucket);
  if (peBucket && PE_BUCKETS.has(peBucket)) {
    out.peBucket = peBucket as PriorFilters['peBucket'];
  }
  const leadSource = asTrimmedString(f.leadSource);
  if (leadSource) out.leadSource = leadSource;
  const search = asTrimmedString(f.search);
  if (search) out.search = search.slice(0, 120);
  const panelBrand = asTrimmedString(f.panelBrand);
  if (panelBrand) out.panelBrand = panelBrand;
  const inverterBrand = asTrimmedString(f.inverterBrand);
  if (inverterBrand) out.inverterBrand = inverterBrand;
  const financingBank = asTrimmedString(f.financingBank);
  if (financingBank) out.financingBank = financingBank;
  const availingLoan = asBoolean(f.availingLoan);
  if (availingLoan !== undefined) out.availingLoan = availingLoan;
  const ticketStatus = asTrimmedString(f.ticketStatus);
  if (ticketStatus) out.ticketStatus = ticketStatus;
  const ticketSource = asTrimmedString(f.ticketSource);
  if (ticketSource) out.ticketSource = ticketSource;
  const projectType = asTrimmedString(f.projectType);
  if (projectType) out.projectType = projectType;
  const projectServiceType = asTrimmedString(f.projectServiceType);
  if (projectServiceType) out.projectServiceType = projectServiceType;
  const customerType = asTrimmedString(f.customerType);
  if (customerType) out.customerType = customerType;
  const panelType = asTrimmedString(f.panelType);
  if (panelType) out.panelType = panelType;
  const systemType = asTrimmedString(f.systemType);
  if (systemType) out.systemType = systemType;
  if (f.groupBy === 'systemType') out.groupBy = 'systemType';
  const roofType = asTrimmedString(f.roofType);
  if (roofType) out.roofType = roofType;
  const capacityMin = asFiniteNumber(f.capacityMin);
  if (capacityMin !== undefined) out.capacityMin = capacityMin;
  const capacityMax = asFiniteNumber(f.capacityMax);
  if (capacityMax !== undefined) out.capacityMax = capacityMax;
  const salespersonName = asTrimmedString(f.salespersonName);
  if (salespersonName) out.salespersonName = salespersonName;
  const salespersonUnassigned = asBoolean(f.salespersonUnassigned);
  if (salespersonUnassigned !== undefined) out.salespersonUnassigned = salespersonUnassigned;
  const city = asTrimmedString(f.city);
  if (city) out.city = city;
  const opsName = asTrimmedString(f.opsName);
  if (opsName) out.opsName = opsName;
  const projectStage = asTrimmedString(f.projectStage);
  if (projectStage) out.projectStage = projectStage;
  const statusIndicator = asTrimmedString(f.statusIndicator);
  if (statusIndicator) out.statusIndicator = statusIndicator.toUpperCase();
  const leadSourceIsNull = asBoolean(f.leadSourceIsNull);
  if (leadSourceIsNull !== undefined) out.leadSourceIsNull = leadSourceIsNull;
  const incentiveEligible = asBoolean(f.incentiveEligible);
  if (incentiveEligible !== undefined) out.incentiveEligible = incentiveEligible;
  const hasDocuments = asBoolean(f.hasDocuments);
  if (hasDocuments !== undefined) out.hasDocuments = hasDocuments;
  const lifecycleSpecsIncomplete = asBoolean(f.lifecycleSpecsIncomplete);
  if (lifecycleSpecsIncomplete !== undefined) {
    out.lifecycleSpecsIncomplete = lifecycleSpecsIncomplete;
  }
  const dataSenseNeedsReview = asBoolean(f.dataSenseNeedsReview);
  if (dataSenseNeedsReview !== undefined) out.dataSenseNeedsReview = dataSenseNeedsReview;
  const hubPlantLinked = asBoolean(f.hubPlantLinked);
  if (hubPlantLinked !== undefined) out.hubPlantLinked = hubPlantLinked;
  const panelCapacityWMin = asFiniteNumber(f.panelCapacityWMin);
  if (panelCapacityWMin !== undefined) out.panelCapacityWMin = panelCapacityWMin;
  const panelCapacityWMax = asFiniteNumber(f.panelCapacityWMax);
  if (panelCapacityWMax !== undefined) out.panelCapacityWMax = panelCapacityWMax;
  const inverterCapacityKwMin = asFiniteNumber(f.inverterCapacityKwMin);
  if (inverterCapacityKwMin !== undefined) out.inverterCapacityKwMin = inverterCapacityKwMin;
  const inverterCapacityKwMax = asFiniteNumber(f.inverterCapacityKwMax);
  if (inverterCapacityKwMax !== undefined) out.inverterCapacityKwMax = inverterCapacityKwMax;
  const compareFocus = asTrimmedString(f.compareFocus);
  if (
    compareFocus === 'revenue' ||
    compareFocus === 'margin' ||
    compareFocus === 'profit' ||
    compareFocus === 'all'
  ) {
    out.compareFocus = compareFocus;
  }
  const detailSlice = asTrimmedString(f.detailSlice);
  if (detailSlice) out.detailSlice = detailSlice.slice(0, 64);

  return Object.keys(out).length > 0 ? out : undefined;
}

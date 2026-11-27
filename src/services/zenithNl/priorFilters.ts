import type { UserRole } from '@prisma/client';
import {
  metricAllowedForRole,
  type ZenithNlIntent,
  type ZenithNlMetric,
  type ZenithNlPriorContext,
} from './catalog';

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

function normAsk(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Follow-ups that should keep the prior metric (viz / breakdown refinements). */
export function isAskFollowUpQuestion(question: string): boolean {
  const q = normAsk(question);
  if (q.length < 4) return false;
  return (
    /\bas a (table|chart|pie|donut|bar)\b/.test(q) ||
    /\bshow (that|it|this) as\b/.test(q) ||
    /\bshow that\b/.test(q) ||
    /\bsame (list|thing|query|filters?)\b/.test(q) ||
    /\bbreak( that)? down\b/.test(q) ||
    /\bby (salesperson|sales person|lead source|stage|city)\b/.test(q) ||
    /\bas a pie\b/.test(q) ||
    /^(table|pie|bar chart)$/.test(q)
  );
}

function mergeFilterBags(
  prior: PriorFilters | undefined,
  current: PriorFilters | undefined,
): PriorFilters | undefined {
  if (!prior && !current) return undefined;
  const out: PriorFilters = { ...(prior || {}) };
  for (const [key, value] of Object.entries(current || {}) as Array<
    [keyof PriorFilters, PriorFilters[keyof PriorFilters]]
  >) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    (out as Record<string, unknown>)[key as string] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function applyVizFromFollowUp(question: string, intent: ZenithNlIntent): ZenithNlIntent {
  const q = normAsk(question);
  if (/\bas a table\b/.test(q) || q === 'table') {
    return { ...intent, viz: 'table', chartType: undefined };
  }
  if (/\bas a (pie|donut)\b/.test(q) || q === 'pie') {
    return { ...intent, viz: 'chart', chartType: 'pie' };
  }
  if (/\bas a bar\b/.test(q) || /\bbar chart\b/.test(q)) {
    return { ...intent, viz: 'chart', chartType: 'bar' };
  }
  if (/\bas a chart\b/.test(q)) {
    return { ...intent, viz: 'chart', chartType: intent.chartType || 'bar' };
  }
  return intent;
}

function refineMetricFromFollowUp(
  question: string,
  priorMetric: string,
  role: UserRole,
): ZenithNlMetric | null {
  const q = normAsk(question);
  if (/\bby (salesperson|sales person)\b/.test(q)) {
    if (metricAllowedForRole('revenue_by_salesperson', role)) return 'revenue_by_salesperson';
  }
  if (/\bby lead source\b/.test(q)) {
    if (metricAllowedForRole('revenue_by_lead_source', role)) return 'revenue_by_lead_source';
  }
  if (/\bby stage\b/.test(q) && /pipeline|deal/.test(priorMetric)) {
    if (metricAllowedForRole('pipeline_by_stage', role)) return 'pipeline_by_stage';
  }
  return null;
}

/**
 * Apply prior Ask context for follow-ups without waiting on Claude:
 * keep metric when the user only changes viz / asks for a breakdown,
 * and fill missing filters from the previous answer.
 */
export function applyPriorToIntent(
  question: string,
  intent: ZenithNlIntent,
  prior: ZenithNlPriorContext | null | undefined,
  role: UserRole,
): ZenithNlIntent {
  if (!prior?.metric) return intent;

  const priorMetric = prior.metric as ZenithNlMetric;
  const followUp = isAskFollowUpQuestion(question);
  const refined = followUp ? refineMetricFromFollowUp(question, prior.metric, role) : null;

  let next: ZenithNlIntent = { ...intent };

  if (followUp) {
    const keepPriorMetric =
      intent.metric === 'clarify' ||
      intent.metric === priorMetric ||
      /\bas a (table|chart|pie|donut|bar)\b/.test(normAsk(question)) ||
      /\bshow (that|it|this) as\b/.test(normAsk(question)) ||
      /^(table|pie|bar chart)$/.test(normAsk(question));

    if (refined && metricAllowedForRole(refined, role)) {
      next = { ...next, metric: refined };
    } else if (keepPriorMetric && metricAllowedForRole(priorMetric, role)) {
      next = { ...next, metric: priorMetric };
    }
    next = applyVizFromFollowUp(question, next);
    next = {
      ...next,
      filters: mergeFilterBags(prior.filters, next.filters),
      insightHints: next.insightHints || prior.question,
    };
    return next;
  }

  // Same metric continued (e.g. rephrase) — fill gaps from prior filters.
  if (intent.metric === priorMetric) {
    return {
      ...next,
      filters: mergeFilterBags(prior.filters, next.filters),
    };
  }

  return intent;
}

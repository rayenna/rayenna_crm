import {
  complianceGapFromStepLabel,
  parseComplianceGap,
} from '../../utils/complianceGaps';
import type { ComplianceGapId } from '../../utils/complianceGaps';
import type {
  ZenithNlIntent,
  ZenithNlMetric,
  ZenithNlViz,
} from './catalog';

export type ZenithNlDateFilter = {
  selectedFYs: string[];
  selectedQuarters: string[];
  selectedMonths: string[];
};

/**
 * Server-side `/projects?…` builder mirroring client `buildProjectsUrl` for NL Ask deep-links.
 */
export function buildZenithNlProjectsHref(
  params: {
    status?: string[];
    paymentStatus?: string[];
    peBucket?: string;
    leadSource?: string[];
    zenithSlice?: 'revenue' | 'pipeline';
    search?: string;
    dataSenseNeedsReview?: boolean;
    pendingSubsidy?: boolean;
    hasDocuments?: boolean;
    lifecycleSpecsIncomplete?: boolean;
    complianceGap?: ComplianceGapId;
    availingLoan?: boolean;
    notAvailingLoan?: boolean;
    financingBank?: string[];
    panelBrand?: string;
    inverterBrand?: string;
    type?: string[];
    customerType?: string[];
    projectServiceType?: string[];
    salespersonUnassigned?: boolean;
    panelType?: string;
    systemType?: string;
    roofType?: string;
    statusIndicator?: string;
    projectStage?: string;
    capacityMin?: number;
    capacityMax?: number;
    hubPlantLinked?: boolean;
    salespersonName?: string;
    opsName?: string;
    city?: string;
    installationStatus?: string;
    paymentMode?: string;
    ids?: string[];
  },
  dateFilter: ZenithNlDateFilter,
): string {
  const search = new URLSearchParams();
  params.status?.forEach((v) => search.append('status', v));
  params.paymentStatus?.forEach((v) => search.append('paymentStatus', v));
  if (params.peBucket) search.append('peBucket', params.peBucket);
  params.leadSource?.forEach((v) => search.append('leadSource', v));
  if (params.zenithSlice) search.append('zenithSlice', params.zenithSlice);
  if (params.dataSenseNeedsReview) search.append('dataSenseNeedsReview', 'true');
  if (params.pendingSubsidy) search.append('pendingSubsidy', 'true');
  if (params.hasDocuments) search.append('hasDocuments', 'true');
  if (params.lifecycleSpecsIncomplete) search.append('lifecycleSpecsIncomplete', 'true');
  if (params.complianceGap) search.append('complianceGap', params.complianceGap);
  if (params.availingLoan) search.append('availingLoan', 'true');
  if (params.notAvailingLoan) search.append('notAvailingLoan', 'true');
  params.financingBank?.forEach((v) => search.append('financingBank', v));
  if (params.panelBrand?.trim()) search.append('panelBrand', params.panelBrand.trim());
  if (params.inverterBrand?.trim()) search.append('inverterBrand', params.inverterBrand.trim());
  params.type?.forEach((v) => search.append('type', v));
  params.customerType?.forEach((v) => search.append('customerType', v));
  params.projectServiceType?.forEach((v) => search.append('projectServiceType', v));
  if (params.salespersonUnassigned) search.append('salespersonUnassigned', 'true');
  if (params.panelType?.trim()) search.append('panelType', params.panelType.trim());
  if (params.systemType?.trim()) search.append('systemType', params.systemType.trim());
  if (params.roofType?.trim()) search.append('roofType', params.roofType.trim());
  if (params.statusIndicator?.trim()) {
    search.append('statusIndicator', params.statusIndicator.trim().toUpperCase());
  }
  if (params.projectStage?.trim()) search.append('projectStage', params.projectStage.trim());
  if (params.capacityMin != null && Number.isFinite(params.capacityMin)) {
    search.append('capacityMin', String(params.capacityMin));
  }
  if (params.capacityMax != null && Number.isFinite(params.capacityMax)) {
    search.append('capacityMax', String(params.capacityMax));
  }
  if (params.hubPlantLinked === true) search.append('hubPlantLinked', 'true');
  if (params.hubPlantLinked === false) search.append('hubPlantLinked', 'false');
  if (params.salespersonName?.trim()) {
    search.append('salespersonName', params.salespersonName.trim());
  }
  if (params.opsName?.trim()) search.append('opsName', params.opsName.trim());
  if (params.city?.trim()) search.append('city', params.city.trim());
  if (params.installationStatus?.trim()) {
    search.append('installationStatus', params.installationStatus.trim());
  }
  if (params.paymentMode?.trim()) search.append('paymentMode', params.paymentMode.trim());
  const q = params.search != null ? String(params.search).trim() : '';
  if (q !== '') search.append('search', q);
  const ids = [...new Set((params.ids ?? []).map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  ids.forEach((id) => search.append('id', id));
  dateFilter.selectedFYs.forEach((fy) => search.append('fy', fy));
  dateFilter.selectedQuarters.forEach((qq) => search.append('quarter', qq));
  dateFilter.selectedMonths.forEach((m) => search.append('month', m));
  const qs = search.toString();
  return qs ? `/projects?${qs}` : '/projects';
}

const ASK_PROJECT_ID_HREF_MAX = 200;

const EMPTY_DATES: ZenithNlDateFilter = {
  selectedFYs: [],
  selectedQuarters: [],
  selectedMonths: [],
};

/** Deep-link that opens exactly the projects in an Ask deal list. */
export function projectsHrefForAskProjectIds(ids: string[]): string | null {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    ASK_PROJECT_ID_HREF_MAX,
  );
  if (unique.length === 0) return null;
  return buildZenithNlProjectsHref({ ids: unique }, EMPTY_DATES);
}

export function projectIdsFromAskViz(viz: ZenithNlViz): string[] {
  if (viz.kind !== 'table') return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of viz.rows) {
    const rec = row as Record<string, unknown>;
    let id = typeof rec.projectId === 'string' ? rec.projectId.trim() : '';
    if (!id && typeof rec.href === 'string') {
      const m = rec.href.match(/^\/projects\/([a-z0-9_-]{16,40})\/?$/i);
      if (m?.[1]) id = m[1];
    }
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

const PIN_ASK_HREF_TO_ROW_IDS = new Set<ZenithNlMetric>(['pipeline_health', 'who_to_call']);

function isBroadProjectsHref(href: string | null | undefined): boolean {
  if (href == null || href === '' || href === '/projects') return true;
  if (!href.startsWith('/projects')) return false;
  try {
    const u = new URL(href, 'http://local.invalid');
    const keys = [...u.searchParams.keys()];
    if (keys.includes('id')) return false;
    const onlyDates = keys.every((k) => k === 'fy' || k === 'quarter' || k === 'month');
    if (onlyDates) return true;
    return u.searchParams.getAll('status').some((s) => s.includes(','));
  } catch {
    return false;
  }
}

/**
 * Prefer the deals in the Ask table over a wide Projects filter
 * (e.g. stalled pipeline must not open every open-stage project).
 */
export function resolveAskProjectsHref(args: {
  metric: ZenithNlMetric;
  viz: ZenithNlViz;
  executedHref?: string;
  fallbackHref: string | null;
}): string | null {
  const executed = args.executedHref?.trim() || '';
  if (executed.includes('id=')) return executed;
  const ids = projectIdsFromAskViz(args.viz);
  const candidate = executed || args.fallbackHref;
  const shouldPin =
    ids.length > 0 &&
    (PIN_ASK_HREF_TO_ROW_IDS.has(args.metric) || isBroadProjectsHref(candidate));
  if (shouldPin) return projectsHrefForAskProjectIds(ids) || candidate;
  return candidate || null;
}

function entityHrefParams(intent: ZenithNlIntent): {
  panelBrand?: string;
  inverterBrand?: string;
  financingBank?: string[];
  availingLoan?: boolean;
  type?: string[];
  customerType?: string[];
  projectServiceType?: string[];
  salespersonUnassigned?: boolean;
  salespersonName?: string;
  opsName?: string;
  city?: string;
  pendingSubsidy?: boolean;
  hasDocuments?: boolean;
  lifecycleSpecsIncomplete?: boolean;
  dataSenseNeedsReview?: boolean;
  panelType?: string;
  systemType?: string;
  roofType?: string;
  statusIndicator?: string;
  projectStage?: string;
  capacityMin?: number;
  capacityMax?: number;
  hubPlantLinked?: boolean;
  installationStatus?: string;
} {
  const panelBrand = intent.filters?.panelBrand?.trim() || undefined;
  const inverterBrand = intent.filters?.inverterBrand?.trim() || undefined;
  const bank = intent.filters?.financingBank?.trim() || undefined;
  const projectType = intent.filters?.projectType?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const customerType = intent.filters?.customerType?.trim().toUpperCase();
  const service = intent.filters?.projectServiceType?.trim().toUpperCase().replace(/\s+/g, '_');
  const out: {
    panelBrand?: string;
    inverterBrand?: string;
    financingBank?: string[];
    availingLoan?: boolean;
    type?: string[];
    customerType?: string[];
    projectServiceType?: string[];
    salespersonUnassigned?: boolean;
    salespersonName?: string;
    opsName?: string;
    city?: string;
    pendingSubsidy?: boolean;
    hasDocuments?: boolean;
    lifecycleSpecsIncomplete?: boolean;
    dataSenseNeedsReview?: boolean;
    panelType?: string;
    systemType?: string;
    roofType?: string;
    statusIndicator?: string;
    projectStage?: string;
    capacityMin?: number;
    capacityMax?: number;
    hubPlantLinked?: boolean;
    installationStatus?: string;
  } = {};
  if (panelBrand) out.panelBrand = panelBrand;
  if (inverterBrand) out.inverterBrand = inverterBrand;
  if (bank) {
    out.financingBank = [bank];
    out.availingLoan = true;
  } else if (intent.filters?.availingLoan) {
    out.availingLoan = true;
  }
  if (projectType === 'SUBSIDY' || projectType === 'NON_SUBSIDY') out.type = [projectType];
  if (customerType) out.customerType = [customerType];
  if (service) out.projectServiceType = [service];
  if (intent.filters?.salespersonUnassigned) out.salespersonUnassigned = true;
  if (intent.filters?.salespersonName?.trim()) {
    out.salespersonName = intent.filters.salespersonName.trim();
  }
  if (intent.filters?.opsName?.trim()) out.opsName = intent.filters.opsName.trim();
  if (intent.filters?.city?.trim()) out.city = intent.filters.city.trim();
  if (intent.filters?.pendingSubsidy) out.pendingSubsidy = true;
  if (intent.filters?.hasDocuments) out.hasDocuments = true;
  if (intent.filters?.lifecycleSpecsIncomplete) out.lifecycleSpecsIncomplete = true;
  if (intent.filters?.dataSenseNeedsReview) out.dataSenseNeedsReview = true;
  if (intent.filters?.panelType?.trim()) out.panelType = intent.filters.panelType.trim();
  if (intent.filters?.systemType?.trim()) out.systemType = intent.filters.systemType.trim();
  if (intent.filters?.roofType?.trim()) out.roofType = intent.filters.roofType.trim();
  if (intent.filters?.statusIndicator?.trim()) {
    out.statusIndicator = intent.filters.statusIndicator.trim();
  }
  if (intent.filters?.projectStage?.trim()) out.projectStage = intent.filters.projectStage.trim();
  if (typeof intent.filters?.capacityMin === 'number') out.capacityMin = intent.filters.capacityMin;
  if (typeof intent.filters?.capacityMax === 'number') out.capacityMax = intent.filters.capacityMax;
  if (intent.filters?.hubPlantLinked != null) out.hubPlantLinked = intent.filters.hubPlantLinked;
  if (intent.filters?.installationStatus?.trim()) {
    const raw = intent.filters.installationStatus.trim().toUpperCase().replace(/\s+/g, '_');
    if (raw === 'PENDING' || raw === 'IN_PROGRESS' || raw === 'COMPLETED') {
      out.installationStatus = raw;
    }
  }
  return out;
}

/** Merge entity filters under slice-specific params (slice wins; skip undefined). */
function withEntity(
  slice: Parameters<typeof buildZenithNlProjectsHref>[0],
  entity: ReturnType<typeof entityHrefParams>,
): Parameters<typeof buildZenithNlProjectsHref>[0] {
  return { ...entity, ...slice };
}

const REVENUE_STATUSES = [
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
];

const PIPELINE_STATUSES = ['LEAD', 'SITE_SURVEY', 'PROPOSAL', 'CONFIRMED'];

const LEAD_LABEL_TO_ENUM: Record<string, string> = {
  Website: 'WEBSITE',
  Referral: 'REFERRAL',
  Google: 'GOOGLE',
  'Channel Partner': 'CHANNEL_PARTNER',
  'Digital Marketing': 'DIGITAL_MARKETING',
  Sales: 'SALES',
  'Management Connect': 'MANAGEMENT_CONNECT',
  Other: 'OTHER',
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  GOOGLE: 'GOOGLE',
  CHANNEL_PARTNER: 'CHANNEL_PARTNER',
  DIGITAL_MARKETING: 'DIGITAL_MARKETING',
  SALES: 'SALES',
  MANAGEMENT_CONNECT: 'MANAGEMENT_CONNECT',
  OTHER: 'OTHER',
};

/** Map successful intent → Projects deep-link when filters are expressible. */
export function projectsHrefForIntent(
  metric: ZenithNlMetric,
  intent: ZenithNlIntent,
  dateFilter: ZenithNlDateFilter,
): string | null {
  switch (metric) {
    case 'revenue_by_lead_source': {
      const lsRaw = intent.filters?.leadSource?.trim();
      if (lsRaw) {
        const ls = LEAD_LABEL_TO_ENUM[lsRaw] ?? lsRaw;
        return buildZenithNlProjectsHref(
          { leadSource: [ls], zenithSlice: 'revenue' },
          dateFilter,
        );
      }
      return buildZenithNlProjectsHref(
        { status: [...REVENUE_STATUSES], zenithSlice: 'revenue' },
        dateFilter,
      );
    }
    case 'revenue_by_salesperson':
      return buildZenithNlProjectsHref(
        { status: [...REVENUE_STATUSES], zenithSlice: 'revenue' },
        dateFilter,
      );
    case 'pipeline_by_stage': {
      const st = intent.filters?.projectStatus?.trim();
      if (st) {
        return buildZenithNlProjectsHref({ status: [st], zenithSlice: 'pipeline' }, dateFilter);
      }
      const statuses =
        intent.filters?.detailSlice === 'weighted'
          ? [...PIPELINE_STATUSES, 'UNDER_INSTALLATION', 'SUBMITTED_FOR_SUBSIDY']
          : [...PIPELINE_STATUSES];
      return buildZenithNlProjectsHref(
        { status: statuses, zenithSlice: 'pipeline' },
        dateFilter,
      );
    }
    case 'pipeline_health':
      return null;
    case 'payment_status_breakdown': {
      const ps = intent.filters?.paymentStatus?.trim();
      if (ps) {
        return buildZenithNlProjectsHref({ paymentStatus: [ps] }, dateFilter);
      }
      return buildZenithNlProjectsHref({}, dateFilter);
    }
    case 'capacity_sold':
      return buildZenithNlProjectsHref(
        { status: [...REVENUE_STATUSES], zenithSlice: 'revenue' },
        dateFilter,
      );
    case 'outstanding_balance':
      return buildZenithNlProjectsHref(
        { paymentStatus: ['PENDING', 'PARTIAL'] },
        dateFilter,
      );
    case 'top_customers_by_profit': {
      const search = intent.filters?.search?.trim();
      if (search) {
        return buildZenithNlProjectsHref(
          { search, zenithSlice: 'revenue' },
          dateFilter,
        );
      }
      return buildZenithNlProjectsHref({ zenithSlice: 'revenue' }, dateFilter);
    }
    case 'lost_deals_summary': {
      // Lost Deals page preserves the same FY/Q/M filters.
      const search = new URLSearchParams();
      dateFilter.selectedFYs.forEach((fy) => search.append('fy', fy));
      dateFilter.selectedQuarters.forEach((qq) => search.append('quarter', qq));
      dateFilter.selectedMonths.forEach((m) => search.append('month', m));
      const qs = search.toString();
      return qs ? `/lost-deals?${qs}` : '/lost-deals';
    }
    case 'proposal_engine_buckets': {
      const bucket = intent.filters?.peBucket;
      if (bucket) {
        return buildZenithNlProjectsHref({ peBucket: bucket }, dateFilter);
      }
      return buildZenithNlProjectsHref({}, dateFilter);
    }
    case 'projects_list_slice':
    case 'cohort_summary': {
      const st = intent.filters?.projectStatus?.trim();
      const ps = intent.filters?.paymentStatus?.trim();
      const pe = intent.filters?.peBucket;
      const lsRaw = intent.filters?.leadSource?.trim();
      const search = intent.filters?.search?.trim();
      let paymentStatuses: string[] | undefined;
      if (ps) {
        const upper = ps.toUpperCase().replace(/\s+/g, '_');
        if (
          upper === 'NOT_FULLY_PAID' ||
          upper === 'PENDING,PARTIAL' ||
          upper === 'PARTIAL,PENDING'
        ) {
          paymentStatuses = ['PENDING', 'PARTIAL'];
        } else {
          paymentStatuses = [ps];
        }
      }
      return buildZenithNlProjectsHref(
        {
          status: st ? [st] : undefined,
          paymentStatus: paymentStatuses,
          peBucket: pe,
          leadSource: lsRaw ? [LEAD_LABEL_TO_ENUM[lsRaw] ?? lsRaw] : undefined,
          search,
          ...entityHrefParams(intent),
        },
        dateFilter,
      );
    }
    case 'install_by_status': {
      const st = intent.filters?.projectStatus?.trim();
      if (st) {
        return buildZenithNlProjectsHref({ status: [st] }, dateFilter);
      }
      return buildZenithNlProjectsHref(
        {
          status: [
            'UNDER_INSTALLATION',
            'SUBMITTED_FOR_SUBSIDY',
            'COMPLETED',
            'COMPLETED_SUBSIDY_CREDITED',
          ],
        },
        dateFilter,
      );
    }
    case 'pending_subsidy':
      return buildZenithNlProjectsHref({ pendingSubsidy: true }, dateFilter);
    case 'who_to_call':
      return null;
    case 'customer_detail_lookup': {
      const search = intent.filters?.search?.trim() || intent.filters?.city?.trim();
      return search ? `/customers?q=${encodeURIComponent(search)}` : '/customers';
    }
    case 'customers_list_slice': {
      const params = new URLSearchParams();
      const ct = intent.filters?.customerType?.trim().toUpperCase();
      // Customer Master URL uses `type` (see applyCustomerListStateToSearchParams).
      if (ct === 'RESIDENTIAL' || ct === 'APARTMENT' || ct === 'COMMERCIAL') {
        params.set('type', ct);
      }
      const city = intent.filters?.city?.trim();
      if (city) params.set('q', city);
      const search = intent.filters?.search?.trim();
      if (search && !city) params.set('q', search);
      const qs = params.toString();
      return qs ? `/customers?${qs}` : '/customers';
    }
    case 'project_detail_lookup': {
      const search = intent.filters?.search?.trim();
      if (search && !/^SL:\d+$/i.test(search)) {
        return buildZenithNlProjectsHref({ search, ...entityHrefParams(intent) }, dateFilter);
      }
      return buildZenithNlProjectsHref({ ...entityHrefParams(intent) }, dateFilter);
    }
    case 'projects_ops_detail': {
      const slice = intent.filters?.detailSlice || '';
      if (slice === 'feasibility_pending') {
        return buildZenithNlProjectsHref(
          { complianceGap: 'no_feasibility', type: ['SUBSIDY'], ...entityHrefParams(intent) },
          dateFilter,
        );
      }
      if (slice === 'registration_pending') {
        return buildZenithNlProjectsHref(
          { complianceGap: 'feas_no_reg', type: ['SUBSIDY'], ...entityHrefParams(intent) },
          dateFilter,
        );
      }
      if (slice === 'mnre_pending') {
        return buildZenithNlProjectsHref(
          { complianceGap: 'install_no_mnre', type: ['SUBSIDY'], ...entityHrefParams(intent) },
          dateFilter,
        );
      }
      if (slice === 'subsidy_credit_pending') {
        return buildZenithNlProjectsHref(
          {
            complianceGap: 'subsidy_req_no_credit',
            type: ['SUBSIDY'],
            ...entityHrefParams(intent),
          },
          dateFilter,
        );
      }
      if (slice === 'incentive_eligible') {
        return buildZenithNlProjectsHref({ ...entityHrefParams(intent) }, dateFilter);
      }
      if (slice === 'hub_station_ids') {
        return buildZenithNlProjectsHref(
          { hubPlantLinked: true, ...entityHrefParams(intent) },
          dateFilter,
        );
      }
      if (slice === 'hub_unlinked') {
        return buildZenithNlProjectsHref(
          { hubPlantLinked: false, ...entityHrefParams(intent) },
          dateFilter,
        );
      }
      if (slice === 'advance_only' || slice === 'no_p2' || slice === 'payment_timeline') {
        return buildZenithNlProjectsHref(
          { paymentStatus: ['PENDING', 'PARTIAL'], ...entityHrefParams(intent) },
          dateFilter,
        );
      }
      if (slice === 'commissioning_overdue' || slice === 'commissioning') {
        return buildZenithNlProjectsHref({ ...entityHrefParams(intent) }, dateFilter);
      }
      if (slice === 'missing_documents' && intent.filters?.projectStatus === 'CONFIRMED') {
        return buildZenithNlProjectsHref(
          { status: ['CONFIRMED'], ...entityHrefParams(intent) },
          dateFilter,
        );
      }
      if (slice === 'lost_detail') {
        return '/lost-deals';
      }
      if (slice.startsWith('pe_missing_')) {
        return buildZenithNlProjectsHref({ peBucket: 'draft', ...entityHrefParams(intent) }, dateFilter);
      }
      return buildZenithNlProjectsHref({ ...entityHrefParams(intent) }, dateFilter);
    }
    case 'availing_loan':
    case 'loan_bank_breakdown':
      return buildZenithNlProjectsHref(
        { availingLoan: true, ...entityHrefParams(intent) },
        dateFilter,
      );
    case 'panel_brand_mix':
    case 'inverter_brand_mix':
    case 'revenue_by_project_type':
    case 'revenue_by_customer_type':
    case 'service_type_mix':
    case 'panel_type_mix':
    case 'roof_type_mix':
    case 'system_type_mix':
    case 'capacity_by_band':
    case 'revenue_by_city':
    case 'loan_vs_cash_revenue':
    case 'profit_summary':
    case 'period_compare':
    case 'outstanding_by_salesperson':
      return buildZenithNlProjectsHref(
        {
          status: [...REVENUE_STATUSES],
          zenithSlice: 'revenue',
          ...entityHrefParams(intent),
          dataSenseNeedsReview: intent.filters?.dataSenseNeedsReview || undefined,
        },
        dateFilter,
      );
    case 'ops_workload':
    case 'project_stage_mix':
    case 'sla_indicator_mix':
    case 'compliance_backlog':
    case 'subsidy_funnel':
    case 'installation_model_status':
    case 'hub_plant_link_summary':
    case 'amc_expiring':
      return buildZenithNlProjectsHref(
        { ...entityHrefParams(intent) },
        dateFilter,
      );
    case 'lost_competition_breakdown':
      return '/lost-deals';
    case 'payment_mode_mix':
    case 'unpaid_invoices':
      return buildZenithNlProjectsHref({}, dateFilter);
    case 'support_tickets_summary': {
      const status = intent.filters?.ticketStatus?.trim().toUpperCase() || '';
      const source = intent.filters?.ticketSource?.trim().toUpperCase() || '';
      if (status === 'OVERDUE') return '/support-tickets?filter=overdue';
      if (status === 'OPEN') return '/support-tickets?filter=open';
      if (status === 'IN_PROGRESS') return '/support-tickets?filter=in-progress';
      if (status === 'CLOSED') return '/support-tickets?filter=closed';
      if (source === 'CONSUMER_APP') return '/support-tickets?filter=hub';
      return '/support-tickets';
    }
    default:
      return null;
  }
}

const REVENUE_STATUS_LIST = [...REVENUE_STATUSES];

const PAYMENT_LABEL_TO_PARAM: Record<string, string> = {
  Pending: 'PENDING',
  Partial: 'PARTIAL',
  'Fully Paid': 'FULLY_PAID',
  'N/A': 'NA',
  NA: 'NA',
};

const PROJECT_TYPE_LABEL_TO_PARAM: Record<string, string> = {
  Subsidy: 'SUBSIDY',
  'Non-Subsidy': 'NON_SUBSIDY',
  'Non Subsidy': 'NON_SUBSIDY',
};

const CUSTOMER_TYPE_LABEL_TO_PARAM: Record<string, string> = {
  Residential: 'RESIDENTIAL',
  Apartment: 'APARTMENT',
  Commercial: 'COMMERCIAL',
};

const PE_BUCKET_LABEL_TO_PARAM: Record<string, string> = {
  'PE Ready': 'proposal-ready',
  'PE Draft': 'draft',
  'PE Not Yet Created': 'not-started',
  Rest: 'rest',
};

const STATUS_LABEL_TO_PARAM: Record<string, string> = {
  Lead: 'LEAD',
  'Site Survey': 'SITE_SURVEY',
  Proposal: 'PROPOSAL',
  'Confirmed Order': 'CONFIRMED',
  Confirmed: 'CONFIRMED',
  'Under Installation': 'UNDER_INSTALLATION',
  'Under installation': 'UNDER_INSTALLATION',
  Installation: 'UNDER_INSTALLATION',
  'Submitted for Subsidy': 'SUBMITTED_FOR_SUBSIDY',
  'Submitted for subsidy': 'SUBMITTED_FOR_SUBSIDY',
  Completed: 'COMPLETED',
  'Completed (awaiting credit)': 'COMPLETED',
  'Completed - Subsidy Credited': 'COMPLETED_SUBSIDY_CREDITED',
  'Subsidy credited': 'COMPLETED_SUBSIDY_CREDITED',
  Lost: 'LOST',
};

/** Lifecycle `projectStage` labels (not CRM projectStatus). */
const PROJECT_STAGE_LABEL_TO_PARAM: Record<string, string> = {
  Survey: 'SURVEY',
  Proposal: 'PROPOSAL',
  Approved: 'APPROVED',
  Installation: 'INSTALLATION',
  Billing: 'BILLING',
  Live: 'LIVE',
  AMC: 'AMC',
  Lost: 'LOST',
};

const SERVICE_TYPE_LABEL_TO_PARAM: Record<string, string> = {
  'EPC Project': 'EPC_PROJECT',
  'Panel Cleaning': 'PANEL_CLEANING',
  Maintenance: 'MAINTENANCE',
  Repair: 'REPAIR',
  Consulting: 'CONSULTING',
  Resale: 'RESALE',
  'Other Services': 'OTHER_SERVICES',
};

const SYSTEM_TYPE_LABEL_TO_PARAM: Record<string, string> = {
  'On-grid': 'ON_GRID',
  'Off-grid': 'OFF_GRID',
  Hybrid: 'HYBRID',
  ON_GRID: 'ON_GRID',
  OFF_GRID: 'OFF_GRID',
  HYBRID: 'HYBRID',
};

const CAPACITY_BAND_TO_RANGE: Record<string, { min: number; max?: number }> = {
  'Under 3 kW': { min: 0, max: 2 },
  '3–5 kW': { min: 3, max: 5 },
  '6–10 kW': { min: 6, max: 10 },
  'Above 10 kW': { min: 11 },
};

const INSTALL_STATUS_LABEL_TO_PARAM: Record<string, string> = {
  Pending: 'PENDING',
  'In progress': 'IN_PROGRESS',
  Completed: 'COMPLETED',
};

const PAYMENT_MODE_LABEL_TO_PARAM: Record<string, string> = {
  UPI: 'UPI',
  Bank: 'BANK',
  Cheque: 'CHEQUE',
};

const LEAD_SOURCE_LABEL_TO_PARAM: Record<string, string> = {
  Website: 'WEBSITE',
  Referral: 'REFERRAL',
  Google: 'GOOGLE',
  'Channel Partner': 'CHANNEL_PARTNER',
  'Digital Marketing': 'DIGITAL_MARKETING',
  Sales: 'SALES',
  'Management Connect': 'MANAGEMENT_CONNECT',
  Other: 'OTHER',
};

const TICKET_TABLE_METRICS = new Set<ZenithNlMetric>([
  'support_tickets_summary',
  'ticket_resolution_time',
]);

const PROJECT_LIST_ROW_METRICS = new Set<ZenithNlMetric>([
  'outstanding_balance',
  'projects_list_slice',
  'cohort_summary',
  'availing_loan',
  'pending_subsidy',
  'who_to_call',
  'unpaid_invoices',
  'amc_expiring',
  'top_customers_by_profit',
]);

function rowCount(row: Record<string, unknown>): number {
  const n = Number(row.count ?? row.value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function resolveStatusParam(row: Record<string, unknown>): string | null {
  const raw = String(row.status ?? '').trim();
  if (/^[A-Z][A-Z0-9_]+$/.test(raw)) return raw;
  const label = String(row.stage ?? row.label ?? row.step ?? '').trim();
  return STATUS_LABEL_TO_PARAM[label] || null;
}

function projectSearchFromRow(row: Record<string, unknown>): string {
  const sl = row.slNo != null ? String(row.slNo).trim() : '';
  if (sl) return sl;
  const customer = row.customer != null ? String(row.customer).trim() : '';
  if (customer) return customer;
  const project = row.project != null ? String(row.project).trim() : '';
  const fromHash = project.match(/^#(\d+)/);
  if (fromHash?.[1]) return fromHash[1];
  return project.replace(/^#\d+\s*/, '').trim();
}

function sliceHrefForLabel(
  metric: ZenithNlMetric,
  label: string,
  entity: ReturnType<typeof entityHrefParams>,
  dateFilter: ZenithNlDateFilter,
): string | null {
  if (!label || label === 'Unknown' || label === 'None') return null;

  const revenueBase = {
    status: REVENUE_STATUS_LIST,
    zenithSlice: 'revenue' as const,
  };

  switch (metric) {
    case 'payment_status_breakdown': {
      const paymentStatus = PAYMENT_LABEL_TO_PARAM[label];
      return paymentStatus
        ? buildZenithNlProjectsHref(
            withEntity({ paymentStatus: [paymentStatus] }, entity),
            dateFilter,
          )
        : null;
    }
    case 'revenue_by_lead_source': {
      const leadSource = LEAD_SOURCE_LABEL_TO_PARAM[label] || LEAD_LABEL_TO_ENUM[label];
      return leadSource
        ? buildZenithNlProjectsHref(
            withEntity({ ...revenueBase, leadSource: [leadSource] }, entity),
            dateFilter,
          )
        : null;
    }
    case 'revenue_by_project_type': {
      const type = PROJECT_TYPE_LABEL_TO_PARAM[label];
      return type
        ? buildZenithNlProjectsHref(withEntity({ ...revenueBase, type: [type] }, entity), dateFilter)
        : null;
    }
    case 'revenue_by_customer_type': {
      const customerType = CUSTOMER_TYPE_LABEL_TO_PARAM[label];
      return customerType
        ? buildZenithNlProjectsHref(
            withEntity({ ...revenueBase, customerType: [customerType] }, entity),
            dateFilter,
          )
        : null;
    }
    case 'panel_brand_mix':
      return buildZenithNlProjectsHref(
        withEntity({ ...revenueBase, panelBrand: label }, entity),
        dateFilter,
      );
    case 'inverter_brand_mix':
      return buildZenithNlProjectsHref(
        withEntity({ ...revenueBase, inverterBrand: label }, entity),
        dateFilter,
      );
    case 'loan_bank_breakdown':
      return buildZenithNlProjectsHref(
        withEntity(
          {
            availingLoan: true,
            financingBank: [label.toUpperCase().replace(/\s+/g, '_')],
          },
          entity,
        ),
        dateFilter,
      );
    case 'loan_vs_cash_revenue': {
      const lower = label.toLowerCase();
      const isLoan = lower.includes('loan') && !lower.includes('not');
      return isLoan
        ? buildZenithNlProjectsHref(
            withEntity({ ...revenueBase, availingLoan: true }, entity),
            dateFilter,
          )
        : buildZenithNlProjectsHref(
            withEntity({ ...revenueBase, notAvailingLoan: true }, entity),
            dateFilter,
          );
    }
    case 'pipeline_by_stage':
    case 'install_by_status': {
      const status = STATUS_LABEL_TO_PARAM[label];
      return status
        ? buildZenithNlProjectsHref(withEntity({ status: [status] }, entity), dateFilter)
        : null;
    }
    case 'project_stage_mix': {
      const projectStage = PROJECT_STAGE_LABEL_TO_PARAM[label];
      return projectStage
        ? buildZenithNlProjectsHref(withEntity({ projectStage }, entity), dateFilter)
        : null;
    }
    case 'service_type_mix': {
      const projectServiceType = SERVICE_TYPE_LABEL_TO_PARAM[label];
      return projectServiceType
        ? buildZenithNlProjectsHref(
            withEntity({ projectServiceType: [projectServiceType] }, entity),
            dateFilter,
          )
        : null;
    }
    case 'panel_type_mix':
      return buildZenithNlProjectsHref(
        withEntity({ ...revenueBase, panelType: label }, entity),
        dateFilter,
      );
    case 'roof_type_mix':
      return buildZenithNlProjectsHref(withEntity({ roofType: label }, entity), dateFilter);
    case 'system_type_mix': {
      const systemType = SYSTEM_TYPE_LABEL_TO_PARAM[label];
      return systemType
        ? buildZenithNlProjectsHref(
            withEntity({ ...revenueBase, systemType }, entity),
            dateFilter,
          )
        : null;
    }
    case 'capacity_by_band': {
      const band = CAPACITY_BAND_TO_RANGE[label];
      if (!band) return null;
      return buildZenithNlProjectsHref(
        withEntity(
          {
            ...revenueBase,
            capacityMin: band.min,
            ...(band.max != null ? { capacityMax: band.max } : {}),
          },
          entity,
        ),
        dateFilter,
      );
    }
    case 'sla_indicator_mix': {
      if (!['GREEN', 'AMBER', 'RED'].includes(label.toUpperCase())) return null;
      return buildZenithNlProjectsHref(
        withEntity({ statusIndicator: label.toUpperCase() }, entity),
        dateFilter,
      );
    }
    case 'ops_workload':
      return label === 'Unassigned'
        ? null
        : buildZenithNlProjectsHref(
            withEntity(
              {
                status: ['CONFIRMED', 'UNDER_INSTALLATION', 'SUBMITTED_FOR_SUBSIDY'],
                opsName: label,
              },
              entity,
            ),
            dateFilter,
          );
    case 'revenue_by_salesperson':
    case 'outstanding_by_salesperson':
    case 'tickets_by_salesperson':
      if (label === 'Unassigned') {
        return buildZenithNlProjectsHref(
          withEntity(
            {
              ...(metric === 'revenue_by_salesperson' ? revenueBase : {}),
              ...(metric === 'outstanding_by_salesperson'
                ? { paymentStatus: ['PENDING', 'PARTIAL'] }
                : {}),
              salespersonUnassigned: true,
            },
            entity,
          ),
          dateFilter,
        );
      }
      return buildZenithNlProjectsHref(
        withEntity(
          {
            ...(metric === 'revenue_by_salesperson' ? revenueBase : {}),
            ...(metric === 'outstanding_by_salesperson'
              ? { paymentStatus: ['PENDING', 'PARTIAL'] }
              : {}),
            salespersonName: label,
          },
          entity,
        ),
        dateFilter,
      );
    case 'hub_plant_link_summary': {
      const linked = label.toLowerCase().includes('linked') && !label.toLowerCase().includes('not');
      const notLinked = label.toLowerCase().includes('not');
      if (!linked && !notLinked) return null;
      return buildZenithNlProjectsHref(
        withEntity({ hubPlantLinked: linked && !notLinked }, entity),
        dateFilter,
      );
    }
    case 'installation_model_status': {
      const installationStatus = INSTALL_STATUS_LABEL_TO_PARAM[label];
      return installationStatus
        ? buildZenithNlProjectsHref(withEntity({ installationStatus }, entity), dateFilter)
        : null;
    }
    case 'payment_mode_mix': {
      const paymentMode = PAYMENT_MODE_LABEL_TO_PARAM[label];
      return paymentMode
        ? buildZenithNlProjectsHref(withEntity({ paymentMode }, entity), dateFilter)
        : null;
    }
    case 'proposal_engine_buckets': {
      const pe = PE_BUCKET_LABEL_TO_PARAM[label];
      return pe ? buildZenithNlProjectsHref({ peBucket: pe }, dateFilter) : null;
    }
    case 'support_tickets_summary': {
      const lower = label.toLowerCase();
      if (lower.includes('overdue')) return '/support-tickets?filter=overdue';
      if (lower.includes('open')) return '/support-tickets?filter=open';
      if (lower.includes('progress')) return '/support-tickets?filter=in-progress';
      if (lower.includes('closed')) return '/support-tickets?filter=closed';
      if (lower.includes('hub') || lower.includes('consumer')) {
        return '/support-tickets?filter=hub';
      }
      return '/support-tickets';
    }
    case 'revenue_by_city':
      return buildZenithNlProjectsHref(
        withEntity({ ...revenueBase, city: label }, entity),
        dateFilter,
      );
    case 'lost_competition_breakdown':
      return buildZenithNlProjectsHref(withEntity({ status: ['LOST'] }, entity), dateFilter);
    default:
      return null;
  }
}

/**
 * Attach per-row / per-series `href` drill-downs for Ask charts and tables.
 * Every non-empty table row gets a Projects (or Support Tickets) link when possible.
 */
export function attachAskDrillHrefs(
  metric: ZenithNlMetric,
  viz: ZenithNlViz,
  intent: ZenithNlIntent,
  dateFilter: ZenithNlDateFilter,
): ZenithNlViz {
  if (metric === 'help_lookup') return viz;
  const entity = entityHrefParams(intent);
  const cohortHref = projectsHrefForIntent(metric, intent, dateFilter);

  if (viz.kind === 'table') {
    return {
      ...viz,
      rows: viz.rows.map((row) => {
        if (typeof row.href === 'string' && row.href) return row;
        const asRec = row as Record<string, unknown>;

        // 1) Compliance gap rows
        if (metric === 'compliance_backlog') {
          if (rowCount(asRec) <= 0) return row;
          const gap =
            parseComplianceGap(row.gap) || complianceGapFromStepLabel(String(row.step ?? ''));
          if (!gap) return row;
          return {
            ...row,
            href: buildZenithNlProjectsHref({ complianceGap: gap, type: ['SUBSIDY'] }, dateFilter),
          };
        }

        // 2) Status / stage buckets (pipeline, install, subsidy funnel)
        if (
          metric === 'pipeline_by_stage' ||
          metric === 'install_by_status' ||
          metric === 'subsidy_funnel'
        ) {
          if (rowCount(asRec) <= 0) return row;
          const status = resolveStatusParam(asRec);
          if (!status) return row;
          return {
            ...row,
            href: buildZenithNlProjectsHref(
              withEntity(
                {
                  status: [status],
                  ...(metric === 'subsidy_funnel' ? { type: ['SUBSIDY'] } : {}),
                },
                entity,
              ),
              dateFilter,
            ),
          };
        }

        // 3) Proposal Engine buckets
        if (metric === 'proposal_engine_buckets') {
          if (rowCount(asRec) <= 0) return row;
          const pe = PE_BUCKET_LABEL_TO_PARAM[String(row.bucket ?? row.label ?? '')];
          if (!pe) return row;
          return {
            ...row,
            href: buildZenithNlProjectsHref({ peBucket: pe }, dateFilter),
          };
        }

        // 4) Lost deals → Lost status on Projects
        if (metric === 'lost_deals_summary' || metric === 'lost_competition_breakdown') {
          if (rowCount(asRec) <= 0) return row;
          return {
            ...row,
            href: buildZenithNlProjectsHref(withEntity({ status: ['LOST'] }, entity), dateFilter),
          };
        }

        // 5) Project list rows (slNo / customer)
        if (PROJECT_LIST_ROW_METRICS.has(metric)) {
          const q = projectSearchFromRow(asRec);
          if (!q) return cohortHref ? { ...row, href: cohortHref } : row;
          return {
            ...row,
            href: buildZenithNlProjectsHref(withEntity({ search: q }, entity), dateFilter),
          };
        }

        // 6) Chart-forced-to-table: use label column
        const label = String(row.label ?? row.stage ?? row.step ?? row.bucket ?? row.reason ?? '').trim();
        if (label) {
          const skipZero =
            row.count != null ||
            (typeof row.value === 'number' &&
              metric !== 'profit_summary' &&
              metric !== 'period_compare' &&
              metric !== 'capacity_sold' &&
              metric !== 'ticket_resolution_time');
          if (skipZero && rowCount(asRec) <= 0) return row;
          const fromLabel = sliceHrefForLabel(metric, label, entity, dateFilter);
          if (fromLabel) return { ...row, href: fromLabel };
        }

        // 7) Ticket summary tables
        if (TICKET_TABLE_METRICS.has(metric)) {
          return { ...row, href: '/support-tickets' };
        }

        // 8) Summary KPI tables (profit / capacity) → whole cohort
        if (cohortHref) {
          const hasSignal =
            row.metric != null ||
            row.label != null ||
            row.stage != null ||
            row.step != null ||
            row.bucket != null ||
            row.reason != null ||
            row.customer != null ||
            row.slNo != null ||
            rowCount(asRec) > 0;
          if (hasSignal) return { ...row, href: cohortHref };
        }

        return row;
      }),
    };
  }

  // Charts
  return {
    ...viz,
    series: viz.series.map((s) => {
      if (s.href) return s;
      if ((s.count ?? s.value) <= 0) return s;
      const href = sliceHrefForLabel(metric, s.label, entity, dateFilter) || cohortHref;
      return href ? { ...s, href } : s;
    }),
  };
}

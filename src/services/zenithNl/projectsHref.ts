import type { ZenithNlIntent, ZenithNlMetric } from './catalog';

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
    availingLoan?: boolean;
    financingBank?: string[];
    panelBrand?: string;
    inverterBrand?: string;
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
  if (params.availingLoan) search.append('availingLoan', 'true');
  params.financingBank?.forEach((v) => search.append('financingBank', v));
  if (params.panelBrand?.trim()) search.append('panelBrand', params.panelBrand.trim());
  if (params.inverterBrand?.trim()) search.append('inverterBrand', params.inverterBrand.trim());
  const q = params.search != null ? String(params.search).trim() : '';
  if (q !== '') search.append('search', q);
  dateFilter.selectedFYs.forEach((fy) => search.append('fy', fy));
  dateFilter.selectedQuarters.forEach((qq) => search.append('quarter', qq));
  dateFilter.selectedMonths.forEach((m) => search.append('month', m));
  const qs = search.toString();
  return qs ? `/projects?${qs}` : '/projects';
}

function entityHrefParams(intent: ZenithNlIntent): {
  panelBrand?: string;
  inverterBrand?: string;
  financingBank?: string[];
  availingLoan?: boolean;
} {
  const panelBrand = intent.filters?.panelBrand?.trim() || undefined;
  const inverterBrand = intent.filters?.inverterBrand?.trim() || undefined;
  const bank = intent.filters?.financingBank?.trim() || undefined;
  return {
    panelBrand,
    inverterBrand,
    financingBank: bank ? [bank] : undefined,
    availingLoan: bank || intent.filters?.availingLoan ? true : undefined,
  };
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
      return buildZenithNlProjectsHref(
        { status: [...PIPELINE_STATUSES], zenithSlice: 'pipeline' },
        dateFilter,
      );
    }
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
      return buildZenithNlProjectsHref(
        {
          status: st ? [st] : undefined,
          paymentStatus: ps ? [ps] : undefined,
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
    case 'availing_loan':
    case 'loan_bank_breakdown':
      return buildZenithNlProjectsHref(
        { availingLoan: true, ...entityHrefParams(intent) },
        dateFilter,
      );
    case 'panel_brand_mix':
      return buildZenithNlProjectsHref(
        { ...entityHrefParams(intent) },
        dateFilter,
      );
    default:
      return null;
  }
}

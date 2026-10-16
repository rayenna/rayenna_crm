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
    complianceGap?: ComplianceGapId;
    availingLoan?: boolean;
    financingBank?: string[];
    panelBrand?: string;
    inverterBrand?: string;
    type?: string[];
    customerType?: string[];
    projectServiceType?: string[];
    salespersonUnassigned?: boolean;
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
  if (params.complianceGap) search.append('complianceGap', params.complianceGap);
  if (params.availingLoan) search.append('availingLoan', 'true');
  params.financingBank?.forEach((v) => search.append('financingBank', v));
  if (params.panelBrand?.trim()) search.append('panelBrand', params.panelBrand.trim());
  if (params.inverterBrand?.trim()) search.append('inverterBrand', params.inverterBrand.trim());
  params.type?.forEach((v) => search.append('type', v));
  params.customerType?.forEach((v) => search.append('customerType', v));
  params.projectServiceType?.forEach((v) => search.append('projectServiceType', v));
  if (params.salespersonUnassigned) search.append('salespersonUnassigned', 'true');
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
  type?: string[];
  customerType?: string[];
  projectServiceType?: string[];
  salespersonUnassigned?: boolean;
} {
  const panelBrand = intent.filters?.panelBrand?.trim() || undefined;
  const inverterBrand = intent.filters?.inverterBrand?.trim() || undefined;
  const bank = intent.filters?.financingBank?.trim() || undefined;
  const projectType = intent.filters?.projectType?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const customerType = intent.filters?.customerType?.trim().toUpperCase();
  const service = intent.filters?.projectServiceType?.trim().toUpperCase().replace(/\s+/g, '_');
  return {
    panelBrand,
    inverterBrand,
    financingBank: bank ? [bank] : undefined,
    availingLoan: bank || intent.filters?.availingLoan ? true : undefined,
    type:
      projectType === 'SUBSIDY' || projectType === 'NON_SUBSIDY' ? [projectType] : undefined,
    customerType: customerType
      ? [customerType]
      : undefined,
    projectServiceType: service ? [service] : undefined,
    salespersonUnassigned: intent.filters?.salespersonUnassigned || undefined,
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
  'tickets_by_salesperson',
]);

const PROJECT_LIST_ROW_METRICS = new Set<ZenithNlMetric>([
  'outstanding_balance',
  'projects_list_slice',
  'cohort_summary',
  'availing_loan',
  'pending_subsidy',
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

  switch (metric) {
    case 'payment_status_breakdown': {
      const paymentStatus = PAYMENT_LABEL_TO_PARAM[label];
      return paymentStatus
        ? buildZenithNlProjectsHref({ paymentStatus: [paymentStatus], ...entity }, dateFilter)
        : null;
    }
    case 'revenue_by_lead_source': {
      const leadSource = LEAD_SOURCE_LABEL_TO_PARAM[label] || LEAD_LABEL_TO_ENUM[label];
      return leadSource
        ? buildZenithNlProjectsHref(
            {
              status: REVENUE_STATUS_LIST,
              zenithSlice: 'revenue',
              leadSource: [leadSource],
              ...entity,
            },
            dateFilter,
          )
        : null;
    }
    case 'revenue_by_project_type': {
      const type = PROJECT_TYPE_LABEL_TO_PARAM[label];
      return type
        ? buildZenithNlProjectsHref(
            { status: REVENUE_STATUS_LIST, zenithSlice: 'revenue', type: [type], ...entity },
            dateFilter,
          )
        : null;
    }
    case 'revenue_by_customer_type': {
      const customerType = CUSTOMER_TYPE_LABEL_TO_PARAM[label];
      return customerType
        ? buildZenithNlProjectsHref(
            {
              status: REVENUE_STATUS_LIST,
              zenithSlice: 'revenue',
              customerType: [customerType],
              ...entity,
            },
            dateFilter,
          )
        : null;
    }
    case 'panel_brand_mix':
      return buildZenithNlProjectsHref(
        {
          status: REVENUE_STATUS_LIST,
          zenithSlice: 'revenue',
          panelBrand: label,
          ...entity,
        },
        dateFilter,
      );
    case 'inverter_brand_mix':
      return buildZenithNlProjectsHref(
        {
          status: REVENUE_STATUS_LIST,
          zenithSlice: 'revenue',
          inverterBrand: label,
          ...entity,
        },
        dateFilter,
      );
    case 'loan_bank_breakdown':
      return buildZenithNlProjectsHref(
        {
          availingLoan: true,
          financingBank: [label.toUpperCase().replace(/\s+/g, '_')],
          ...entity,
        },
        dateFilter,
      );
    case 'loan_vs_cash_revenue':
      return label.toLowerCase().includes('loan')
        ? buildZenithNlProjectsHref(
            { status: REVENUE_STATUS_LIST, zenithSlice: 'revenue', availingLoan: true, ...entity },
            dateFilter,
          )
        : buildZenithNlProjectsHref(
            { status: REVENUE_STATUS_LIST, zenithSlice: 'revenue', ...entity },
            dateFilter,
          );
    case 'pipeline_by_stage':
    case 'install_by_status':
    case 'project_stage_mix': {
      const status = STATUS_LABEL_TO_PARAM[label];
      return status ? buildZenithNlProjectsHref({ status: [status], ...entity }, dateFilter) : null;
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
        {
          status: REVENUE_STATUS_LIST,
          zenithSlice: 'revenue',
          search: label,
          ...entity,
        },
        dateFilter,
      );
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
              {
                status: [status],
                ...(metric === 'subsidy_funnel' ? { type: ['SUBSIDY'] } : {}),
                ...entity,
              },
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
            href: buildZenithNlProjectsHref({ status: ['LOST'], ...entity }, dateFilter),
          };
        }

        // 5) Project list rows (slNo / customer)
        if (PROJECT_LIST_ROW_METRICS.has(metric)) {
          const q = projectSearchFromRow(asRec);
          if (!q) return cohortHref ? { ...row, href: cohortHref } : row;
          return {
            ...row,
            href: buildZenithNlProjectsHref({ search: q, ...entity }, dateFilter),
          };
        }

        // 6) Chart-forced-to-table: use label column
        const label = String(row.label ?? row.stage ?? row.step ?? row.bucket ?? row.reason ?? '').trim();
        if (label) {
          const skipZero =
            row.count != null ||
            (typeof row.value === 'number' &&
              metric !== 'profit_summary' &&
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

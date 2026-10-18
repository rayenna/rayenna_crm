import {
  CustomerType,
  ProjectServiceType,
  ProjectStage,
  ProjectType,
  SystemType,
  type Prisma,
} from '@prisma/client';
import { dataSenseNeedsReviewPrismaOr } from '../../utils/dataSense';
import type { ZenithNlIntent } from './catalog';

/** Common capacity bands (kW) for Ask mix + filters. */
export const CAPACITY_BANDS: { label: string; min: number; max: number | null }[] = [
  { label: 'Under 3 kW', min: 0, max: 2 },
  { label: '3–5 kW', min: 3, max: 5 },
  { label: '6–10 kW', min: 6, max: 10 },
  { label: 'Above 10 kW', min: 11, max: null },
];

const SERVICE_LABELS: Record<ProjectServiceType, string> = {
  [ProjectServiceType.EPC_PROJECT]: 'EPC Project',
  [ProjectServiceType.PANEL_CLEANING]: 'Panel Cleaning',
  [ProjectServiceType.MAINTENANCE]: 'Maintenance',
  [ProjectServiceType.REPAIR]: 'Repair',
  [ProjectServiceType.CONSULTING]: 'Consulting',
  [ProjectServiceType.RESALE]: 'Resale',
  [ProjectServiceType.OTHER_SERVICES]: 'Other Services',
};

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  [CustomerType.RESIDENTIAL]: 'Residential',
  [CustomerType.APARTMENT]: 'Apartment',
  [CustomerType.COMMERCIAL]: 'Commercial',
};

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  [ProjectType.SUBSIDY]: 'Subsidy',
  [ProjectType.NON_SUBSIDY]: 'Non-Subsidy',
};

const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  [SystemType.ON_GRID]: 'On-grid',
  [SystemType.OFF_GRID]: 'Off-grid',
  [SystemType.HYBRID]: 'Hybrid',
};

const ROOF_TYPES = [
  'Concrete-Flat',
  'Concrete-Sloped',
  'Tile',
  'Thatched',
  'Asbestos',
  'Metal',
  'Others',
] as const;

export function projectTypeLabel(t: ProjectType): string {
  return PROJECT_TYPE_LABELS[t] || t;
}
export function serviceTypeLabel(t: ProjectServiceType): string {
  return SERVICE_LABELS[t] || t;
}
export function customerTypeLabel(t: CustomerType): string {
  return CUSTOMER_TYPE_LABELS[t] || t;
}
export function systemTypeLabel(t: SystemType): string {
  return SYSTEM_TYPE_LABELS[t] || t;
}

export function parseProjectType(raw?: string | null): ProjectType | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/_/g, ' ');
  if (k === 'subsidy' || k === 'subsidised' || k === 'subsidized') return ProjectType.SUBSIDY;
  if (
    k === 'non subsidy' ||
    k === 'non-subsidy' ||
    k === 'nonsubsidy' ||
    k === 'non subsidised' ||
    k === 'non subsidized'
  ) {
    return ProjectType.NON_SUBSIDY;
  }
  const upper = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if ((Object.values(ProjectType) as string[]).includes(upper)) return upper as ProjectType;
  return undefined;
}

export function parseServiceType(raw?: string | null): ProjectServiceType | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/_/g, ' ');
  const map: Record<string, ProjectServiceType> = {
    epc: ProjectServiceType.EPC_PROJECT,
    'epc project': ProjectServiceType.EPC_PROJECT,
    'panel cleaning': ProjectServiceType.PANEL_CLEANING,
    cleaning: ProjectServiceType.PANEL_CLEANING,
    maintenance: ProjectServiceType.MAINTENANCE,
    repair: ProjectServiceType.REPAIR,
    consulting: ProjectServiceType.CONSULTING,
    resale: ProjectServiceType.RESALE,
    other: ProjectServiceType.OTHER_SERVICES,
    'other services': ProjectServiceType.OTHER_SERVICES,
  };
  if (map[k]) return map[k];
  const upper = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if ((Object.values(ProjectServiceType) as string[]).includes(upper)) {
    return upper as ProjectServiceType;
  }
  return undefined;
}

export function parseCustomerType(raw?: string | null): CustomerType | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toLowerCase();
  if (k.startsWith('resid')) return CustomerType.RESIDENTIAL;
  if (k.startsWith('apart')) return CustomerType.APARTMENT;
  if (k.startsWith('comm')) return CustomerType.COMMERCIAL;
  const upper = raw.trim().toUpperCase();
  if ((Object.values(CustomerType) as string[]).includes(upper)) return upper as CustomerType;
  return undefined;
}

export function parsePanelType(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (k === 'dcr') return 'DCR';
  if (k === 'non dcr' || k === 'non-dcr' || k === 'nondcr' || k === 'non dcr panels') {
    return 'Non-DCR';
  }
  if (raw.trim() === 'DCR' || raw.trim() === 'Non-DCR') return raw.trim();
  return undefined;
}

export function parseSystemType(raw?: string | null): SystemType | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (k.includes('hybrid')) return SystemType.HYBRID;
  if (k.includes('off')) return SystemType.OFF_GRID;
  if (k.includes('on')) return SystemType.ON_GRID;
  const upper = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if ((Object.values(SystemType) as string[]).includes(upper)) return upper as SystemType;
  return undefined;
}

export function parseRoofType(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const r of ROOF_TYPES) {
    if (r.toLowerCase() === k || r.toLowerCase().replace(/-/g, ' ') === k) return r;
  }
  if (k.includes('flat') && k.includes('concrete')) return 'Concrete-Flat';
  if (k.includes('slope') && k.includes('concrete')) return 'Concrete-Sloped';
  if (k.includes('tile')) return 'Tile';
  if (k.includes('thatch')) return 'Thatched';
  if (k.includes('asbestos')) return 'Asbestos';
  if (k.includes('metal') || k.includes('sheet')) return 'Metal';
  return undefined;
}

/** Parse phrases like "under 3 kW", "5-10 kW", "above 10 kW". */
export function parseCapacityBand(question: string): { min?: number; max?: number } | null {
  const q = question.toLowerCase();
  const under = q.match(/\b(?:under|below|less than|<)\s*(\d+(?:\.\d+)?)\s*kw\b/);
  if (under) {
    const n = Math.floor(Number(under[1]));
    if (Number.isFinite(n)) return { max: n - 1 >= 0 ? n - 1 : 0 };
  }
  const above = q.match(/\b(?:above|over|more than|>)\s*(\d+(?:\.\d+)?)\s*kw\b/);
  if (above) {
    const n = Math.ceil(Number(above[1]));
    if (Number.isFinite(n)) return { min: n + (q.includes('above') || q.includes('over') ? 1 : 0) };
  }
  const range = q.match(/\b(\d+)\s*[-–to]+\s*(\d+)\s*kw\b/);
  if (range) {
    const a = parseInt(range[1]!, 10);
    const b = parseInt(range[2]!, 10);
    if (Number.isFinite(a) && Number.isFinite(b)) return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const exact = q.match(/\b(\d+)\s*kw\b/);
  if (exact && /\b(exactly|only|=)\b/.test(q)) {
    const n = parseInt(exact[1]!, 10);
    if (Number.isFinite(n)) return { min: n, max: n };
  }
  return null;
}

export type ExtractedDimensions = {
  projectType?: ProjectType;
  projectServiceType?: ProjectServiceType;
  customerType?: CustomerType;
  panelType?: string;
  systemType?: SystemType;
  roofType?: string;
  capacityMin?: number;
  capacityMax?: number;
  salespersonName?: string;
  city?: string;
  opsName?: string;
  projectStage?: ProjectStage;
  statusIndicator?: string;
  leadSourceIsNull?: boolean;
  incentiveEligible?: boolean;
  hasDocuments?: boolean;
  lifecycleSpecsIncomplete?: boolean;
  dataSenseNeedsReview?: boolean;
  hubPlantLinked?: boolean;
  salespersonUnassigned?: boolean;
  wantsProjectTypeMix?: boolean;
  wantsCustomerTypeMix?: boolean;
  wantsServiceTypeMix?: boolean;
  wantsPanelTypeMix?: boolean;
  wantsRoofTypeMix?: boolean;
  wantsSystemTypeMix?: boolean;
  wantsCapacityBandMix?: boolean;
  wantsCityMix?: boolean;
  wantsOpsWorkload?: boolean;
  wantsStageMix?: boolean;
  wantsSlaMix?: boolean;
  wantsLostCompetition?: boolean;
  wantsLoanShare?: boolean;
  wantsProfitSummary?: boolean;
  wantsOutstandingBySales?: boolean;
  wantsTicketsBySales?: boolean;
  wantsCompliance?: boolean;
  wantsSubsidyFunnel?: boolean;
  wantsInstallModel?: boolean;
  wantsPaymentMode?: boolean;
  wantsUnpaidInvoices?: boolean;
  wantsAmcExpiring?: boolean;
  wantsTicketResolution?: boolean;
  wantsHubPlant?: boolean;
};

export function parseProjectStage(raw?: string | null): ProjectStage | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const map: Record<string, ProjectStage> = {
    survey: ProjectStage.SURVEY,
    proposal: ProjectStage.PROPOSAL,
    approved: ProjectStage.APPROVED,
    installation: ProjectStage.INSTALLATION,
    billing: ProjectStage.BILLING,
    live: ProjectStage.LIVE,
    amc: ProjectStage.AMC,
    lost: ProjectStage.LOST,
  };
  return map[k];
}

export function parseStatusIndicator(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const k = raw.trim().toUpperCase();
  if (k === 'GREEN' || k === 'AMBER' || k === 'RED') return k;
  if (/\bred\b/i.test(raw)) return 'RED';
  if (/\bamber\b|\byellow\b/i.test(raw)) return 'AMBER';
  if (/\bgreen\b/i.test(raw)) return 'GREEN';
  return undefined;
}

/**
 * Deterministic extraction of CRM dimensions from Ask free text.
 */
export function extractZenithDimensions(question: string): ExtractedDimensions {
  const q = question.trim();
  const lower = q.toLowerCase();
  const out: ExtractedDimensions = {};

  const comparingSubsidy =
    /\bsubsid/.test(lower) && /\bnon[-\s]?subsid/.test(lower) && /\b(vs|versus|mix|breakdown|share)\b/.test(lower);
  const comparingDcr =
    /\bdcr\b/.test(lower) && /\bnon[-\s]?dcr\b/.test(lower) && /\b(vs|versus|mix|breakdown|share)\b/.test(lower);

  if (!comparingSubsidy) {
    if (/\bnon[-\s]?subsid/.test(lower)) out.projectType = ProjectType.NON_SUBSIDY;
    else if (/\bsubsid/.test(lower) && !/\bpending\s+subsidy\b/.test(lower)) {
      out.projectType = ProjectType.SUBSIDY;
    }
  }

  if (!comparingDcr) {
    if (/\bnon[-\s]?dcr\b/.test(lower)) out.panelType = 'Non-DCR';
    else if (/\bdcr\b/.test(lower)) out.panelType = 'DCR';
  }

  if (/\bresidential\b/.test(lower)) out.customerType = CustomerType.RESIDENTIAL;
  else if (/\bapartment\b/.test(lower)) out.customerType = CustomerType.APARTMENT;
  else if (/\bcommercial\b/.test(lower)) out.customerType = CustomerType.COMMERCIAL;

  if (/\bpanel\s+cleaning\b|\bcleaning\s+jobs?\b/.test(lower)) {
    out.projectServiceType = ProjectServiceType.PANEL_CLEANING;
  } else if (/\bmaintenance\b/.test(lower) && !/\bbreak\b/.test(lower)) {
    out.projectServiceType = ProjectServiceType.MAINTENANCE;
  } else if (/\brepair\b/.test(lower)) {
    out.projectServiceType = ProjectServiceType.REPAIR;
  } else if (/\bepc\b/.test(lower)) {
    out.projectServiceType = ProjectServiceType.EPC_PROJECT;
  } else if (/\bconsulting\b/.test(lower)) {
    out.projectServiceType = ProjectServiceType.CONSULTING;
  } else if (/\bresale\b/.test(lower)) {
    out.projectServiceType = ProjectServiceType.RESALE;
  }

  if (/\bhybrid\b/.test(lower)) out.systemType = SystemType.HYBRID;
  else if (/\boff[-\s]?grid\b/.test(lower)) out.systemType = SystemType.OFF_GRID;
  else if (/\bon[-\s]?grid\b/.test(lower)) out.systemType = SystemType.ON_GRID;

  const roof = parseRoofType(
    lower.match(
      /\b((?:concrete[-\s]?(?:flat|sloped)|tile|thatched|asbestos|metal(?:\s+sheet)?|others?)\s+roofs?|roofs?\s+type\s+\w+)/,
    )?.[1] ||
      (/\bmetal\s+roofs?\b/.test(lower)
        ? 'Metal'
        : /\btile\s+roofs?\b/.test(lower)
          ? 'Tile'
          : /\bflat\s+(?:concrete\s+)?roofs?\b/.test(lower)
            ? 'Concrete-Flat'
            : undefined),
  );
  if (roof) out.roofType = roof;

  const band = parseCapacityBand(lower);
  if (band) {
    if (band.min != null) out.capacityMin = band.min;
    if (band.max != null) out.capacityMax = band.max;
  }

  const salesMatch =
    q.match(
      /\b(?:for|by|of)\s+sales(?:person|man)?\s+([A-Za-z][A-Za-z.\s]{1,40}?)(?:\?|$|,|\.|pipeline|projects|revenue|and\b)/i,
    ) ||
    q.match(/\b([A-Za-z][A-Za-z.\s]{1,30}?)(?:'s)?\s+pipeline\b/i) ||
    // “Ravi's under-installation unpaid” / “Anoop's confirmed projects”
    q.match(
      /\b([A-Za-z][A-Za-z]{1,28})(?:'s)\s+(?:under[\s-]?installation|confirmed|proposal|projects?|unpaid|payment|feasibility|timeline|outstanding)/i,
    );
  if (salesMatch?.[1]) {
    const name = salesMatch[1].trim().replace(/\s+/g, ' ');
    if (name.length >= 2 && !/^(my|the|our|all|this|last)$/i.test(name)) {
      out.salespersonName = name;
    }
  }

  const opsMatch =
    q.match(
      /\b(?:for|by|of|assigned\s+to)\s+ops(?:\s+person)?\s+([A-Za-z][A-Za-z.\s]{1,40}?)(?:\?|$|,|\.|and\b|projects?)/i,
    ) ||
    q.match(
      /\bops(?:\s+person)?\s+([A-Za-z][A-Za-z.\s]{1,30}?)\s+(?:projects?|workload|timeline|feasibility)/i,
    ) ||
    q.match(/\b([A-Za-z][A-Za-z]{1,28})(?:'s)\s+ops\b/i);
  if (opsMatch?.[1]) {
    const name = opsMatch[1].trim().replace(/\s+/g, ' ');
    if (name.length >= 2 && !/^(my|the|our|all|this|last|workload)$/i.test(name)) {
      out.opsName = name;
      // “Ravi's ops …” is ops, not salesperson
      if (out.salespersonName === name && /\bops\b/.test(lower) && !/\bsales/.test(lower)) {
        delete out.salespersonName;
      }
    }
  }

  const mixLike = /\b(mix|breakdown|share|vs|versus|by)\b/.test(lower);
  if (mixLike || /\bwhich\b/.test(lower)) {
    if (/\bsubsid/.test(lower) && /\b(non|vs|versus|mix|breakdown|share)\b/.test(lower)) {
      out.wantsProjectTypeMix = true;
    }
    if (/\b(customer\s+type|residential|commercial|apartment)\b/.test(lower) && mixLike) {
      out.wantsCustomerTypeMix = true;
    }
    if (/\b(service\s+type|epc|cleaning|maintenance)\b/.test(lower) && mixLike) {
      out.wantsServiceTypeMix = true;
    }
    if (/\bdcr\b/.test(lower) && mixLike) out.wantsPanelTypeMix = true;
    if (/\broof\b/.test(lower) && mixLike) out.wantsRoofTypeMix = true;
    if (/\b(system\s+type|on[-\s]?grid|off[-\s]?grid|hybrid)\b/.test(lower) && mixLike) {
      out.wantsSystemTypeMix = true;
    }
    if (/\b(capacity\s+band|kw\s+band|by\s+capacity|capacity\s+mix)\b/.test(lower)) {
      out.wantsCapacityBandMix = true;
    }
  }
  if (/\bsubsidy\s+vs\s+non/.test(lower) || /\bnon[-\s]?subsidy\s+vs\s+subsidy/.test(lower)) {
    out.wantsProjectTypeMix = true;
  }
  if (/\bdcr\s+vs\s+non/.test(lower) || /\bnon[-\s]?dcr\s+vs\s+dcr/.test(lower)) {
    out.wantsPanelTypeMix = true;
  }

  // P1/P2 signals
  if (/\b(by\s+city|top\s+cities|revenue\s+by\s+city|cities?\s+by\s+revenue)\b/.test(lower)) {
    out.wantsCityMix = true;
  }
  const cityMatch = q.match(/\b(?:in|at)\s+([A-Za-z][A-Za-z\s]{2,30}?)\b(?:\?|$|,)/);
  if (cityMatch?.[1] && !/\b(pipeline|progress|subsidy|loan|revenue|projects?)\b/i.test(cityMatch[1])) {
    // only if phrased as "projects in Kochi"
    if (/\b(?:projects?|customers?|deals?)\s+in\s+/i.test(q)) {
      out.city = cityMatch[1].trim();
    }
  }
  if (/\bprojects?\s+in\s+([A-Za-z][A-Za-z\s]{2,30})/i.test(q)) {
    out.city = q.match(/\bprojects?\s+in\s+([A-Za-z][A-Za-z\s]{2,30})/i)?.[1]?.trim();
  }

  if (/\b(ops\s+workload|by\s+ops|assigned\s+ops|ops\s+person)\b/.test(lower)) {
    out.wantsOpsWorkload = true;
  }
  if (/\b(project\s+stage|lifecycle\s+stage|stage\s+mix)\b/.test(lower)) {
    out.wantsStageMix = true;
  }
  const stage = parseProjectStage(
    lower.match(
      /\b(survey|proposal|approved|installation|billing|live|amc)\s+stage\b/,
    )?.[1],
  );
  if (stage) out.projectStage = stage;

  if (
    (/\b(sla|amber|red\s+projects?|green\s+sla)\b/.test(lower) && mixLike) ||
    /\bsla\s+status\b|\bstatus\s+indicators?\b/.test(lower)
  ) {
    out.wantsSlaMix = true;
  }
  if (/\bred\s+sla\b|\bsla\s+red\b/.test(lower)) out.statusIndicator = 'RED';
  else if (/\bamber\s+sla\b|\bsla\s+amber\b/.test(lower)) out.statusIndicator = 'AMBER';

  if (/\b(lost\s+to\s+competition|competition\s+reason|why\s+we\s+lose)\b/.test(lower)) {
    out.wantsLostCompetition = true;
  }
  if (/\b(loan\s+vs|loan\s+share|%?\s*on\s+loan|cash\s+vs\s+loan)\b/.test(lower)) {
    out.wantsLoanShare = true;
  }
  if (/\b(profit\s+summary|gross\s+profit|avg(erage)?\s+margin|collections?\s+summary)\b/.test(lower)) {
    out.wantsProfitSummary = true;
  }
  if (/\b(outstanding\s+by\s+sales|ar\s+by\s+sales|who\s+owns\s+the\s+(ar|balance))\b/.test(lower)) {
    out.wantsOutstandingBySales = true;
  }
  if (/\b(tickets?\s+by\s+sales|ticket\s+volume)\b/.test(lower)) {
    out.wantsTicketsBySales = true;
  }
  if (/\b(compliance\s+backlog|kseb|mnre\s+portal|registration\s+pending)\b/.test(lower)) {
    out.wantsCompliance = true;
  }
  if (/\bsubsidy\s+funnel\b/.test(lower)) out.wantsSubsidyFunnel = true;
  if (/\binstallation\s+records?\b|\binstaller\b/.test(lower)) out.wantsInstallModel = true;
  if (/\b(payment\s+mode|upi\s+vs|upi\s*\/\s*bank)\b/.test(lower)) out.wantsPaymentMode = true;
  if (/\bunpaid\s+invoices?\b/.test(lower)) out.wantsUnpaidInvoices = true;
  if (/\bamcs?\s+expir/.test(lower)) out.wantsAmcExpiring = true;
  if (/\b(resolution\s+time|days?\s+to\s+close|time\s+to\s+close)\b/.test(lower)) {
    out.wantsTicketResolution = true;
  }
  if (/\b(hub\s+plant|plant\s+link|unlinked\s+plants?|solis|deye\s+station)\b/.test(lower)) {
    out.wantsHubPlant = true;
  }
  if (/\b(no\s+salesperson|unassigned\s+salesperson|without\s+salesperson)\b/.test(lower)) {
    out.salespersonUnassigned = true;
  }
  if (/\b(no\s+lead\s+source|missing\s+lead\s+source|lead\s+source\s+null)\b/.test(lower)) {
    out.leadSourceIsNull = true;
  }
  if (/\bincentive\s+eligible\b/.test(lower)) out.incentiveEligible = true;
  if (/\b(missing\s+specs|lifecycle\s+specs\s+incomplete|incomplete\s+specs)\b/.test(lower)) {
    out.lifecycleSpecsIncomplete = true;
  }
  if (/\b(data\s*sense|needs?\s+review)\b/.test(lower) && !/\bprojects\s+needing\s+review\b/.test(lower)) {
    out.dataSenseNeedsReview = true;
  }
  if (/\b(with\s+documents|has\s+documents)\b/.test(lower)) out.hasDocuments = true;

  return out;
}

function pushAnd(where: Prisma.ProjectWhereInput, clause: Prisma.ProjectWhereInput): void {
  const existing = where.AND;
  if (Array.isArray(existing)) where.AND = [...existing, clause];
  else if (existing) where.AND = [existing as Prisma.ProjectWhereInput, clause];
  else where.AND = [clause];
}

/** Apply dimension filters from intent onto Prisma project where. */
export function applyZenithDimensionFilters(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
  opts?: { salespersonId?: string; opsId?: string },
): Prisma.ProjectWhereInput {
  const next: Prisma.ProjectWhereInput = { ...where };
  const f = intent.filters || {};

  const projectType = parseProjectType(f.projectType);
  if (projectType) pushAnd(next, { type: projectType });

  const service = parseServiceType(f.projectServiceType);
  if (service) pushAnd(next, { projectServiceType: service });

  const customerType = parseCustomerType(f.customerType);
  const city = f.city?.trim();
  if (customerType || city) {
    pushAnd(next, {
      customer: {
        ...(customerType ? { customerType } : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      },
    });
  }

  const panelType = parsePanelType(f.panelType);
  if (panelType) {
    pushAnd(next, { panelType: { equals: panelType, mode: 'insensitive' } });
  }

  const systemType = parseSystemType(f.systemType);
  if (systemType) pushAnd(next, { systemType });

  const roofType = parseRoofType(f.roofType);
  if (roofType) {
    pushAnd(next, { roofType: { equals: roofType, mode: 'insensitive' } });
  }

  const stage = parseProjectStage(f.projectStage);
  if (stage) pushAnd(next, { projectStage: stage });

  const indicator = parseStatusIndicator(f.statusIndicator);
  if (indicator) pushAnd(next, { statusIndicator: indicator });

  const capMin = typeof f.capacityMin === 'number' ? f.capacityMin : undefined;
  const capMax = typeof f.capacityMax === 'number' ? f.capacityMax : undefined;
  if (capMin != null || capMax != null) {
    const systemCapacity: { gte?: number; lte?: number } = {};
    if (capMin != null) systemCapacity.gte = capMin;
    if (capMax != null) systemCapacity.lte = capMax;
    pushAnd(next, { systemCapacity });
  }

  if (typeof f.panelCapacityWMin === 'number' || typeof f.panelCapacityWMax === 'number') {
    const panelCapacityW: { gte?: number; lte?: number } = {};
    if (typeof f.panelCapacityWMin === 'number') panelCapacityW.gte = f.panelCapacityWMin;
    if (typeof f.panelCapacityWMax === 'number') panelCapacityW.lte = f.panelCapacityWMax;
    pushAnd(next, { panelCapacityW });
  }
  if (typeof f.inverterCapacityKwMin === 'number' || typeof f.inverterCapacityKwMax === 'number') {
    const inverterCapacityKw: { gte?: number; lte?: number } = {};
    if (typeof f.inverterCapacityKwMin === 'number') {
      inverterCapacityKw.gte = f.inverterCapacityKwMin;
    }
    if (typeof f.inverterCapacityKwMax === 'number') {
      inverterCapacityKw.lte = f.inverterCapacityKwMax;
    }
    pushAnd(next, { inverterCapacityKw });
  }

  if (opts?.salespersonId) {
    pushAnd(next, { salespersonId: opts.salespersonId });
  } else if (f.salespersonUnassigned) {
    pushAnd(next, { salespersonId: null });
  }

  if (opts?.opsId) pushAnd(next, { assignedOpsId: opts.opsId });

  if (f.leadSourceIsNull) pushAnd(next, { leadSource: null });
  if (f.incentiveEligible) pushAnd(next, { incentiveEligible: true });

  if (f.hubPlantLinked === true) {
    pushAnd(next, {
      OR: [
        { solisStationId: { not: null } },
        { deyeStationId: { not: null } },
        { sunwaysStationId: { not: null } },
      ],
    });
  } else if (f.hubPlantLinked === false) {
    pushAnd(next, {
      solisStationId: null,
      deyeStationId: null,
      sunwaysStationId: null,
    });
  }

  if (f.lifecycleSpecsIncomplete) {
    pushAnd(next, {
      OR: [
        { panelBrand: null },
        { panelBrand: '' },
        { inverterBrand: null },
        { inverterBrand: '' },
        { systemCapacity: null },
      ],
    });
  }

  if (f.hasDocuments) {
    pushAnd(next, { documents: { some: {} } });
  }

  if (f.dataSenseNeedsReview) {
    pushAnd(next, dataSenseNeedsReviewPrismaOr(new Date()) as Prisma.ProjectWhereInput);
  }

  return next;
}

export function mergeDimensionsIntoIntent(
  intent: ZenithNlIntent,
  dims: ExtractedDimensions,
): ZenithNlIntent {
  const filters = { ...(intent.filters || {}) };
  if (dims.projectType) filters.projectType = dims.projectType;
  if (dims.projectServiceType) filters.projectServiceType = dims.projectServiceType;
  if (dims.customerType) filters.customerType = dims.customerType;
  if (dims.panelType) filters.panelType = dims.panelType;
  if (dims.systemType) filters.systemType = dims.systemType;
  if (dims.roofType) filters.roofType = dims.roofType;
  if (dims.capacityMin != null) filters.capacityMin = dims.capacityMin;
  if (dims.capacityMax != null) filters.capacityMax = dims.capacityMax;
  if (dims.salespersonName) filters.salespersonName = dims.salespersonName;
  if (dims.city) filters.city = dims.city;
  if (dims.opsName) filters.opsName = dims.opsName;
  if (dims.projectStage) filters.projectStage = dims.projectStage;
  if (dims.statusIndicator) filters.statusIndicator = dims.statusIndicator;
  if (dims.leadSourceIsNull) filters.leadSourceIsNull = true;
  if (dims.incentiveEligible) filters.incentiveEligible = true;
  if (dims.hasDocuments) filters.hasDocuments = true;
  if (dims.lifecycleSpecsIncomplete) filters.lifecycleSpecsIncomplete = true;
  if (dims.dataSenseNeedsReview) filters.dataSenseNeedsReview = true;
  if (dims.hubPlantLinked != null) filters.hubPlantLinked = dims.hubPlantLinked;
  if (dims.salespersonUnassigned) filters.salespersonUnassigned = true;
  return { ...intent, filters };
}

function pick(
  intent: ZenithNlIntent,
  metric: ZenithNlIntent['metric'],
  viz: 'chart' | 'table',
  chartType?: 'bar' | 'pie',
): ZenithNlIntent {
  return { ...intent, metric, viz, chartType };
}

export function salvageMetricFromDimensions(
  intent: ZenithNlIntent,
  dims: ExtractedDimensions,
  allowed: (metric: string) => boolean,
  question = '',
): ZenithNlIntent {
  const tryMetric = (
    flag: boolean | undefined,
    metric: ZenithNlIntent['metric'],
    viz: 'chart' | 'table',
    chartType?: 'bar' | 'pie',
  ) => {
    if (flag && allowed(metric)) return pick(intent, metric, viz, chartType);
    return null;
  };

  const q = question.toLowerCase().replace(/\s+/g, ' ').trim();
  const listLike =
    Boolean(q) &&
    /\b(list|show|all|which)\b/.test(q) &&
    /\bprojects?\b/.test(q) &&
    !/\b(vs|versus|mix|breakdown|share|how\s+many|revenue)\b/.test(q);

  return (
    (() => {
      if (!dims.wantsProjectTypeMix || !allowed('revenue_by_project_type')) return null;
      const profit = /\b(profit|margin|profitability)\b/.test(q);
      return {
        ...intent,
        metric: 'revenue_by_project_type' as const,
        viz: (profit ? 'table' : 'chart') as 'table' | 'chart',
        chartType: profit ? undefined : ('pie' as const),
        insightHints: profit
          ? 'subsidy vs non-subsidy profitability'
          : intent.insightHints || 'subsidy vs non-subsidy',
      };
    })() ||
    tryMetric(dims.wantsCustomerTypeMix, 'revenue_by_customer_type', 'chart', 'pie') ||
    tryMetric(dims.wantsServiceTypeMix, 'service_type_mix', 'chart', 'bar') ||
    tryMetric(dims.wantsPanelTypeMix, 'panel_type_mix', 'chart', 'pie') ||
    tryMetric(dims.wantsRoofTypeMix, 'roof_type_mix', 'chart', 'bar') ||
    tryMetric(dims.wantsSystemTypeMix, 'system_type_mix', 'chart', 'pie') ||
    tryMetric(dims.wantsCapacityBandMix, 'capacity_by_band', 'chart', 'bar') ||
    tryMetric(dims.wantsCityMix, 'revenue_by_city', 'chart', 'bar') ||
    tryMetric(dims.wantsOpsWorkload, 'ops_workload', 'chart', 'bar') ||
    tryMetric(dims.wantsStageMix, 'project_stage_mix', 'chart', 'bar') ||
    tryMetric(dims.wantsSlaMix, 'sla_indicator_mix', 'chart', 'pie') ||
    tryMetric(dims.wantsLostCompetition, 'lost_competition_breakdown', 'chart', 'bar') ||
    tryMetric(dims.wantsLoanShare, 'loan_vs_cash_revenue', 'chart', 'pie') ||
    tryMetric(dims.wantsProfitSummary, 'profit_summary', 'table') ||
    tryMetric(dims.wantsOutstandingBySales, 'outstanding_by_salesperson', 'chart', 'bar') ||
    tryMetric(dims.wantsTicketsBySales, 'tickets_by_salesperson', 'chart', 'bar') ||
    tryMetric(dims.wantsCompliance, 'compliance_backlog', 'table') ||
    tryMetric(dims.wantsSubsidyFunnel, 'subsidy_funnel', 'table') ||
    tryMetric(dims.wantsInstallModel, 'installation_model_status', 'chart', 'pie') ||
    tryMetric(dims.wantsPaymentMode, 'payment_mode_mix', 'chart', 'pie') ||
    tryMetric(dims.wantsUnpaidInvoices, 'unpaid_invoices', 'table') ||
    tryMetric(dims.wantsAmcExpiring, 'amc_expiring', 'table') ||
    tryMetric(dims.wantsTicketResolution, 'ticket_resolution_time', 'table') ||
    tryMetric(dims.wantsHubPlant, 'hub_plant_link_summary', 'chart', 'pie') ||
    (() => {
      const hasDim = Boolean(
        dims.projectType ||
          dims.projectServiceType ||
          dims.customerType ||
          dims.panelType ||
          dims.systemType ||
          dims.roofType ||
          dims.capacityMin != null ||
          dims.capacityMax != null ||
          dims.salespersonName ||
          dims.city ||
          dims.projectStage ||
          dims.statusIndicator ||
          dims.salespersonUnassigned ||
          dims.leadSourceIsNull ||
          dims.incentiveEligible ||
          dims.lifecycleSpecsIncomplete,
      );
      if (!hasDim) return intent;

      // “List all non-subsidy projects” → project list, not revenue mix / confirmed cohort.
      if (
        listLike &&
        dims.projectType &&
        !dims.wantsProjectTypeMix &&
        allowed('projects_list_slice') &&
        (intent.metric === 'clarify' ||
          intent.metric === 'projects_list_slice' ||
          intent.metric === 'cohort_summary' ||
          intent.metric === 'revenue_by_project_type')
      ) {
        const next = pick(intent, 'projects_list_slice', 'table');
        if (
          next.filters?.projectStatus &&
          !/\b(confirmed|proposal|under\s+installation|lead|completed|lost)\b/.test(q)
        ) {
          const { projectStatus: _drop, ...rest } = next.filters;
          return { ...next, filters: rest };
        }
        return next;
      }

      if (
        (intent.metric === 'clarify' || intent.metric === 'projects_list_slice') &&
        allowed('cohort_summary')
      ) {
        return pick(intent, 'cohort_summary', 'table');
      }
      return intent;
    })()
  );
}

export function capacityBandForKw(kw: number | null | undefined): string {
  if (kw == null || !Number.isFinite(kw)) return 'Unknown';
  for (const b of CAPACITY_BANDS) {
    if (kw >= b.min && (b.max == null || kw <= b.max)) return b.label;
  }
  return 'Unknown';
}

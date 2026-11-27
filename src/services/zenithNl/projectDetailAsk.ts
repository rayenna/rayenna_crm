/**
 * Ask Zenith — project detail lookup + ops/detail list slices
 * (payment timeline, compliance dates, documents, PE gaps, hub IDs, etc.)
 */
import {
  LostReason,
  type Prisma,
  ProjectStatus,
  ProjectType,
  UserRole,
} from '@prisma/client';
import prisma from '../../prisma';
import type { ZenithNlIntent, ZenithNlViz } from './catalog';
import { metricAllowedForRole } from './catalog';
import {
  buildLifecycleInstallationStatus,
  formatProjectStatusLifecycleLabel,
} from './lifecycleInstallationStatus';
import { isConfidentNameMatch, rankNameMatches } from './nameFuzzy';
import { projectsHrefForAskProjectIds } from './projectsHref';

const TABLE_CAP = 25;
const ALL_ASK: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
];

export const PROJECT_DETAIL_SLICES = [
  'payment_timeline',
  'advance_only',
  'no_p2',
  'feasibility_pending',
  'registration_pending',
  'mnre_pending',
  'subsidy_credit_pending',
  'commissioning',
  'commissioning_overdue',
  'remarks',
  'missing_documents',
  'missing_doc_kseb',
  'missing_doc_mnre',
  'missing_doc_agreement',
  'missing_survey',
  'missing_installation',
  'missing_invoice',
  'missing_crm_proposal',
  'missing_roof_layout',
  'pe_missing_costing',
  'pe_missing_bom',
  'pe_missing_roi',
  'pe_missing_proposal',
  'hub_station_ids',
  'hub_unlinked',
  'incentive_eligible',
  'panel_wattage',
  'lost_detail',
] as const;

export type ProjectDetailSlice = (typeof PROJECT_DETAIL_SLICES)[number];

function formatInr(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

const WORD_LIMITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
};

/** Parse “latest ten remarks” / “last 5 notes” — default 10, cap 25. */
export function parseLatestRemarksLimit(question: string): number {
  const q = norm(question);
  const m =
    q.match(
      /\b(?:last|latest|recent)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:project\s+)?(?:remarks?|notes?)\b/,
    ) ||
    q.match(
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:latest|recent|last)\s+(?:project\s+)?(?:remarks?|notes?)\b/,
    ) ||
    q.match(
      /\b(?:snap\s*shot|snapshot)\s+(?:of\s+)?(?:the\s+)?(?:last|latest|recent)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/,
    );
  if (!m?.[1]) return 10;
  const raw = m[1];
  const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : WORD_LIMITS[raw];
  if (!n || !Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(TABLE_CAP, n));
}

/** True when the ask is a chronological remarks feed, not a text search. */
export function isLatestRemarksSnapshotQuestion(question: string): boolean {
  const q = norm(question);
  if (!/\b(remarks?|notes?)\b/.test(q)) return false;
  if (/\b(mentioning|containing|about|with\s+text)\b/.test(q)) return false;
  if (/\blast\s+remarks?\s+on\s+sl\b/.test(q)) return false;
  return (
    /\b(last|latest|recent)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:project\s+)?(?:remarks?|notes?)\b/.test(
      q,
    ) ||
    /\b(snap\s*shot|snapshot)\b/.test(q) ||
    /\b(latest|last|recent)\s+(?:project\s+)?(?:remarks?|notes?)\b/.test(q) ||
    /\b(?:remarks?|notes?)\b.{0,40}\b(across|all)\s+(projects?|opportunities|deals)\b/.test(q) ||
    /\b(?:remarks?|notes?)\s+entered\b/.test(q)
  );
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return formatInr(Math.round(Number(n)));
}

function customerLabel(c: {
  firstName?: string | null;
  customerName?: string | null;
} | null): string {
  return c?.firstName?.trim() || c?.customerName?.trim() || 'Unknown';
}

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Parse “status of SL 123” / “project for Ramesh” → project_detail_lookup. */
export function matchProjectDetailLookupIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('project_detail_lookup', role)) return null;
  const q = norm(question);
  if (!q || q.length < 5) return null;

  const sl =
    q.match(/\b(?:sl\s*no\.?|sl\.?|project\s*#|#)\s*(\d{1,8})\b/) ||
    q.match(/\b(?:status|details?|show|what(?:'| i)?s|open)\b.{0,40}\b(?:sl\s*no\.?|sl\.?|#)\s*(\d{1,8})\b/) ||
    q.match(/\b(\d{1,6})\b.*\b(?:status|details?|payment|balance)\b/) ||
    q.match(/\b(?:status|details?|payment|balance)\b.*\b(\d{1,6})\b/);

  if (sl?.[1]) {
    return {
      metric: 'project_detail_lookup',
      viz: 'table',
      filters: { search: `SL:${sl[1]}` },
      insightHints: /\bremark/.test(q)
        ? `last remark SL ${sl[1]}`
        : `project SL ${sl[1]}`,
    };
  }

  // “last remark on SL 12” without other verbs — still SL lookup
  const remarkSl = q.match(/\b(?:last\s+)?remarks?\s+(?:on|for|of)\s+(?:sl\s*no\.?|sl\.?|#)?\s*(\d{1,8})\b/);
  if (remarkSl?.[1]) {
    return {
      metric: 'project_detail_lookup',
      viz: 'table',
      filters: { search: `SL:${remarkSl[1]}` },
      insightHints: `last remark SL ${remarkSl[1]}`,
    };
  }

  // Name lookup: require status/details/open/project-for — never bare “show …”
  // (avoids stealing “show Solis ID …” / “show payment timeline”).
  const named =
    q.match(
      /\b(?:what(?:'| i)?s\s+the\s+)?(?:status|details?)\s+(?:of|for|on)\s+(?:project\s+)?(?:for\s+|of\s+)?([a-z][a-z.\s'-]{1,40})$/,
    ) ||
    q.match(/\bopen\s+(?:project\s+)?(?:for\s+|of\s+)?([a-z][a-z.\s'-]{1,40})$/) ||
    q.match(/\bproject\s+(?:for|of)\s+([a-z][a-z.\s'-]{1,40})$/) ||
    q.match(/\b(?:status|details?)\s+(?:of\s+)?([a-z][a-z.\s'-]{1,40})\s+project\b/);

  if (named?.[1]) {
    const name = named[1].replace(/[.?!]+$/, '').trim();
    const blocked =
      /^(the|my|our|all|this|last|next|a|an|project|projects|status|payment|feasibility|documents?|hub|solis|deye|sunways|incentive|commissioning|remarks?|notes?)$/;
    if (name.length >= 2 && !blocked.test(name) && !/\b(solis|deye|sunways|panel|inverter)\b/.test(name)) {
      return {
        metric: 'project_detail_lookup',
        viz: 'table',
        filters: { search: name },
        insightHints: `project ${name}`,
      };
    }
  }

  return null;
}

/** Parse list-style detail gap questions → projects_ops_detail. */
export function matchProjectsOpsDetailIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('projects_ops_detail', role)) return null;
  const q = norm(question);
  if (!q || q.length < 6) return null;

  const slice = detectDetailSlice(q);
  if (!slice) return null;

  const filters: ZenithNlIntent['filters'] = { detailSlice: slice };

  const watt = q.match(/\b(\d{3,4})\s*w(?:att)?s?\b/);
  if (watt && (slice === 'panel_wattage' || /\bpanel/.test(q))) {
    const w = parseInt(watt[1]!, 10);
    filters.detailSlice = 'panel_wattage';
    filters.panelCapacityWMin = w;
    filters.panelCapacityWMax = w;
  }
  const ikw = q.match(/\b(\d{1,3})\s*k(?:w|ilowatt)\b.*\binverter|\binverter.{0,20}\b(\d{1,3})\s*k/);
  if (ikw) {
    const n = parseInt(ikw[1] || ikw[2] || '', 10);
    if (Number.isFinite(n)) {
      filters.detailSlice = 'panel_wattage'; // reuse wattage list path with inverter kw — handled in exec
      filters.inverterCapacityKwMin = n;
      filters.inverterCapacityKwMax = n;
    }
  }

  if (slice === 'remarks') {
    const limit = parseLatestRemarksLimit(q);
    filters.limit = limit;

    // Snapshot / latest-N feeds must not treat filler words as a text search
    // (bug: “remarks across Projects” → search “across Projects” → empty).
    if (!isLatestRemarksSnapshotQuestion(q)) {
      const remarkSearch =
        q.match(
          /\b(?:projects?\s+)?(?:mentioning|containing)\s+["']?([a-z0-9][\w\s.-]{1,40})["']?/,
        ) ||
        q.match(
          /\b(?:remarks?|notes?)\b(?:\s+(?:mentioning|containing|with|about|for))\s+["']?([a-z0-9][\w\s.-]{1,40})["']?/,
        );
      if (remarkSearch?.[1]) {
        const term = remarkSearch[1].trim();
        if (
          !/^(projects?|remarks?|notes?|on|for|of|sl|across|all|latest|last|recent|ten|five|snapshot|opportunities|deals|entered)$/i.test(
            term,
          )
        ) {
          filters.search = term;
        }
      }
    }
  }

  if (
    (slice === 'missing_documents' || slice.startsWith('missing_doc_')) &&
    /\bconfirmed\b/.test(q)
  ) {
    filters.projectStatus = 'CONFIRMED';
  }

  const hints =
    slice === 'remarks'
      ? filters.search
        ? `remarks matching ${filters.search}`
        : `latest ${filters.limit ?? 10} remarks`
      : slice.replace(/_/g, ' ');

  return {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters,
    insightHints: hints,
  };
}

function detectDetailSlice(q: string): ProjectDetailSlice | null {
  // Payment schedule gaps before generic timeline
  if (
    /\b(advance\s+only|only\s+advance|advance\s+(received\s+)?only|only\s+advance\s+received)\b/.test(
      q,
    )
  ) {
    return 'advance_only';
  }
  if (/\b(no\s+p2|without\s+p2|missing\s+p2|p2\s+(not\s+|still\s+)?(paid|received|done|entered))\b/.test(q)) {
    return 'no_p2';
  }
  if (/\b(payment\s+timeline|advance\s+(and|&)\s+p[123]|p1\s*[–\-]\s*p3|payment\s+schedule)\b/.test(q)) {
    return 'payment_timeline';
  }
  if (
    /\b(feasibility\s+(pending|missing|null|not\s+done)|no\s+feasibility|whose\s+feasibility|projects?\s+with\s+no\s+feasibility)\b/.test(
      q,
    )
  ) {
    return 'feasibility_pending';
  }
  if (
    /\b(registration\s+(pending|missing)|kseb\s+registration\s+pending|no\s+registration|projects?\s+with\s+no\s+registration)\b/.test(
      q,
    )
  ) {
    return 'registration_pending';
  }
  if (/\b(mnre\s+(pending|missing|portal)|no\s+mnre)\b/.test(q)) {
    return 'mnre_pending';
  }
  if (
    /\b(subsidy\s+(credit\s+)?pending|awaiting\s+subsidy\s+credit|subsidy\s+request(ed)?\s+(sent\s+)?not\s+credited|subsidy\s+requested\s+not\s+credited)\b/.test(
      q,
    )
  ) {
    return 'subsidy_credit_pending';
  }
  if (
    /\b(overdue\s+commission|commission(?:ing)?\s+overdue|overdue\s+(expected\s+)?go[\s-]?live)\b/.test(
      q,
    ) ||
    (/\b(commissioning|go[\s-]?live)\b/.test(q) && /\boverdue\b/.test(q))
  ) {
    return 'commissioning_overdue';
  }
  if (
    /\b(commissioning|expected\s+commissioning|site\s+address|go[\s-]?live)\b/.test(q) &&
    /\b(list|show|projects?|pending|missing)\b/.test(q)
  ) {
    return 'commissioning';
  }
  if (
    /\b(projects?\s+mentioning|mentioning\s+\w+|remarks?|internal\s+notes?|project\s+remarks?)\b/.test(
      q,
    ) &&
    !/\blast\s+remarks?\s+on\s+sl\b/.test(q)
  ) {
    return 'remarks';
  }
  if (
    /\b(missing|no|without)\s+(?:\w+\s+){0,3}documents?\b/.test(q) ||
    /\bprojects?\s+missing\s+docs?\b/.test(q) ||
    /\bconfirmed\s+projects?\s+with\s+no\s+documents?\b/.test(q)
  ) {
    if (/\bkseb\b/.test(q)) return 'missing_doc_kseb';
    if (/\bmnre\b/.test(q)) return 'missing_doc_mnre';
    if (/\b(agreement|contract)\b/.test(q)) return 'missing_doc_agreement';
    return 'missing_documents';
  }
  if (/\b(missing|no|without)\s+(site\s+)?surveys?\b/.test(q)) return 'missing_survey';
  if (/\b(missing|no|without)\s+installations?\b/.test(q)) return 'missing_installation';
  if (/\b(missing|no|without)\s+invoices?\b/.test(q)) return 'missing_invoice';
  if (/\b(missing|no|without)\s+(crm\s+)?proposals?\b/.test(q) && !/\bproposal\s+engine|pe\b/.test(q)) {
    return 'missing_crm_proposal';
  }
  if (/\b(missing|no|without)\s+roof\s+layouts?\b/.test(q)) return 'missing_roof_layout';
  if (/\b(missing|no|without)\s+(pe\s+)?costings?\b|\bpe\s+missing\s+costing\b/.test(q)) {
    return 'pe_missing_costing';
  }
  if (/\b(missing|no|without)\s+(pe\s+)?boms?\b|\bpe\s+missing\s+bom\b/.test(q)) {
    return 'pe_missing_bom';
  }
  if (/\b(missing|no|without)\s+(pe\s+)?rois?\b|\bpe\s+missing\s+roi\b/.test(q)) {
    return 'pe_missing_roi';
  }
  if (/\b(missing|no|without)\s+pe\s+proposals?\b|\bpe\s+missing\s+proposal\b/.test(q)) {
    return 'pe_missing_proposal';
  }
  if (
    /\b(unlinked|not\s+linked|no\s+hub|without\s+(a\s+)?(hub|plant|station))\b/.test(q) &&
    /\b(hub|plant|solis|deye|sunways|station)\b/.test(q)
  ) {
    return 'hub_unlinked';
  }
  if (
    /\b(hub\s+(station|plant)\s+ids?|solis\s+ids?|deye\s+ids?|sunways\s+ids?|show\s+.*\b(solis|deye|sunways)\b|linked\s+hub)\b/.test(
      q,
    )
  ) {
    return 'hub_station_ids';
  }
  if (/\b(incentive\s+eligible|eligible\s+for\s+incentive|incentive\s+projects?)\b/.test(q)) {
    return 'incentive_eligible';
  }
  if (/\b\d{3,4}\s*w(?:att)?s?\b/.test(q) && /\b(panel|module)/.test(q)) return 'panel_wattage';
  if (/\binverter\b/.test(q) && /\b\d{1,3}\s*k(?:w|ilowatt)\b/.test(q)) return 'panel_wattage';
  if (
    /\b(lost\s+(deal|project)\s+details?|lost\s+to\s+competition\s+details?|lost\s+reasons?\s+detail)\b/.test(
      q,
    ) ||
    (/\blost\b/.test(q) && /\b(competition\s+reason|other\s+reason|lost\s+reason)\b/.test(q))
  ) {
    return 'lost_detail';
  }
  return null;
}

export async function execProjectDetailLookup(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
  role: UserRole,
): Promise<{
  viz: ZenithNlViz;
  insight: string;
  projectsHref?: string;
  lookupMiss?: { query: string; suggestions: string[] };
}> {
  const raw = intent.filters?.search?.trim() || '';
  const slMatch = raw.match(/^SL:(\d+)$/i) || raw.match(/^(\d+)$/);
  let project =
    slMatch?.[1]
      ? await prisma.project.findFirst({
          where: { ...where, slNo: parseInt(slMatch[1], 10) },
          include: projectDetailInclude(role),
        })
      : null;

  if (!project && raw && !slMatch) {
    const tokens = raw
      .split(/[\s.,'-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 4);
    const nameOr: Prisma.ProjectWhereInput[] = [
      { customer: { customerName: { contains: raw, mode: 'insensitive' } } },
      { customer: { firstName: { contains: raw, mode: 'insensitive' } } },
      { customer: { lastName: { contains: raw, mode: 'insensitive' } } },
    ];
    // Also try significant tokens ("Ahmed", "Unni") — full "Ahmed Unni" rarely matches Ahammedunni.
    for (const t of tokens) {
      nameOr.push(
        { customer: { customerName: { contains: t, mode: 'insensitive' } } },
        { customer: { firstName: { contains: t, mode: 'insensitive' } } },
        { customer: { lastName: { contains: t, mode: 'insensitive' } } },
      );
    }
    const matches = await prisma.project.findMany({
      where: { ...where, OR: nameOr },
      include: projectDetailInclude(role),
      orderBy: { updatedAt: 'desc' },
      take: 25,
    });
    if (matches.length === 1) {
      project = matches[0]!;
    } else if (matches.length > 1) {
      // Re-rank token hits so a lone "Unni" / initial "N" does not win over Ahammedunni.
      const rankedHits = rankNameMatches(raw, matches, (p) => customerLabel(p.customer), {
        minScore: 0.55,
        limit: 5,
        getNames: (p) => [
          p.customer?.customerName,
          p.customer?.firstName,
          p.customer?.lastName,
          customerLabel(p.customer),
        ],
      });
      if (rankedHits.length === 1 || isConfidentNameMatch(rankedHits)) {
        project = rankedHits[0]!.item;
      } else if (rankedHits.length > 1) {
        return {
          insight: `Found ${rankedHits.length} close matches for “${raw}”. Pick one by SL No (e.g. “status of SL ${rankedHits[0]!.item.slNo}”).`,
          viz: {
            kind: 'table',
            title: 'Matching projects',
            columns: [
              { key: 'slNo', label: 'SL No' },
              { key: 'customer', label: 'Customer' },
              { key: 'stage', label: 'Status' },
              { key: 'value', label: 'Order (₹)' },
            ],
            rows: rankedHits.map((r) => ({
              slNo: r.item.slNo,
              customer: r.name,
              stage: r.item.projectStatus,
              value: Math.round(Number(r.item.projectCost) || 0),
              projectId: r.item.id,
              href: `/projects/${r.item.id}`,
            })),
          },
          projectsHref: `/projects?search=${encodeURIComponent(rankedHits[0]!.name)}`,
        };
      } else {
        // Token hits were all weak (e.g. only "N") — fall through to fuzzy pool.
      }
    }
  }

  if (!project && raw && !slMatch) {
    // Exact/contains missed — fuzzy nearest neighbour on customer names in scope.
    const pool = await prisma.project.findMany({
      where,
      select: {
        id: true,
        slNo: true,
        customer: { select: { firstName: true, customerName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 800,
    });
    const ranked = rankNameMatches(raw, pool, (p) => customerLabel(p.customer), {
      minScore: 0.62,
      limit: 5,
      // Score all name fields — firstName may be an initial ("N") while customerName is real.
      getNames: (p) => [
        p.customer?.customerName,
        p.customer?.firstName,
        p.customer?.lastName,
        customerLabel(p.customer),
      ],
    });
    if (ranked.length > 0 && isConfidentNameMatch(ranked)) {
      const hit = await prisma.project.findFirst({
        where: { ...where, id: ranked[0]!.item.id },
        include: projectDetailInclude(role),
      });
      if (hit) project = hit;
    } else if (ranked.length > 0) {
      // Keep as a real answer table (not lookupMiss) so Ask shows “Did you mean?” rows.
      return {
        insight: `No exact match for “${raw}”. Did you mean one of these? Tap a row or ask “status of SL …” / “status of {name}”.`,
        viz: {
          kind: 'table',
          title: 'Similar names',
          columns: [
            { key: 'slNo', label: 'SL No' },
            { key: 'customer', label: 'Customer' },
            { key: 'score', label: 'Match' },
          ],
          rows: ranked.map((r) => ({
            slNo: r.item.slNo,
            customer: r.name,
            score: `${Math.round(r.score * 100)}%`,
            projectId: r.item.id,
            href: `/projects/${r.item.id}`,
          })),
        },
        projectsHref: `/projects?search=${encodeURIComponent(ranked[0]!.name)}`,
      };
    }
  }

  if (!project) {
    const nearby = await prisma.project.findMany({
      where,
      select: {
        slNo: true,
        customer: { select: { firstName: true, customerName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    const suggestions = nearby
      .filter((p) => p.slNo != null)
      .slice(0, 3)
      .map((p) => `What's the status of SL ${p.slNo}?`);
    const label = raw.replace(/^SL:/i, 'SL ');
    return {
      insight: raw
        ? `No project found for “${raw}” under your filters.`
        : 'Ask for a project by SL No (e.g. “status of SL 123”) or customer name.',
      viz: {
        kind: 'table',
        title: 'Project detail',
        columns: [
          { key: 'field', label: 'Field' },
          { key: 'value', label: 'Value' },
        ],
        rows: [],
      },
      lookupMiss: raw ? { query: label, suggestions } : undefined,
    };
  }

  const docs = project.documents || [];
  const remarks = Array.isArray(project.projectRemarks) ? project.projectRemarks : [];
  const latestRemark = remarks[0] as { remark?: string; createdAt?: Date } | undefined;
  const pe = {
    costing: (project.peCostingSheets?.length || 0) > 0,
    bom: (project.peBomSheets?.length || 0) > 0,
    roi: (project.peRoiResults?.length || 0) > 0,
    proposal: (project.peProposals?.length || 0) > 0,
    roof: Boolean(project.roofLayout),
  };

  const installStatusLabel = buildLifecycleInstallationStatus(project);
  const projectStatusLabel = formatProjectStatusLifecycleLabel(project.projectStatus);

  const rows: { field: string; value: string }[] = [
    { field: 'SL No', value: String(project.slNo) },
    { field: 'Customer', value: customerLabel(project.customer) },
    { field: 'Project status', value: projectStatusLabel },
    { field: 'Installation status', value: installStatusLabel },
    {
      field: 'Payment status',
      value: project.paymentStatus?.replace(/_/g, ' ') || '—',
    },
    { field: 'Type', value: project.type === ProjectType.SUBSIDY ? 'Subsidy' : 'Non-Subsidy' },
    { field: 'Lifecycle stage', value: project.projectStage?.replace(/_/g, ' ') || '—' },
    { field: 'Order value', value: money(project.projectCost) },
    { field: 'Expected profit', value: money(project.expectedProfit) },
    { field: 'Gross profit', value: money(project.grossProfit) },
    { field: 'Final profit', value: money(project.finalProfit) },
    { field: 'Margin %', value: project.profitability != null ? `${project.profitability}%` : '—' },
    { field: 'Collected', value: money(project.totalAmountReceived) },
    { field: 'Balance', value: money(project.balanceAmount) },
    {
      field: 'Advance',
      value: `${money(project.advanceReceived)} · ${formatDate(project.advanceReceivedDate)}`,
    },
    { field: 'Payment 1', value: `${money(project.payment1)} · ${formatDate(project.payment1Date)}` },
    { field: 'Payment 2', value: `${money(project.payment2)} · ${formatDate(project.payment2Date)}` },
    { field: 'Payment 3', value: `${money(project.payment3)} · ${formatDate(project.payment3Date)}` },
    {
      field: 'Last payment',
      value: `${money(project.lastPayment)} · ${formatDate(project.lastPaymentDate)}`,
    },
    { field: 'Feasibility (KSEB)', value: formatDate(project.feasibilityDate) },
    { field: 'Registration (KSEB)', value: formatDate(project.registrationDate) },
    { field: 'MNRE portal', value: formatDate(project.mnrePortalRegistrationDate) },
    { field: 'Install complete', value: formatDate(project.installationCompletionDate) },
    {
      field: 'Net Meter Installation',
      value: formatDate(project.subsidyRequestDate),
    },
    { field: 'Subsidy credited', value: formatDate(project.subsidyCreditedDate) },
    {
      field: 'Expected commissioning',
      value: formatDate(project.expectedCommissioningDate),
    },
    { field: 'Site address', value: project.siteAddress?.trim() || '—' },
    {
      field: 'System',
      value: [
        project.systemCapacity != null ? `${project.systemCapacity} kW` : null,
        project.systemType?.replace(/_/g, ' '),
        project.panelBrand,
        project.panelCapacityW != null ? `${project.panelCapacityW}W` : null,
        project.inverterBrand,
        project.inverterCapacityKw != null ? `${project.inverterCapacityKw} kW inv` : null,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
    },
    {
      field: 'Loan / bank',
      value: project.availingLoan
        ? project.financingBank?.replace(/_/g, ' ') || 'Yes'
        : project.availingLoan === false
          ? 'No'
          : '—',
    },
    { field: 'Incentive eligible', value: project.incentiveEligible ? 'Yes' : 'No' },
    {
      field: 'Hub stations',
      value:
        [
          project.solisStationId ? `Solis ${project.solisStationId}` : null,
          project.deyeStationId ? `Deye ${project.deyeStationId}` : null,
          project.sunwaysStationId ? `Sunways ${project.sunwaysStationId}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Not linked',
    },
    {
      field: 'Documents',
      value: docs.length
        ? `${docs.length} (${[...new Set(docs.map((d) => d.category))].join(', ')})`
        : 'None',
    },
    {
      field: 'PE / layout',
      value: `Costing ${pe.costing ? '✓' : '—'} · BOM ${pe.bom ? '✓' : '—'} · ROI ${pe.roi ? '✓' : '—'} · PE proposal ${pe.proposal ? '✓' : '—'} · Roof ${pe.roof ? '✓' : '—'}`,
    },
    {
      field: 'CRM artifacts',
      value: `Survey ${project.siteSurveys?.length ? '✓' : '—'} · Install ${project.installations?.length ? '✓' : '—'} · Invoice ${project.invoices?.length ? '✓' : '—'} · Proposal ${project.proposals?.length ? '✓' : '—'}`,
    },
  ];

  if (project.projectStatus === ProjectStatus.LOST) {
    rows.push({
      field: 'Lost reason',
      value: [
        project.lostReason?.replace(/_/g, ' '),
        project.lostToCompetitionReason?.replace(/_/g, ' '),
        project.lostOtherReason,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
    });
  }

  if (role !== UserRole.FINANCE) {
    rows.push({
      field: 'Remarks',
      value: project.remarks?.trim() || '—',
    });
  }
  if (role === UserRole.SALES || role === UserRole.ADMIN || role === UserRole.MANAGEMENT) {
    rows.push({
      field: 'Internal notes',
      value: project.internalNotes?.trim() || '—',
    });
  }
  if (latestRemark) {
    rows.push({
      field: 'Latest project remark',
      value: `${formatDate(latestRemark.createdAt)} · ${latestRemark.remark?.slice(0, 160) || '—'}`,
    });
  }

  return {
    insight: `SL ${project.slNo} · ${customerLabel(project.customer)} · ${projectStatusLabel} · ${installStatusLabel} · payment ${(project.paymentStatus || '—').replace(/_/g, ' ')} · balance ${money(project.balanceAmount)}.`,
    viz: {
      kind: 'table',
      title: `Project SL ${project.slNo}`,
      columns: [
        { key: 'field', label: 'Field' },
        { key: 'value', label: 'Value' },
      ],
      rows,
    },
    projectsHref: `/projects/${project.id}`,
  };
}

function projectDetailInclude(role: UserRole) {
  return {
    customer: { select: { customerName: true, firstName: true, lastName: true } },
    documents: { select: { category: true }, take: 40 },
    siteSurveys: { select: { id: true }, take: 3 },
    installations: {
      select: { id: true, status: true },
      orderBy: { updatedAt: 'desc' as const },
      take: 5,
    },
    invoices: { select: { id: true }, take: 3 },
    proposals: { select: { id: true }, take: 3 },
    peCostingSheets: { select: { id: true }, take: 1 },
    peBomSheets: { select: { id: true }, take: 1 },
    peRoiResults: { select: { id: true }, take: 1 },
    peProposals: { select: { id: true }, take: 1 },
    roofLayout: { select: { id: true } },
    ...(role === UserRole.FINANCE
      ? {}
      : {
          projectRemarks: {
            select: { remark: true, createdAt: true },
            orderBy: { createdAt: 'desc' as const },
            take: 1,
          },
        }),
  };
}

export async function execProjectsOpsDetail(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const slice = (intent.filters?.detailSlice || '') as ProjectDetailSlice;
  if (!PROJECT_DETAIL_SLICES.includes(slice)) {
    return {
      insight: 'Try a detail list like “projects with feasibility pending” or “payment timeline”.',
      viz: emptyTable('Projects detail'),
    };
  }

  const statusFilter = intent.filters?.projectStatus?.trim();
  const statusOk =
    statusFilter &&
    (Object.values(ProjectStatus) as string[]).includes(statusFilter)
      ? (statusFilter as ProjectStatus)
      : undefined;

  const base: Prisma.ProjectWhereInput = {
    ...where,
    projectStatus:
      slice === 'lost_detail'
        ? ProjectStatus.LOST
        : statusOk
          ? statusOk
          : { not: ProjectStatus.LOST },
  };

  switch (slice) {
    case 'payment_timeline':
      return listPaymentTimeline(base);
    case 'advance_only':
      return listPaymentScheduleGap(base, 'advance_only');
    case 'no_p2':
      return listPaymentScheduleGap(base, 'no_p2');
    case 'feasibility_pending':
      return listComplianceDates(
        { ...base, type: ProjectType.SUBSIDY, feasibilityDate: null },
        'Feasibility pending',
        'feasibilityDate',
      );
    case 'registration_pending':
      return listComplianceDates(
        {
          ...base,
          type: ProjectType.SUBSIDY,
          feasibilityDate: { not: null },
          registrationDate: null,
        },
        'KSEB registration pending',
        'registrationDate',
      );
    case 'mnre_pending':
      return listComplianceDates(
        {
          ...base,
          type: ProjectType.SUBSIDY,
          installationCompletionDate: { not: null },
          mnrePortalRegistrationDate: null,
        },
        'MNRE portal pending',
        'mnrePortalRegistrationDate',
      );
    case 'subsidy_credit_pending':
      return listComplianceDates(
        {
          ...base,
          type: ProjectType.SUBSIDY,
          subsidyRequestDate: { not: null },
          subsidyCreditedDate: null,
          projectStatus: { not: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
        },
        'Subsidy credit pending',
        'subsidyRequestDate',
      );
    case 'commissioning':
      return listCommissioning(base, false);
    case 'commissioning_overdue':
      return listCommissioning(base, true);
    case 'remarks':
      return listRemarks(base, intent.filters?.search, intent.filters?.limit);
    case 'missing_documents':
      return listMissingRelation(base, 'documents', 'Missing documents');
    case 'missing_doc_kseb':
      return listMissingDocCategory(base, 'kseb', 'Missing KSEB documents');
    case 'missing_doc_mnre':
      return listMissingDocCategory(base, 'mnre', 'Missing MNRE documents');
    case 'missing_doc_agreement':
      return listMissingDocCategory(base, 'agreement', 'Missing agreement documents');
    case 'missing_survey':
      return listMissingRelation(base, 'siteSurveys', 'Missing site survey');
    case 'missing_installation':
      return listMissingRelation(base, 'installations', 'Missing installation record');
    case 'missing_invoice':
      return listMissingRelation(base, 'invoices', 'Missing invoice');
    case 'missing_crm_proposal':
      return listMissingRelation(base, 'proposals', 'Missing CRM proposal');
    case 'missing_roof_layout':
      return listMissingRoof(base);
    case 'pe_missing_costing':
      return listMissingPe(base, 'costing');
    case 'pe_missing_bom':
      return listMissingPe(base, 'bom');
    case 'pe_missing_roi':
      return listMissingPe(base, 'roi');
    case 'pe_missing_proposal':
      return listMissingPe(base, 'proposal');
    case 'hub_station_ids':
      return listHubIds(base, true);
    case 'hub_unlinked':
      return listHubIds(base, false);
    case 'incentive_eligible':
      return listIncentive(base);
    case 'panel_wattage':
      return listEquipmentCapacity(base, intent);
    case 'lost_detail':
      return listLostDetail({ ...where, projectStatus: ProjectStatus.LOST });
    default:
      return {
        insight: 'That detail slice is not available.',
        viz: emptyTable('Projects detail'),
      };
  }
}

function emptyTable(title: string): ZenithNlViz {
  return {
    kind: 'table',
    title,
    columns: [
      { key: 'slNo', label: 'SL No' },
      { key: 'customer', label: 'Customer' },
    ],
    rows: [],
  };
}

async function listPaymentTimeline(where: Prisma.ProjectWhereInput) {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      OR: [
        { advanceReceived: { gt: 0 } },
        { payment1: { gt: 0 } },
        { payment2: { gt: 0 } },
        { payment3: { gt: 0 } },
        { lastPayment: { gt: 0 } },
        { balanceAmount: { gt: 0 } },
      ],
    },
    select: {
      slNo: true,
      paymentStatus: true,
      siteAddress: true,
      advanceReceived: true,
      advanceReceivedDate: true,
      payment1: true,
      payment1Date: true,
      payment2: true,
      payment2Date: true,
      payment3: true,
      payment3Date: true,
      lastPayment: true,
      lastPaymentDate: true,
      totalAmountReceived: true,
      balanceAmount: true,
      customer: { select: { customerName: true, firstName: true, city: true } },
    },
    orderBy: { balanceAmount: 'desc' },
    take: TABLE_CAP,
  });
  return {
    insight: projects.length
      ? `Payment timeline for ${projects.length} projects (showing up to ${TABLE_CAP}).`
      : 'No projects with payment activity match your filters.',
    viz: {
      kind: 'table' as const,
      title: 'Payment timeline',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'city', label: 'City' },
        { key: 'status', label: 'Status' },
        { key: 'advance', label: 'Advance' },
        { key: 'p1', label: 'P1' },
        { key: 'p2', label: 'P2' },
        { key: 'p3', label: 'P3' },
        { key: 'last', label: 'Last' },
        { key: 'balance', label: 'Balance (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        city: p.customer?.city || '—',
        status: p.paymentStatus,
        advance: `${money(p.advanceReceived)} ${formatDate(p.advanceReceivedDate)}`,
        p1: `${money(p.payment1)} ${formatDate(p.payment1Date)}`,
        p2: `${money(p.payment2)} ${formatDate(p.payment2Date)}`,
        p3: `${money(p.payment3)} ${formatDate(p.payment3Date)}`,
        last: `${money(p.lastPayment)} ${formatDate(p.lastPaymentDate)}`,
        balance: Math.round(Number(p.balanceAmount) || 0),
      })),
    },
  };
}

async function listPaymentScheduleGap(
  where: Prisma.ProjectWhereInput,
  kind: 'advance_only' | 'no_p2',
) {
  const gapWhere: Prisma.ProjectWhereInput =
    kind === 'advance_only'
      ? {
          ...where,
          advanceReceived: { gt: 0 },
          AND: [
            { OR: [{ payment1: null }, { payment1: { lte: 0 } }] },
            { OR: [{ payment2: null }, { payment2: { lte: 0 } }] },
            { OR: [{ payment3: null }, { payment3: { lte: 0 } }] },
          ],
        }
      : {
          ...where,
          OR: [{ payment2: null }, { payment2: { lte: 0 } }],
          AND: [
            {
              OR: [
                { advanceReceived: { gt: 0 } },
                { payment1: { gt: 0 } },
                { totalAmountReceived: { gt: 0 } },
              ],
            },
          ],
        };

  const projects = await prisma.project.findMany({
    where: gapWhere,
    select: {
      slNo: true,
      projectStatus: true,
      paymentStatus: true,
      siteAddress: true,
      advanceReceived: true,
      advanceReceivedDate: true,
      payment1: true,
      payment1Date: true,
      payment2: true,
      payment2Date: true,
      balanceAmount: true,
      customer: { select: { customerName: true, firstName: true, city: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_CAP,
  });
  const title = kind === 'advance_only' ? 'Advance only (no P1–P3)' : 'No P2 received';
  return {
    insight: projects.length
      ? `${title}: ${projects.length} projects (up to ${TABLE_CAP}).`
      : `No projects match “${title}”.`,
    viz: {
      kind: 'table' as const,
      title,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'city', label: 'City' },
        { key: 'stage', label: 'Stage' },
        { key: 'pay', label: 'Payment' },
        { key: 'advance', label: 'Advance' },
        { key: 'p1', label: 'P1' },
        { key: 'p2', label: 'P2' },
        { key: 'balance', label: 'Balance (₹)' },
        { key: 'address', label: 'Site' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        city: p.customer?.city || '—',
        stage: p.projectStatus,
        pay: p.paymentStatus,
        advance: `${money(p.advanceReceived)} ${formatDate(p.advanceReceivedDate)}`,
        p1: `${money(p.payment1)} ${formatDate(p.payment1Date)}`,
        p2: `${money(p.payment2)} ${formatDate(p.payment2Date)}`,
        balance: Math.round(Number(p.balanceAmount) || 0),
        address: (p.siteAddress || '—').slice(0, 60),
      })),
    },
  };
}

async function listComplianceDates(
  where: Prisma.ProjectWhereInput,
  title: string,
  highlight: string,
) {
  const projects = await prisma.project.findMany({
    where,
    select: {
      slNo: true,
      projectStatus: true,
      siteAddress: true,
      feasibilityDate: true,
      registrationDate: true,
      mnrePortalRegistrationDate: true,
      installationCompletionDate: true,
      subsidyRequestDate: true,
      subsidyCreditedDate: true,
      customer: { select: { customerName: true, firstName: true, city: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_CAP,
  });
  return {
    insight: projects.length
      ? `${title}: ${projects.length} project${projects.length === 1 ? '' : 's'} (up to ${TABLE_CAP}). Highlight: ${highlight}.`
      : `No projects match “${title}”.`,
    viz: {
      kind: 'table' as const,
      title,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'city', label: 'City' },
        { key: 'status', label: 'Status' },
        { key: 'feas', label: 'Feasibility' },
        { key: 'reg', label: 'Registration' },
        { key: 'mnre', label: 'MNRE' },
        { key: 'install', label: 'Install done' },
        { key: 'subReq', label: 'Subsidy req' },
        { key: 'subCred', label: 'Credited' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        city: p.customer?.city || '—',
        status: p.projectStatus,
        feas: formatDate(p.feasibilityDate),
        reg: formatDate(p.registrationDate),
        mnre: formatDate(p.mnrePortalRegistrationDate),
        install: formatDate(p.installationCompletionDate),
        subReq: formatDate(p.subsidyRequestDate),
        subCred: formatDate(p.subsidyCreditedDate),
      })),
    },
  };
}

async function listCommissioning(where: Prisma.ProjectWhereInput, overdueOnly: boolean) {
  const now = new Date();
  const projects = await prisma.project.findMany({
    where: overdueOnly
      ? {
          ...where,
          expectedCommissioningDate: { lt: now, not: null },
          projectStatus: {
            notIn: [
              ProjectStatus.COMPLETED,
              ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
              ProjectStatus.LOST,
            ],
          },
        }
      : {
          ...where,
          OR: [
            { expectedCommissioningDate: { not: null } },
            { siteAddress: { not: null } },
          ],
        },
    select: {
      slNo: true,
      projectStatus: true,
      expectedCommissioningDate: true,
      siteAddress: true,
      customer: { select: { customerName: true, firstName: true, city: true } },
    },
    orderBy: { expectedCommissioningDate: 'asc' },
    take: TABLE_CAP,
  });
  const title = overdueOnly ? 'Overdue commissioning' : 'Commissioning & site';
  return {
    insight: projects.length
      ? `${title}: ${projects.length} projects.`
      : overdueOnly
        ? 'No overdue commissioning dates match your filters (date bar can limit to this quarter / FY).'
        : 'No commissioning dates or site addresses match your filters.',
    viz: {
      kind: 'table' as const,
      title,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'city', label: 'City' },
        { key: 'status', label: 'Status' },
        { key: 'commission', label: 'Expected commissioning' },
        { key: 'address', label: 'Site address' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        city: p.customer?.city || '—',
        status: p.projectStatus,
        commission: formatDate(p.expectedCommissioningDate),
        address: (p.siteAddress || '—').slice(0, 80),
      })),
    },
  };
}

/**
 * Latest project remarks feed (ProjectRemark rows), newest first.
 * `where` already includes salesperson scope for Sales — so they only see their deals.
 */
async function listRemarks(
  where: Prisma.ProjectWhereInput,
  search?: string,
  limit?: number,
) {
  const q = search?.trim();
  const take = Math.max(1, Math.min(TABLE_CAP, limit && limit > 0 ? Math.floor(limit) : 10));

  const remarks = await prisma.projectRemark.findMany({
    where: {
      project: where,
      ...(q ? { remark: { contains: q, mode: 'insensitive' } } : {}),
    },
    select: {
      remark: true,
      createdAt: true,
      user: { select: { name: true } },
      project: {
        select: {
          id: true,
          slNo: true,
          customer: { select: { customerName: true, firstName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  const projectIds = remarks.map((r) => r.project.id);
  const projectsHref = projectsHrefForAskProjectIds(projectIds) || undefined;

  return {
    insight: remarks.length
      ? `Latest ${remarks.length} project remark${remarks.length === 1 ? '' : 's'}${
          q ? ` matching “${q}”` : ''
        } (newest first).`
      : q
        ? `No remarks match “${q}”.`
        : 'No project remarks found for your scope.',
    viz: {
      kind: 'table' as const,
      title: 'Latest project remarks',
      columns: [
        { key: 'when', label: 'When' },
        { key: 'slNo', label: 'SL No' },
        { key: 'project', label: 'Project' },
        { key: 'remark', label: 'Remark' },
        { key: 'by', label: 'By' },
      ],
      rows: remarks.map((r) => ({
        when: formatDateTime(r.createdAt),
        slNo: r.project.slNo,
        project: customerLabel(r.project.customer),
        // Full text — Ask UI truncates with ellipsis and shows tip on hover.
        remark: (r.remark || '—').trim() || '—',
        by: r.user?.name?.trim() || '—',
        projectId: r.project.id,
        href: `/projects/${r.project.id}`,
      })),
    },
    projectsHref,
  };
}

async function listMissingRelation(
  where: Prisma.ProjectWhereInput,
  relation: 'documents' | 'siteSurveys' | 'installations' | 'invoices' | 'proposals',
  title: string,
) {
  const projects = await prisma.project.findMany({
    where: { ...where, [relation]: { none: {} } },
    select: {
      slNo: true,
      projectStatus: true,
      projectCost: true,
      siteAddress: true,
      customer: { select: { customerName: true, firstName: true, city: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_CAP,
  });
  return {
    insight: projects.length
      ? `${title}: ${projects.length} projects (up to ${TABLE_CAP}).`
      : `No projects match “${title}”.`,
    viz: {
      kind: 'table' as const,
      title,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'city', label: 'City' },
        { key: 'status', label: 'Status' },
        { key: 'value', label: 'Order (₹)' },
        { key: 'address', label: 'Site' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        city: p.customer?.city || '—',
        status: p.projectStatus,
        value: Math.round(Number(p.projectCost) || 0),
        address: (p.siteAddress || '—').slice(0, 60),
      })),
    },
  };
}

async function listMissingDocCategory(
  where: Prisma.ProjectWhereInput,
  category: string,
  title: string,
) {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      documents: { none: { category: { equals: category, mode: 'insensitive' } } },
    },
    select: {
      slNo: true,
      projectStatus: true,
      customer: { select: { customerName: true, firstName: true } },
      documents: { select: { category: true }, take: 10 },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_CAP,
  });
  return {
    insight: projects.length
      ? `${title}: ${projects.length} projects.`
      : `Every matching project already has a ${category} document (or none match filters).`,
    viz: {
      kind: 'table' as const,
      title,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'status', label: 'Status' },
        { key: 'have', label: 'Doc categories present' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        status: p.projectStatus,
        have: p.documents.map((d) => d.category).join(', ') || '—',
      })),
    },
  };
}

async function listMissingRoof(where: Prisma.ProjectWhereInput) {
  const projects = await prisma.project.findMany({
    where: { ...where, roofLayout: null },
    select: {
      slNo: true,
      projectStatus: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    take: TABLE_CAP,
    orderBy: { updatedAt: 'desc' },
  });
  return {
    insight: projects.length
      ? `Missing roof layout: ${projects.length} projects.`
      : 'No projects missing roof layout.',
    viz: {
      kind: 'table' as const,
      title: 'Missing roof layout',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'status', label: 'Status' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        status: p.projectStatus,
      })),
    },
  };
}

async function listMissingPe(
  where: Prisma.ProjectWhereInput,
  kind: 'costing' | 'bom' | 'roi' | 'proposal',
) {
  const all = await prisma.project.findMany({
    where,
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    take: 2000,
  });
  const ids = all.map((p) => p.id);
  if (!ids.length) {
    return { insight: 'No projects match.', viz: emptyTable(`PE missing ${kind}`) };
  }
  const [cost, bom, roi, prop] = await Promise.all([
    prisma.pECostingSheet.findMany({
      where: { projectId: { in: ids } },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
    prisma.pEBomSheet.findMany({
      where: { projectId: { in: ids } },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
    prisma.pERoiResult.findMany({
      where: { projectId: { in: ids } },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
    prisma.pEProposal.findMany({
      where: { projectId: { in: ids } },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
  ]);
  const costSet = new Set(cost.map((x) => x.projectId));
  const bomSet = new Set(bom.map((x) => x.projectId));
  const roiSet = new Set(roi.map((x) => x.projectId));
  const propSet = new Set(prop.map((x) => x.projectId));
  const have =
    kind === 'costing' ? costSet : kind === 'bom' ? bomSet : kind === 'roi' ? roiSet : propSet;
  const missing = all.filter((p) => !have.has(p.id)).slice(0, TABLE_CAP);
  const mark = (ok: boolean) => (ok ? 'Ready' : 'Missing');
  return {
    insight: missing.length
      ? `PE missing ${kind}: ${missing.length} projects. Open Proposal on a row to jump into that CRM project.`
      : `No projects missing PE ${kind}.`,
    viz: {
      kind: 'table' as const,
      title: `PE checklist — missing ${kind}`,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'bom', label: 'BOM' },
        { key: 'roi', label: 'ROI' },
        { key: 'costing', label: 'Costing' },
        { key: 'proposal', label: 'Proposal' },
      ],
      rows: missing.map((p) => {
        const customer = customerLabel(p.customer);
        return {
          slNo: p.slNo,
          customer,
          bom: mark(bomSet.has(p.id)),
          roi: mark(roiSet.has(p.id)),
          costing: mark(costSet.has(p.id)),
          proposal: mark(propSet.has(p.id)),
          projectId: p.id,
          customerName: customer,
          stageStatus: p.projectStatus,
        };
      }),
    },
  };
}

async function listHubIds(where: Prisma.ProjectWhereInput, linked: boolean) {
  const projects = await prisma.project.findMany({
    where: linked
      ? {
          ...where,
          OR: [
            { solisStationId: { not: null } },
            { deyeStationId: { not: null } },
            { sunwaysStationId: { not: null } },
          ],
        }
      : {
          ...where,
          solisStationId: null,
          deyeStationId: null,
          sunwaysStationId: null,
        },
    select: {
      slNo: true,
      projectStatus: true,
      siteAddress: true,
      solisStationId: true,
      deyeStationId: true,
      sunwaysStationId: true,
      customer: { select: { customerName: true, firstName: true, city: true } },
    },
    take: TABLE_CAP,
    orderBy: { updatedAt: 'desc' },
  });
  const title = linked ? 'Hub station IDs (linked)' : 'Hub unlinked (no plant ID)';
  return {
    insight: projects.length
      ? `${title}: ${projects.length} projects.`
      : linked
        ? 'No linked Hub plant IDs match your filters.'
        : 'No unlinked projects match your filters.',
    viz: {
      kind: 'table' as const,
      title,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'city', label: 'City' },
        { key: 'status', label: 'Status' },
        { key: 'solis', label: 'Solis' },
        { key: 'deye', label: 'Deye' },
        { key: 'sunways', label: 'Sunways' },
        { key: 'address', label: 'Site' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        city: p.customer?.city || '—',
        status: p.projectStatus,
        solis: p.solisStationId || '—',
        deye: p.deyeStationId || '—',
        sunways: p.sunwaysStationId || '—',
        address: (p.siteAddress || '—').slice(0, 50),
      })),
    },
  };
}

async function listIncentive(where: Prisma.ProjectWhereInput) {
  const projects = await prisma.project.findMany({
    where: { ...where, incentiveEligible: true },
    select: {
      slNo: true,
      projectStatus: true,
      type: true,
      projectCost: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    take: TABLE_CAP,
    orderBy: { updatedAt: 'desc' },
  });
  return {
    insight: projects.length
      ? `${projects.length} incentive-eligible projects.`
      : 'No incentive-eligible projects match your filters.',
    viz: {
      kind: 'table' as const,
      title: 'Incentive eligible',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'value', label: 'Order (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        type: p.type === ProjectType.SUBSIDY ? 'Subsidy' : 'Non-Subsidy',
        status: p.projectStatus,
        value: Math.round(Number(p.projectCost) || 0),
      })),
    },
  };
}

async function listEquipmentCapacity(where: Prisma.ProjectWhereInput, intent: ZenithNlIntent) {
  const wMin = intent.filters?.panelCapacityWMin;
  const wMax = intent.filters?.panelCapacityWMax;
  const kMin = intent.filters?.inverterCapacityKwMin;
  const kMax = intent.filters?.inverterCapacityKwMax;
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      ...(wMin != null || wMax != null
        ? {
            panelCapacityW: {
              ...(wMin != null ? { gte: wMin } : {}),
              ...(wMax != null ? { lte: wMax } : {}),
            },
          }
        : {}),
      ...(kMin != null || kMax != null
        ? {
            inverterCapacityKw: {
              ...(kMin != null ? { gte: kMin } : {}),
              ...(kMax != null ? { lte: kMax } : {}),
            },
          }
        : {}),
    },
    select: {
      slNo: true,
      panelBrand: true,
      panelCapacityW: true,
      inverterBrand: true,
      inverterCapacityKw: true,
      projectCost: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    take: TABLE_CAP,
    orderBy: { updatedAt: 'desc' },
  });
  const label =
    wMin != null
      ? `${wMin}W panels`
      : kMin != null
        ? `${kMin} kW inverters`
        : 'Equipment capacity';
  return {
    insight: projects.length
      ? `${projects.length} projects with ${label}.`
      : `No projects match ${label}.`,
    viz: {
      kind: 'table' as const,
      title: label,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'panel', label: 'Panel' },
        { key: 'watts', label: 'W' },
        { key: 'inverter', label: 'Inverter' },
        { key: 'kw', label: 'Inv kW' },
        { key: 'value', label: 'Order (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        panel: p.panelBrand || '—',
        watts: p.panelCapacityW ?? '—',
        inverter: p.inverterBrand || '—',
        kw: p.inverterCapacityKw ?? '—',
        value: Math.round(Number(p.projectCost) || 0),
      })),
    },
  };
}

async function listLostDetail(where: Prisma.ProjectWhereInput) {
  const projects = await prisma.project.findMany({
    where,
    select: {
      slNo: true,
      lostReason: true,
      lostToCompetitionReason: true,
      lostOtherReason: true,
      lostDate: true,
      projectCost: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    orderBy: { lostDate: 'desc' },
    take: TABLE_CAP,
  });
  return {
    insight: projects.length
      ? `${projects.length} lost projects with reason detail.`
      : 'No lost projects match your filters.',
    viz: {
      kind: 'table' as const,
      title: 'Lost deal details',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'reason', label: 'Reason' },
        { key: 'competition', label: 'Competition / other' },
        { key: 'date', label: 'Lost date' },
        { key: 'value', label: 'Value (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: customerLabel(p.customer),
        reason:
          p.lostReason === LostReason.LOST_TO_COMPETITION
            ? 'Lost to competition'
            : p.lostReason?.replace(/_/g, ' ') || '—',
        competition:
          [p.lostToCompetitionReason?.replace(/_/g, ' '), p.lostOtherReason]
            .filter(Boolean)
            .join(' · ') || '—',
        date: formatDate(p.lostDate),
        value: Math.round(Number(p.projectCost) || 0),
      })),
    },
  };
}

/** Roles allowed for detail metrics (exported for catalog sync checks). */
export const PROJECT_DETAIL_ASK_ROLES = ALL_ASK;

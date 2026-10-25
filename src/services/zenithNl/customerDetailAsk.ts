/**
 * Ask Zenith — customer record lookup + customer list slices.
 */
import { CustomerType, SystemType, type Customer, type Prisma, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import {
  allEmailsFromCustomer,
  allPhonesFromCustomer,
} from '../../utils/consumerCustomerProfile';
import { getCustomerTypeChartLabel } from '../../utils/customerTypeCharts';
import { formatContactPersonName, parseContactsPayload } from '../../utils/customerContacts';
import type { ZenithNlIntent, ZenithNlViz } from './catalog';
import { metricAllowedForRole } from './catalog';
import { systemTypeLabel } from './dimensionFilters';

const TABLE_CAP = 25;

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

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(Number(n)));
  } catch {
    return `₹${Math.round(Number(n)).toLocaleString('en-IN')}`;
  }
}

function displayName(c: {
  customerName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  prefix?: string | null;
  companyName?: string | null;
}): string {
  const parts = [c.prefix, c.firstName, c.middleName, c.lastName]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  if (parts) return parts;
  if (c.companyName?.trim()) return c.companyName.trim();
  return c.customerName?.trim() || 'Unknown';
}

/** Format CRM phone/email JSON arrays and contactNumbers for Ask tables. */
export function formatCustomerPhones(c: {
  phone?: string | null;
  contactNumbers?: string | null;
  contacts?: unknown;
}): string {
  // Prisma Json may already be an array; parseContactsPayload also accepts string JSON.
  const contacts = parseContactsPayload(c.contacts);
  return allPhonesFromCustomer({ ...c, contacts } as Customer).join(', ') || '—';
}

export function formatCustomerEmails(c: {
  email?: string | null;
  contacts?: unknown;
}): string {
  const contacts = parseContactsPayload(c.contacts);
  return allEmailsFromCustomer({ ...c, contacts } as Customer).join(', ') || '—';
}

function formatAddress(c: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pinCode?: string | null;
}): string {
  const line1 = c.addressLine1?.trim();
  const line2 = c.addressLine2?.trim();
  const legacy = c.address?.trim();
  // Prefer structured lines; legacy `address` often duplicates them.
  const street = [line1, line2].filter(Boolean);
  const streetBits = street.length > 0 ? street : legacy ? [legacy] : [];
  const bits = [...streetBits, c.city, c.state, c.country, c.pinCode]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  return bits.length ? bits.join(', ') : '—';
}

function formatGst(c: { companyGst?: string | null; gstNumber?: string | null }): string {
  return (c.companyGst || c.gstNumber || '').trim() || '—';
}

function formatMap(c: { latitude?: number | null; longitude?: number | null }): string {
  if (c.latitude == null || c.longitude == null) return '—';
  if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return '—';
  return `${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`;
}

function contactPersonLabel(c: {
  contactPerson?: string | null;
  contacts?: unknown;
}): string {
  const legacy = c.contactPerson?.trim();
  if (legacy) return legacy;
  const named = parseContactsPayload(c.contacts)
    .map((entry) => formatContactPersonName(entry))
    .filter(Boolean);
  return named.join('; ') || '—';
}

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** “customer details for Ramesh” / “show customer CUST…” → customer_detail_lookup */
export function matchCustomerDetailLookupIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('customer_detail_lookup', role)) return null;
  const q = norm(question);
  if (!q || q.length < 5) return null;

  const named =
    q.match(
      /\b(?:customer\s+details?|details?\s+of\s+customer|show\s+customer|open\s+customer|customer\s+record)\s+(?:for\s+|of\s+)?([a-z][a-z0-9.\s'-]{1,40})$/,
    ) ||
    q.match(/\bwho\s+is\s+customer\s+([a-z][a-z0-9.\s'-]{1,40})$/) ||
    q.match(/\b(?:show|open|status\s+of)\s+customer\s+([a-z0-9][a-z0-9.\s'-]{1,40})$/);

  const idOnly = q.match(/\bcustomer\s+(?:id|#)\s*([a-z0-9]{4,12})\b/);

  const raw = (named?.[1] || idOnly?.[1] || '').replace(/[.?!]+$/, '').trim();
  if (!raw || raw.length < 2) return null;
  if (
    /^(the|my|our|all|this|a|an|list|search|details?|record|for|of)$/.test(raw)
  ) {
    return null;
  }

  return {
    metric: 'customer_detail_lookup',
    viz: 'table',
    filters: { search: raw },
    insightHints: `customer ${raw}`,
  };
}

/** Phrases that look like “in X” but are not city names (e.g. “in customer master”). */
function isNonCityPlacePhrase(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return /^(customer\s+master|the\s+customer\s+master|master|crm|the\s+crm|database|system|rayenna|customers?|accounts?|the\s+system)$/.test(
    t,
  );
}

function parseCustomerListType(q: string): 'RESIDENTIAL' | 'APARTMENT' | 'COMMERCIAL' | undefined {
  if (/\bapartments?\b/.test(q) || /\bhousing\s+societ/.test(q)) return 'APARTMENT';
  if (/\bcommercial\b/.test(q) || /\bbusiness(?:es)?\b/.test(q)) return 'COMMERCIAL';
  if (/\bresidential\b/.test(q) || /\bresidents?\b/.test(q)) return 'RESIDENTIAL';
  return undefined;
}

/** Project.systemType named in a customer-list question. */
function parseAskedSystemType(q: string): SystemType | undefined {
  if (/\bhybrids?\b/.test(q)) return SystemType.HYBRID;
  if (/\boff[-\s]?grids?\b/.test(q)) return SystemType.OFF_GRID;
  if (/\bon[-\s]?grids?\b/.test(q)) return SystemType.ON_GRID;
  return undefined;
}

/** “customers by system type” with no On-grid / Off-grid / Hybrid named. */
function wantsCustomersGroupedBySystemType(q: string): boolean {
  return (
    /\bsystem\s+types?\b/.test(q) &&
    /\b(by|group(?:ed)?|breakdown|mix|split)\b/.test(q) &&
    !parseAskedSystemType(q)
  );
}

/** List customers by city / type / salesperson / Customer Master. */
export function matchCustomersListIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('customers_list_slice', role)) return null;
  const q = norm(question);
  if (!/\b(list|show|all|which|find)\b/.test(q)) return null;
  // Avoid stealing project lists and customer detail.
  if (/\bprojects?\b/.test(q) && !/\bcustomers?\b/.test(q)) return null;
  if (/\b(customer\s+details?|customer\s+record|open\s+customer)\b/.test(q)) return null;

  const customerType = parseCustomerListType(q);
  const systemType = parseAskedSystemType(q);
  const groupBySystemType = wantsCustomersGroupedBySystemType(q);
  const mentionsCustomers = /\bcustomers?\b/.test(q);
  const mentionsCustomerMaster = /\bcustomer\s+master\b/.test(q);
  // “show all apartments” / “list commercial in customer master” need a customer-list signal.
  if (!customerType && !systemType && !groupBySystemType && !mentionsCustomers && !mentionsCustomerMaster) {
    return null;
  }

  const filters: ZenithNlIntent['filters'] = {};
  if (customerType) filters.customerType = customerType;
  if (systemType) filters.systemType = systemType;
  else if (groupBySystemType) filters.groupBy = 'systemType';

  // Prefer “in Kochi” / “city Kochi”; ignore “in customer master”.
  const cityMatch =
    q.match(/\bcity\s+([a-z][a-z\s-]{1,30})$/) ||
    q.match(/\b(?:in|from|at)\s+([a-z][a-z\s-]{1,40})$/);
  const cityRaw = cityMatch?.[1]?.trim();
  if (
    cityRaw &&
    !isNonCityPlacePhrase(cityRaw) &&
    !/\b(hybrids?|on[-\s]?grids?|off[-\s]?grids?|system\s+types?)\b/.test(cityRaw)
  ) {
    filters.city = cityRaw;
  }

  const sales = q.match(
    /\b(?:for|by)\s+sales(?:person|man)?\s+([a-z][a-z.\s]{1,40}?)(?:\?|$)/i,
  );
  if (sales?.[1]) filters.salespersonName = sales[1].trim();

  const hints = systemType
    ? `${systemTypeLabel(systemType).toLowerCase()} system customers`
    : groupBySystemType
      ? 'customers by system type'
      : customerType === 'APARTMENT'
        ? 'apartment customers'
        : customerType === 'COMMERCIAL'
          ? 'commercial customers'
          : customerType === 'RESIDENTIAL'
            ? 'residential customers'
            : 'customers list';

  return {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: Object.keys(filters).length ? filters : undefined,
    insightHints: hints,
  };
}

const customerDetailSelect = {
  id: true,
  customerId: true,
  customerName: true,
  prefix: true,
  firstName: true,
  middleName: true,
  lastName: true,
  customerType: true,
  phone: true,
  email: true,
  contactNumbers: true,
  contacts: true,
  contactPerson: true,
  city: true,
  state: true,
  country: true,
  address: true,
  addressLine1: true,
  addressLine2: true,
  pinCode: true,
  gstNumber: true,
  companyGst: true,
  consumerNumber: true,
  companyName: true,
  idProofType: true,
  idProofNumber: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  salesperson: { select: { name: true } },
  projects: {
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      type: true,
      systemCapacity: true,
      projectCost: true,
      balanceAmount: true,
      paymentStatus: true,
    },
    orderBy: { updatedAt: 'desc' as const },
    take: 8,
  },
  _count: { select: { projects: true } },
} satisfies Prisma.CustomerSelect;

export async function execCustomerDetailLookup(
  intent: ZenithNlIntent,
  opts?: { salespersonId?: string },
): Promise<{
  viz: ZenithNlViz;
  insight: string;
  projectsHref?: string;
  lookupMiss?: { query: string; suggestions: string[] };
}> {
  const raw = intent.filters?.search?.trim() || '';
  if (!raw) {
    return {
      insight: 'Ask for a customer by name or customer ID (e.g. “customer details for Ramesh”).',
      viz: emptyCustomerTable('Customer detail'),
    };
  }

  const nameOr: Prisma.CustomerWhereInput[] = [
    { customerId: { equals: raw, mode: 'insensitive' } },
    { customerName: { contains: raw, mode: 'insensitive' } },
    { firstName: { contains: raw, mode: 'insensitive' } },
    { lastName: { contains: raw, mode: 'insensitive' } },
    { phone: { contains: raw } },
    { contactNumbers: { contains: raw } },
    { email: { contains: raw, mode: 'insensitive' } },
  ];
  const where: Prisma.CustomerWhereInput = opts?.salespersonId
    ? { salespersonId: opts.salespersonId, OR: nameOr }
    : { OR: nameOr };

  const matches = await prisma.customer.findMany({
    where,
    select: customerDetailSelect,
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  if (matches.length === 0) {
    const nearby = await prisma.customer.findMany({
      where: opts?.salespersonId ? { salespersonId: opts.salespersonId } : {},
      select: { firstName: true, customerName: true },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    });
    const needle = raw.toLowerCase();
    const names = nearby
      .map((c) => displayName(c))
      .filter((n) => n && n !== 'Unknown')
      .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
    const ranked = names.sort((a, b) => {
      const as = a.toLowerCase().startsWith(needle.slice(0, 1)) ? 0 : 1;
      const bs = b.toLowerCase().startsWith(needle.slice(0, 1)) ? 0 : 1;
      return as - bs;
    });
    const suggestions = ranked.slice(0, 3).map((n) => `Customer details for ${n}`);
    return {
      insight: `No customer found for “${raw}”.`,
      viz: emptyCustomerTable('Customer detail'),
      projectsHref: `/customers?q=${encodeURIComponent(raw)}`,
      lookupMiss: { query: raw, suggestions },
    };
  }

  if (matches.length > 1) {
    return {
      insight: `Found ${matches.length} customers matching “${raw}”. Open one or refine the name.`,
      viz: {
        kind: 'table',
        title: 'Matching customers',
        columns: [
          { key: 'customerId', label: 'Customer ID' },
          { key: 'name', label: 'Name' },
          { key: 'city', label: 'City' },
          { key: 'phone', label: 'Phone' },
          { key: 'projects', label: 'Projects' },
        ],
        rows: matches.map((c) => ({
          customerId: c.customerId,
          name: displayName(c),
          city: c.city || '—',
          phone: formatCustomerPhones(c),
          projects: c._count.projects,
          href: `/customers/${c.id}`,
        })),
      },
      projectsHref: `/customers?q=${encodeURIComponent(raw)}`,
    };
  }

  const c = matches[0]!;
  const idProof =
    [c.idProofType, c.idProofNumber].map((p) => p?.trim()).filter(Boolean).join(' · ') || '—';

  const rows: { field: string; value: string; href?: string }[] = [
    { field: 'Customer ID', value: c.customerId },
    { field: 'Name', value: displayName(c) },
    { field: 'Type', value: getCustomerTypeChartLabel(c.customerType) },
    { field: 'Phone', value: formatCustomerPhones(c) },
    { field: 'Email', value: formatCustomerEmails(c) },
    { field: 'Contact person', value: contactPersonLabel(c) },
    { field: 'Company', value: c.companyName?.trim() || '—' },
    { field: 'GST', value: formatGst(c) },
    { field: 'Consumer no.', value: c.consumerNumber?.trim() || '—' },
    { field: 'City', value: c.city?.trim() || '—' },
    { field: 'Address', value: formatAddress(c) },
    { field: 'Map', value: formatMap(c) },
    { field: 'ID proof', value: idProof },
    { field: 'Salesperson', value: c.salesperson?.name || '—' },
    { field: 'Created', value: formatDate(c.createdAt) },
    { field: 'Projects', value: String(c._count.projects) },
  ];

  const linkedOrder = c.projects.reduce((s, p) => s + (Number(p.projectCost) || 0), 0);
  const linkedBalance = c.projects.reduce((s, p) => s + (Number(p.balanceAmount) || 0), 0);
  rows.push({
    field: 'Linked projects value',
    value: `${money(linkedOrder)} order · ${money(linkedBalance)} balance (latest ${c.projects.length} shown)`,
  });

  for (const p of c.projects) {
    const size =
      p.systemCapacity != null && Number.isFinite(p.systemCapacity)
        ? `${p.systemCapacity} kW`
        : null;
    const type = p.type?.replace(/_/g, ' ') || null;
    const bits = [
      p.projectStatus.replace(/_/g, ' '),
      type,
      size,
      money(p.projectCost),
      p.paymentStatus,
      `bal ${money(p.balanceAmount)}`,
    ].filter(Boolean);
    rows.push({
      field: `Project SL ${p.slNo}`,
      value: bits.join(' · '),
      href: `/projects/${p.id}`,
    });
  }

  return {
    insight: `${displayName(c)} (${c.customerId}) · ${getCustomerTypeChartLabel(c.customerType)} · ${c.city || 'no city'} · ${c._count.projects} project${c._count.projects === 1 ? '' : 's'} · ${money(linkedOrder)} linked order.`,
    viz: {
      kind: 'table',
      title: `Customer ${c.customerId}`,
      columns: [
        { key: 'field', label: 'Field' },
        { key: 'value', label: 'Value' },
      ],
      rows,
    },
    projectsHref: `/customers/${c.id}`,
  };
}

const SYSTEM_TYPES = [SystemType.ON_GRID, SystemType.OFF_GRID, SystemType.HYBRID] as const;

function askedSystemType(raw?: string | null): SystemType | undefined {
  const st = raw?.trim().toUpperCase();
  if (st === SystemType.ON_GRID || st === SystemType.OFF_GRID || st === SystemType.HYBRID) return st;
  return undefined;
}

async function execCustomersBySystemType(
  salespersonId?: string,
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const scope: Prisma.CustomerWhereInput = salespersonId ? { salespersonId } : {};
  const rows = await Promise.all(
    SYSTEM_TYPES.map(async (systemType) => {
      const [customers, projects] = await Promise.all([
        prisma.customer.count({
          where: { ...scope, projects: { some: { systemType } } },
        }),
        prisma.project.count({
          where: {
            systemType,
            ...(salespersonId ? { customer: { salespersonId } } : {}),
          },
        }),
      ]);
      return {
        system: systemTypeLabel(systemType),
        customers,
        projects,
        href: `/projects?systemType=${systemType}`,
      };
    }),
  );
  const [unset, unsetProjects] = await Promise.all([
    prisma.customer.count({
      where: {
        ...scope,
        NOT: { projects: { some: { systemType: { not: null } } } },
      },
    }),
    prisma.project.count({
      where: {
        systemType: null,
        ...(salespersonId ? { customer: { salespersonId } } : {}),
      },
    }),
  ]);
  rows.push({
    system: 'No system type',
    customers: unset,
    projects: unsetProjects,
    href: '/customers',
  });

  const named = rows
    .filter((r) => r.system !== 'No system type')
    .map((r) => `${r.system} ${r.customers}`)
    .join(' · ');

  return {
    insight: `Customers by system type · ${named}. ${unset} customer${unset === 1 ? '' : 's'} have no system type on a project. A customer with more than one type is counted in each. Click a row to open those projects.`,
    viz: {
      kind: 'table',
      title: 'Customers by system type',
      columns: [
        { key: 'system', label: 'System type' },
        { key: 'customers', label: 'Customers' },
        { key: 'projects', label: 'Projects' },
      ],
      rows,
    },
    projectsHref: '/projects',
  };
}

export async function execCustomersListSlice(
  intent: ZenithNlIntent,
  opts?: { salespersonId?: string },
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const systemType = askedSystemType(intent.filters?.systemType);
  if (intent.filters?.groupBy === 'systemType' && !systemType) {
    return execCustomersBySystemType(opts?.salespersonId);
  }

  const where: Prisma.CustomerWhereInput = {};
  const city = intent.filters?.city?.trim();
  if (city) where.city = { contains: city, mode: 'insensitive' };
  const ct = intent.filters?.customerType?.trim().toUpperCase();
  if (ct === 'APARTMENT' || ct === 'COMMERCIAL') {
    where.customerType = ct;
  } else if (ct === 'RESIDENTIAL') {
    // Customer Master treats blank type as Residential.
    where.OR = [{ customerType: CustomerType.RESIDENTIAL }, { customerType: null }];
  }
  if (opts?.salespersonId) where.salespersonId = opts.salespersonId;
  if (systemType) where.projects = { some: { systemType } };

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      customerId: true,
      customerName: true,
      firstName: true,
      middleName: true,
      lastName: true,
      prefix: true,
      companyName: true,
      customerType: true,
      city: true,
      phone: true,
      contactNumbers: true,
      contacts: true,
      salesperson: { select: { name: true } },
      projects: systemType
        ? { where: { systemType }, select: { systemType: true } }
        : false,
      _count: { select: { projects: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_CAP,
  });

  const typeLabel =
    ct === 'APARTMENT'
      ? 'apartment'
      : ct === 'COMMERCIAL'
        ? 'commercial'
        : ct === 'RESIDENTIAL'
          ? 'residential'
          : null;
  const systemLabel = systemType ? systemTypeLabel(systemType) : null;

  const totalMatching = await prisma.customer.count({ where });

  const customersHref = (() => {
    if (systemType) return `/projects?systemType=${systemType}`;
    const params = new URLSearchParams();
    // Customer Master list reads `type` from the URL.
    if (ct === 'RESIDENTIAL' || ct === 'APARTMENT' || ct === 'COMMERCIAL') {
      params.set('type', ct);
    }
    if (city) params.set('q', city);
    const qs = params.toString();
    return qs ? `/customers?${qs}` : '/customers';
  })();

  const noun = systemLabel
    ? `customer${totalMatching === 1 ? '' : 's'} with a ${systemLabel} system`
    : typeLabel
      ? `${typeLabel} customer${totalMatching === 1 ? '' : 's'}`
      : `customer${totalMatching === 1 ? '' : 's'}`;
  const scopeBits = [city ? `in ${city}` : null, intent.filters?.salespersonName ? `for ${intent.filters.salespersonName}` : null]
    .filter(Boolean)
    .join(' · ');
  const place = systemLabel ? '' : ' in Customer Master';

  return {
    insight: customers.length
      ? `${totalMatching} ${noun}${scopeBits ? ` ${scopeBits}` : ''}${place}${
          customers.length < totalMatching
            ? ` · showing ${customers.length} (up to ${TABLE_CAP})`
            : ` · all shown`
        }. Click a row to open the record.`
      : systemLabel
        ? `No customers${scopeBits ? ` ${scopeBits}` : ''} have a ${systemLabel} system on a project.`
        : `No ${typeLabel ? `${typeLabel} customers` : 'customers'}${scopeBits ? ` ${scopeBits}` : ''} match in Customer Master.`,
    viz: {
      kind: 'table',
      title: systemLabel
        ? `${systemLabel} customers`
        : typeLabel
          ? `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)} customers`
          : 'Customers',
      columns: [
        { key: 'customerId', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        ...(systemLabel ? [{ key: 'system', label: 'System' }] : []),
        { key: 'city', label: 'City' },
        { key: 'phone', label: 'Phone' },
        { key: 'sales', label: 'Salesperson' },
        { key: 'projects', label: 'Projects' },
      ],
      rows: customers.map((c) => ({
        customerId: c.customerId,
        name: displayName(c),
        type: getCustomerTypeChartLabel(c.customerType ?? CustomerType.RESIDENTIAL),
        ...(systemLabel
          ? {
              system: systemLabel,
              projects: 'projects' in c && Array.isArray(c.projects) ? c.projects.length : c._count.projects,
            }
          : { projects: c._count.projects }),
        city: c.city || '—',
        phone: formatCustomerPhones(c),
        sales: c.salesperson?.name || '—',
        href: `/customers/${c.id}`,
      })),
    },
    projectsHref: customersHref,
  };
}

function emptyCustomerTable(title: string): ZenithNlViz {
  return {
    kind: 'table',
    title,
    columns: [
      { key: 'field', label: 'Field' },
      { key: 'value', label: 'Value' },
    ],
    rows: [],
  };
}

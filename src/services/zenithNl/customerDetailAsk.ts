/**
 * Ask Zenith — customer record lookup + customer list slices.
 */
import { type Prisma, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import type { ZenithNlIntent, ZenithNlViz } from './catalog';
import { metricAllowedForRole } from './catalog';

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
  lastName?: string | null;
  prefix?: string | null;
}): string {
  const parts = [c.prefix, c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return parts || c.customerName?.trim() || 'Unknown';
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

/** List customers by city / type / salesperson. */
export function matchCustomersListIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('customers_list_slice', role)) return null;
  const q = norm(question);
  if (!/\bcustomers?\b/.test(q)) return null;
  if (!/\b(list|show|all|which|find)\b/.test(q)) return null;
  // Avoid stealing project lists and customer detail.
  if (/\bprojects?\b/.test(q)) return null;
  if (/\b(customer\s+details?|customer\s+record|open\s+customer)\b/.test(q)) return null;

  const filters: ZenithNlIntent['filters'] = {};
  const city = q.match(/\b(?:in|from|at)\s+([a-z][a-z\s]{1,30}?)$/) ||
    q.match(/\bcity\s+([a-z][a-z\s]{1,30})$/);
  if (city?.[1]) filters.city = city[1].trim();

  if (/\bresidential\b/.test(q)) filters.customerType = 'RESIDENTIAL';
  else if (/\bapartment\b/.test(q)) filters.customerType = 'APARTMENT';
  else if (/\bcommercial\b/.test(q)) filters.customerType = 'COMMERCIAL';

  const sales = q.match(
    /\b(?:for|by)\s+sales(?:person|man)?\s+([a-z][a-z.\s]{1,40}?)(?:\?|$)/i,
  );
  if (sales?.[1]) filters.salespersonName = sales[1].trim();

  return {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: Object.keys(filters).length ? filters : undefined,
    insightHints: 'customers list',
  };
}

export async function execCustomerDetailLookup(
  intent: ZenithNlIntent,
  opts?: { salespersonId?: string },
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
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
    { email: { contains: raw, mode: 'insensitive' } },
  ];
  const where: Prisma.CustomerWhereInput = opts?.salespersonId
    ? { salespersonId: opts.salespersonId, OR: nameOr }
    : { OR: nameOr };

  const matches = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      customerId: true,
      customerName: true,
      prefix: true,
      firstName: true,
      lastName: true,
      customerType: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      address: true,
      addressLine1: true,
      pinCode: true,
      gstNumber: true,
      consumerNumber: true,
      companyName: true,
      createdAt: true,
      salesperson: { select: { name: true } },
      projects: {
        select: {
          id: true,
          slNo: true,
          projectStatus: true,
          projectCost: true,
          balanceAmount: true,
          paymentStatus: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      },
      _count: { select: { projects: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  if (matches.length === 0) {
    return {
      insight: `No customer found for “${raw}”.`,
      viz: emptyCustomerTable('Customer detail'),
      projectsHref: `/customers?q=${encodeURIComponent(raw)}`,
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
          phone: c.phone || '—',
          projects: c._count.projects,
          href: `/customers/${c.id}`,
        })),
      },
      projectsHref: `/customers?q=${encodeURIComponent(raw)}`,
    };
  }

  const c = matches[0]!;
  const addr =
    [c.addressLine1, c.address, c.city, c.state, c.pinCode].filter(Boolean).join(', ') || '—';
  const rows: { field: string; value: string }[] = [
    { field: 'Customer ID', value: c.customerId },
    { field: 'Name', value: displayName(c) },
    { field: 'Type', value: c.customerType?.replace(/_/g, ' ') || '—' },
    { field: 'Phone', value: c.phone || '—' },
    { field: 'Email', value: c.email || '—' },
    { field: 'City', value: c.city || '—' },
    { field: 'Address', value: addr.slice(0, 120) },
    { field: 'GST', value: c.gstNumber || '—' },
    { field: 'Consumer no.', value: c.consumerNumber || '—' },
    { field: 'Company', value: c.companyName || '—' },
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
    rows.push({
      field: `Project SL ${p.slNo}`,
      value: `${p.projectStatus.replace(/_/g, ' ')} · ${money(p.projectCost)} · ${p.paymentStatus} · bal ${money(p.balanceAmount)}`,
    });
  }

  return {
    insight: `${displayName(c)} (${c.customerId}) · ${c.city || 'no city'} · ${c._count.projects} project${c._count.projects === 1 ? '' : 's'} · ${money(linkedOrder)} linked order.`,
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

export async function execCustomersListSlice(
  intent: ZenithNlIntent,
  opts?: { salespersonId?: string },
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const where: Prisma.CustomerWhereInput = {};
  const city = intent.filters?.city?.trim();
  if (city) where.city = { contains: city, mode: 'insensitive' };
  const ct = intent.filters?.customerType?.trim().toUpperCase();
  if (ct === 'RESIDENTIAL' || ct === 'APARTMENT' || ct === 'COMMERCIAL') {
    where.customerType = ct;
  }
  if (opts?.salespersonId) where.salespersonId = opts.salespersonId;

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      customerId: true,
      customerName: true,
      firstName: true,
      lastName: true,
      prefix: true,
      customerType: true,
      city: true,
      phone: true,
      salesperson: { select: { name: true } },
      _count: { select: { projects: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_CAP,
  });

  const bits = [
    city ? `in ${city}` : null,
    ct ? ct.toLowerCase() : null,
    intent.filters?.salespersonName ? `for ${intent.filters.salespersonName}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    insight: customers.length
      ? `Customers${bits ? ` ${bits}` : ''}: ${customers.length} shown (up to ${TABLE_CAP}).`
      : `No customers match${bits ? ` ${bits}` : ''}.`,
    viz: {
      kind: 'table',
      title: 'Customers',
      columns: [
        { key: 'customerId', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'city', label: 'City' },
        { key: 'phone', label: 'Phone' },
        { key: 'sales', label: 'Salesperson' },
        { key: 'projects', label: 'Projects' },
      ],
      rows: customers.map((c) => ({
        customerId: c.customerId,
        name: displayName(c),
        type: c.customerType || '—',
        city: c.city || '—',
        phone: c.phone || '—',
        sales: c.salesperson?.name || '—',
        projects: c._count.projects,
        href: `/customers/${c.id}`,
      })),
    },
    projectsHref: city
      ? `/customers?q=${encodeURIComponent(city)}`
      : '/customers',
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

/**
 * Thorough local Ask smoke — health, auth, metrics, actions, dates, pairing.
 *
 *   npx tsx scripts/smoke-zenith-ask-thorough.ts
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../src/prisma';

const API = process.env.SMOKE_API_BASE || 'http://localhost:3000';

type AskResult = {
  status: number;
  ok?: boolean;
  kind?: string;
  metric?: string;
  filters?: Record<string, unknown>;
  action?: string;
  href?: string;
  title?: string;
  cols?: string[];
  insight?: string;
  phrase?: string;
  chipMatch?: boolean;
  error?: string;
};

const PASS: string[] = [];
const FAIL: string[] = [];

function ok(name: string, detail = '') {
  PASS.push(detail ? `${name} — ${detail}` : name);
}
function fail(name: string, detail: string) {
  FAIL.push(`${name}: ${detail}`);
}

function tokenFor(user: { id: string; email: string; role: UserRole; tokenVersion: number }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET missing');
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
    secret,
    { expiresIn: '20m' },
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stay under zenith-nl-query limiter (30 / 10 min) when running the full suite. */
const ASK_GAP_MS = Number(process.env.SMOKE_ASK_GAP_MS || 400);

async function ask(token: string, question: string, dates?: { fy?: string[]; quarter?: string[] }) {
  await sleep(ASK_GAP_MS);
  let res = await fetch(`${API}/api/dashboard/zenith-nl-query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      fy: dates?.fy ?? [],
      quarter: dates?.quarter ?? [],
      month: [],
    }),
  });
  // One retry after short wait if rate-limited mid-suite.
  if (res.status === 429) {
    await sleep(12_000);
    res = await fetch(`${API}/api/dashboard/zenith-nl-query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        fy: dates?.fy ?? [],
        quarter: dates?.quarter ?? [],
        month: [],
      }),
    });
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  return {
    status: res.status,
    ok: json.ok,
    kind: json.kind,
    metric: json.intent?.metric ?? json.metric,
    filters: (json.intent?.filters ?? json.filters) as Record<string, unknown> | undefined,
    action: json.action,
    href: json.href,
    title: json.viz?.title,
    cols: Array.isArray(json.viz?.columns)
      ? json.viz.columns.map((c: { key?: string }) => String(c.key || ''))
      : [],
    insight: typeof json.insight === 'string' ? json.insight.slice(0, 140) : undefined,
    phrase: json.effectiveDateFilter?.phrase,
    chipMatch: json.chipMatch,
    error: json.error,
  } satisfies AskResult;
}

function expectMetric(
  name: string,
  r: AskResult,
  metric: string,
  extra?: (r: AskResult) => boolean,
) {
  if (r.status !== 200) return fail(name, `HTTP ${r.status} ${r.error || ''}`);
  if (!r.ok) return fail(name, `ok=false ${r.error || r.kind}`);
  if (r.kind === 'action') return fail(name, `got action ${r.action} href=${r.href}`);
  if (r.metric !== metric) return fail(name, `metric=${r.metric} title=${r.title}`);
  if (extra && !extra(r)) return fail(name, JSON.stringify(r));
  ok(name, r.title || r.insight || metric);
}

function expectAction(name: string, r: AskResult, action: string, hrefIncludes?: string) {
  if (r.status !== 200) return fail(name, `HTTP ${r.status}`);
  if (r.kind !== 'action') return fail(name, `kind=${r.kind} metric=${r.metric}`);
  if (r.action !== action) return fail(name, `action=${r.action}`);
  if (hrefIncludes && !String(r.href || '').includes(hrefIncludes)) {
    return fail(name, `href=${r.href}`);
  }
  ok(name, r.href || action);
}

function expectSlice(name: string, r: AskResult, slice: string, more?: Partial<Record<string, unknown>>) {
  expectMetric(name, r, 'projects_ops_detail', (x) => {
    if (x.filters?.detailSlice !== slice) return false;
    if (more) {
      for (const [k, v] of Object.entries(more)) {
        if (x.filters?.[k] !== v) return false;
      }
    }
    return true;
  });
}

async function main() {
  console.log(`\n=== Thorough Zenith Ask smoke → ${API} ===\n`);

  // 0) Health
  const health = await fetch(`${API}/health`)
    .then((r) => r.status)
    .catch(() => 0);
  if (health === 200) ok('health', '200');
  else fail('health', String(health));

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true, email: true, role: true, tokenVersion: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) {
    fail('admin user', 'none');
    printSummary();
    process.exit(1);
  }
  const token = tokenFor(admin);
  ok('mint JWT', admin.email);

  const sales = await prisma.user.findFirst({
    where: { role: UserRole.SALES, name: { not: '' } },
    select: { name: true },
  });
  const salesFirst = (sales?.name || 'Ravi').trim().split(/\s+/)[0] || 'Ravi';

  const customer = await prisma.customer.findFirst({
    select: { firstName: true, customerName: true },
    orderBy: { updatedAt: 'desc' },
  });
  const custName = (customer?.firstName || customer?.customerName || 'Ramesh')
    .trim()
    .split(/\s+/)[0]!;

  // ── A) Project / customer records ──
  expectMetric(
    'A1 project SL lookup',
    await ask(token, "What's the status of SL 1?"),
    'project_detail_lookup',
    (r) => r.filters?.search === 'SL:1' && Boolean(r.title?.includes('SL 1')),
  );
  expectMetric(
    'A2 last remark on SL',
    await ask(token, 'last remark on SL 1'),
    'project_detail_lookup',
    (r) => r.filters?.search === 'SL:1',
  );
  expectMetric(
    'A3 customer lookup',
    await ask(token, `Customer details for ${custName}`),
    'customer_detail_lookup',
  );
  expectMetric(
    'A4 customers by city',
    await ask(token, 'List customers in Kochi'),
    'customers_list_slice',
    (r) => String(r.filters?.city || '').toLowerCase().includes('kochi'),
  );

  // ── B) Payment / compliance / docs ──
  expectSlice('B1 payment timeline', await ask(token, 'Payment timeline'), 'payment_timeline');
  expectSlice('B2 advance only', await ask(token, 'Projects with advance only'), 'advance_only');
  expectSlice('B3 no P2', await ask(token, 'Projects with no P2'), 'no_p2');
  expectSlice(
    'B4 feasibility pending',
    await ask(token, 'Projects with feasibility pending'),
    'feasibility_pending',
  );
  expectSlice(
    'B5 subsidy not credited',
    await ask(token, 'Subsidy request sent not credited'),
    'subsidy_credit_pending',
  );
  expectSlice(
    'B6 confirmed no docs',
    await ask(token, 'Confirmed projects with no documents'),
    'missing_documents',
    { projectStatus: 'CONFIRMED' },
  );
  expectSlice(
    'B7 overdue commissioning',
    await ask(token, 'Overdue commissioning'),
    'commissioning_overdue',
  );
  {
    const r = await ask(token, 'projects mentioning delay');
    expectSlice('B8 remarks mentioning', r, 'remarks');
    if (r.ok && r.filters?.search !== 'delay') {
      fail('B8 remarks search', String(r.filters?.search));
    }
  }

  // ── C) PE / Hub / equipment ──
  expectSlice('C1 PE missing BOM', await ask(token, 'PE missing BOM'), 'pe_missing_bom');
  expectSlice('C2 hub linked IDs', await ask(token, 'Hub station IDs'), 'hub_station_ids');
  expectSlice('C3 hub unlinked', await ask(token, 'Hub unlinked projects'), 'hub_unlinked');
  {
    const r = await ask(token, 'List projects with 550W panels');
    expectSlice('C4 550W panels', r, 'panel_wattage');
    if (r.ok && r.filters?.panelCapacityWMin !== 550) {
      fail('C4 watt filter', JSON.stringify(r.filters));
    }
  }
  expectSlice(
    'C5 incentive eligible',
    await ask(token, 'Incentive eligible projects'),
    'incentive_eligible',
  );
  expectSlice('C6 lost deal details', await ask(token, 'Lost deal details'), 'lost_detail');

  // ── D) Salesperson / ops pairing + list columns ──
  {
    const r = await ask(token, `${salesFirst}'s under-installation unpaid`);
    expectMetric('D1 possessive unpaid install', r, 'projects_list_slice', (x) => {
      return (
        x.filters?.projectStatus === 'UNDER_INSTALLATION' &&
        x.filters?.paymentStatus === 'NOT_FULLY_PAID' &&
        String(x.filters?.salespersonName || '').toLowerCase() === salesFirst.toLowerCase() &&
        (x.cols || []).includes('city') &&
        (x.cols || []).includes('address')
      );
    });
  }
  {
    const r = await ask(token, 'List all Under Installation Projects where Payment is pending');
    expectMetric('D2 unpaid install list', r, 'projects_list_slice', (x) => {
      return (
        x.filters?.projectStatus === 'UNDER_INSTALLATION' &&
        x.filters?.paymentStatus === 'NOT_FULLY_PAID'
      );
    });
  }
  {
    const r = await ask(token, 'Payment timeline for ops');
    // may or may not extract ops name without a name — still payment timeline
    expectSlice('D3 payment timeline ops phrase', r, 'payment_timeline');
  }

  // ── E) Profitability dimension cuts + periods ──
  expectMetric(
    'E1 DCR profitability',
    await ask(token, 'DCR vs Non-DCR profitability'),
    'panel_type_mix',
    (r) => String(r.title || '').toLowerCase().includes('profit'),
  );
  expectMetric(
    'E2 bank profitability',
    await ask(token, 'Compare bank profitability'),
    'loan_bank_breakdown',
  );
  expectMetric(
    'E3 city profitability',
    await ask(token, 'City profitability'),
    'revenue_by_city',
    (r) => String(r.title || '').toLowerCase().includes('profit'),
  );
  expectMetric(
    'E4 salesperson profitability half year',
    await ask(token, 'Salesperson profitability this half year'),
    'revenue_by_salesperson',
    (r) =>
      String(r.title || '').toLowerCase().includes('profit') &&
      String(r.phrase || '')
        .toLowerCase()
        .includes('half'),
  );
  expectMetric(
    'E5 profit this quarter',
    await ask(token, 'Profit summary this quarter'),
    'profit_summary',
    (r) =>
      String(r.phrase || '')
        .toLowerCase()
        .includes('quarter'),
  );
  expectMetric(
    'E6 QoQ growth',
    await ask(token, 'Quarter on quarter revenue growth'),
    'period_compare',
  );
  expectMetric(
    'E7 subsidy vs non-subsidy profitability',
    await ask(token, 'Compare Profitability of Subsidy versus Non Subsidy Projects for last FY'),
    'revenue_by_project_type',
  );
  expectMetric(
    'E8 list non-subsidy (not mix)',
    await ask(token, 'List all Non Subsidy Projects this FY'),
    'projects_list_slice',
    (r) => r.filters?.projectType === 'NON_SUBSIDY',
  );

  // ── F) Write/edit actions (navigate) ──
  expectAction(
    'F1 update payment SL1',
    await ask(token, 'Update payment for SL 1'),
    'edit_project_payment',
    '/edit',
  );
  expectAction(
    'F2 change status SL1',
    await ask(token, 'Change status of SL 1'),
    'edit_project_status',
    '/edit',
  );
  expectAction(
    'F3 assign ops SL1',
    await ask(token, 'Assign ops to SL 1'),
    'assign_project_ops',
    '/edit',
  );
  expectAction(
    'F4 add remark SL1',
    await ask(token, 'Add remark to SL 1'),
    'add_project_remark',
    '/projects/',
  );
  expectAction(
    'F5 new customer',
    await ask(token, 'New Customer'),
    'new_customer',
    '/customers',
  );
  // Must NOT steal analytics
  expectMetric(
    'F6 status of SL not edit action',
    await ask(token, "What's the status of SL 1?"),
    'project_detail_lookup',
  );
  expectMetric(
    'F7 confirmed no docs not nav',
    await ask(token, 'Confirmed projects with no documents'),
    'projects_ops_detail',
  );

  // ── G) Classic chips / mix ──
  expectMetric('G1 ops workload', await ask(token, 'Ops workload'), 'ops_workload');
  expectMetric('G2 pipeline by stage', await ask(token, 'Show my pipeline by stage'), 'pipeline_by_stage');
  expectMetric(
    'G3 support tickets',
    await ask(token, 'Show me the total support tickets raised'),
    'support_tickets_summary',
  );
  expectMetric(
    'G4 unpaid invoices',
    await ask(token, 'Unpaid invoices'),
    'unpaid_invoices',
  );

  // ── H) History endpoint ──
  {
    const res = await fetch(`${API}/api/dashboard/zenith-ask-history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 200) ok('H1 ask history', String(res.status));
    else fail('H1 ask history', String(res.status));
  }

  printSummary();
  await prisma.$disconnect();
  process.exit(FAIL.length ? 1 : 0);
}

function printSummary() {
  console.log('\n── PASS ──');
  for (const p of PASS) console.log('  ✓', p);
  if (FAIL.length) {
    console.log('\n── FAIL ──');
    for (const f of FAIL) console.log('  ✗', f);
  }
  console.log(`\n=== ${PASS.length} passed · ${FAIL.length} failed ===\n`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

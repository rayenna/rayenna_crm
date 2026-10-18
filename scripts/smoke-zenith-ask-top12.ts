/**
 * Smoke highest-value Ask additions.
 *   npx tsx scripts/smoke-zenith-ask-top12.ts
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../src/prisma';

const API = process.env.SMOKE_API_BASE || 'http://localhost:3000';

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true, email: true, role: true, tokenVersion: true },
  });
  if (!admin) throw new Error('no admin');
  const sales = await prisma.user.findFirst({
    where: { role: UserRole.SALES, name: { not: '' } },
    select: { name: true },
  });
  const salesFirst = (sales?.name || 'Ravi').trim().split(/\s+/)[0] || 'Ravi';

  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role, tokenVersion: admin.tokenVersion },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' },
  );

  const ask = async (question: string) => {
    const res = await fetch(`${API}/api/dashboard/zenith-nl-query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, fy: [], quarter: [], month: [] }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, any>;
    return {
      status: res.status,
      ok: json.ok,
      kind: json.kind,
      metric: json.intent?.metric ?? json.metric,
      filters: json.intent?.filters ?? json.filters,
      title: json.viz?.title,
      cols: (json.viz?.columns || []).map((c: any) => c.key),
      insight: typeof json.insight === 'string' ? json.insight.slice(0, 90) : undefined,
    };
  };

  const cases: { q: string; check: (r: Awaited<ReturnType<typeof ask>>) => boolean }[] = [
    {
      q: "What's the status of SL 1?",
      check: (r) => r.metric === 'project_detail_lookup',
    },
    {
      q: 'Projects with advance only',
      check: (r) => r.filters?.detailSlice === 'advance_only',
    },
    {
      q: 'Projects with no P2',
      check: (r) => r.filters?.detailSlice === 'no_p2',
    },
    {
      q: 'Subsidy request sent not credited',
      check: (r) => r.filters?.detailSlice === 'subsidy_credit_pending',
    },
    {
      q: 'Confirmed projects with no documents',
      check: (r) =>
        r.filters?.detailSlice === 'missing_documents' && r.filters?.projectStatus === 'CONFIRMED',
    },
    {
      q: 'projects mentioning delay',
      check: (r) => r.filters?.detailSlice === 'remarks' && /delay/i.test(String(r.filters?.search)),
    },
    {
      q: 'last remark on SL 1',
      check: (r) => r.metric === 'project_detail_lookup' && r.filters?.search === 'SL:1',
    },
    {
      q: `${salesFirst}'s under-installation unpaid`,
      check: (r) =>
        r.metric === 'projects_list_slice' &&
        r.filters?.projectStatus === 'UNDER_INSTALLATION' &&
        r.filters?.paymentStatus === 'NOT_FULLY_PAID' &&
        /city/i.test(String(r.cols)),
    },
    {
      q: 'Overdue commissioning',
      check: (r) => r.filters?.detailSlice === 'commissioning_overdue',
    },
    {
      q: 'Hub unlinked projects',
      check: (r) => r.filters?.detailSlice === 'hub_unlinked',
    },
    {
      q: 'PE missing BOM',
      check: (r) => r.filters?.detailSlice === 'pe_missing_bom',
    },
    {
      q: 'Salesperson profitability this half year',
      check: (r) => r.metric === 'revenue_by_salesperson',
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const r = await ask(c.q);
    const pass = r.status === 200 && r.ok && c.check(r);
    if (!pass) failed += 1;
    console.log(pass ? 'PASS' : 'FAIL', JSON.stringify({ q: c.q, got: r }));
  }
  await prisma.$disconnect();
  if (failed) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

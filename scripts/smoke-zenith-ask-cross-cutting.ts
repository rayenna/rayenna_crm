/**
 * Smoke: customer lookup, edit actions, profitability compares, salesperson pairing.
 *   npx tsx scripts/smoke-zenith-ask-cross-cutting.ts
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
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new Error('no admin');
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
      action: json.action,
      href: json.href,
      title: json.viz?.title,
      insight: typeof json.insight === 'string' ? json.insight.slice(0, 100) : undefined,
    };
  };

  const customer = await prisma.customer.findFirst({
    select: { firstName: true, customerName: true },
    orderBy: { updatedAt: 'desc' },
  });
  const name = (customer?.firstName || customer?.customerName || 'Ramesh').split(/\s+/)[0]!;

  const cases: { q: string; check: (r: Awaited<ReturnType<typeof ask>>) => boolean }[] = [
    {
      q: `Customer details for ${name}`,
      check: (r) => r.kind === 'metric' && r.metric === 'customer_detail_lookup',
    },
    {
      q: 'List customers in Kochi',
      check: (r) => r.kind === 'metric' && r.metric === 'customers_list_slice',
    },
    {
      q: 'DCR vs Non-DCR profitability',
      check: (r) =>
        r.kind === 'metric' &&
        r.metric === 'panel_type_mix' &&
        String(r.title || '').toLowerCase().includes('profit'),
    },
    {
      q: 'Compare bank profitability',
      check: (r) => r.kind === 'metric' && r.metric === 'loan_bank_breakdown',
    },
    {
      q: 'Update payment for SL 1',
      check: (r) =>
        r.kind === 'action' &&
        r.action === 'edit_project_payment' &&
        String(r.href || '').includes('/edit'),
    },
    {
      q: "What's the status of SL 1?",
      check: (r) => r.kind === 'metric' && r.metric === 'project_detail_lookup',
    },
    {
      q: 'Payment timeline for salesperson',
      check: (r) => r.kind === 'metric' && r.metric === 'projects_ops_detail',
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

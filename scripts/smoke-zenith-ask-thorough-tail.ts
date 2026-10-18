/**
 * Residual F/G cases after rate-limit — wait then finish.
 *   npx tsx scripts/smoke-zenith-ask-thorough-tail.ts
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../src/prisma';

const API = process.env.SMOKE_API_BASE || 'http://localhost:3000';
const WAIT_MS = Number(process.env.SMOKE_WAIT_MS || 90_000);

const PASS: string[] = [];
const FAIL: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ask(token: string, question: string) {
  await sleep(500);
  let res = await fetch(`${API}/api/dashboard/zenith-nl-query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, fy: [], quarter: [], month: [] }),
  });
  if (res.status === 429) {
    console.log('  …429, waiting 60s');
    await sleep(60_000);
    res = await fetch(`${API}/api/dashboard/zenith-nl-query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, fy: [], quarter: [], month: [] }),
    });
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  return {
    status: res.status,
    ok: json.ok,
    kind: json.kind,
    metric: json.intent?.metric ?? json.metric,
    action: json.action,
    href: json.href,
    title: json.viz?.title,
    filters: json.intent?.filters ?? json.filters,
    error: json.error,
  };
}

async function main() {
  console.log(`Waiting ${WAIT_MS / 1000}s for rate-limit window…`);
  await sleep(WAIT_MS);

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true, email: true, role: true, tokenVersion: true },
  });
  if (!admin) throw new Error('no admin');
  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role, tokenVersion: admin.tokenVersion },
    process.env.JWT_SECRET!,
    { expiresIn: '20m' },
  );

  const cases: { name: string; q: string; check: (r: any) => boolean }[] = [
    {
      name: 'F2 change status',
      q: 'Change status of SL 1',
      check: (r) => r.kind === 'action' && r.action === 'edit_project_status' && String(r.href).includes('/edit'),
    },
    {
      name: 'F3 assign ops',
      q: 'Assign ops to SL 1',
      check: (r) => r.kind === 'action' && r.action === 'assign_project_ops',
    },
    {
      name: 'F4 add remark',
      q: 'Add remark to SL 1',
      check: (r) => r.kind === 'action' && r.action === 'add_project_remark',
    },
    {
      name: 'F5 new customer',
      q: 'New Customer',
      check: (r) => r.kind === 'action' && r.action === 'new_customer',
    },
    {
      name: 'F6 status not edit',
      q: "What's the status of SL 1?",
      check: (r) => r.kind === 'metric' && r.metric === 'project_detail_lookup',
    },
    {
      name: 'F7 confirmed no docs not nav',
      q: 'Confirmed projects with no documents',
      check: (r) =>
        r.kind === 'metric' &&
        r.metric === 'projects_ops_detail' &&
        r.filters?.detailSlice === 'missing_documents',
    },
    {
      name: 'G1 ops workload',
      q: 'Ops workload',
      check: (r) => r.metric === 'ops_workload',
    },
    {
      name: 'G2 pipeline',
      q: 'Show my pipeline by stage',
      check: (r) => r.metric === 'pipeline_by_stage',
    },
    {
      name: 'G3 support tickets',
      q: 'Show me the total support tickets raised',
      check: (r) => r.metric === 'support_tickets_summary',
    },
    {
      name: 'G4 unpaid invoices',
      q: 'Unpaid invoices',
      check: (r) => r.metric === 'unpaid_invoices',
    },
  ];

  for (const c of cases) {
    const r = await ask(token, c.q);
    const pass = r.status === 200 && r.ok && c.check(r);
    if (pass) {
      PASS.push(c.name);
      console.log('PASS', c.name, r.kind, r.metric || r.action);
    } else {
      FAIL.push(`${c.name}: ${JSON.stringify(r)}`);
      console.log('FAIL', c.name, JSON.stringify(r));
    }
  }

  console.log(`\nTail: ${PASS.length} passed · ${FAIL.length} failed`);
  await prisma.$disconnect();
  process.exit(FAIL.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

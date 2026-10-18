/**
 * Local Ask smoke: project detail lookup + ops detail slices.
 *
 *   npx tsx scripts/smoke-zenith-ask-detail-gaps.ts
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
  if (!admin) throw new Error('no admin user');
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET missing');
  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role, tokenVersion: admin.tokenVersion },
    secret,
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
      insight: typeof json.insight === 'string' ? json.insight.slice(0, 140) : undefined,
      error: json.error,
    };
  };

  const cases: { q: string; metric: string; slice?: string }[] = [
    { q: "What's the status of SL 1?", metric: 'project_detail_lookup' },
    { q: 'Payment timeline', metric: 'projects_ops_detail', slice: 'payment_timeline' },
    {
      q: 'Projects with feasibility pending',
      metric: 'projects_ops_detail',
      slice: 'feasibility_pending',
    },
    {
      q: 'Projects missing documents',
      metric: 'projects_ops_detail',
      slice: 'missing_documents',
    },
    { q: 'List projects with 550W panels', metric: 'projects_ops_detail', slice: 'panel_wattage' },
    { q: 'Hub station IDs', metric: 'projects_ops_detail', slice: 'hub_station_ids' },
    { q: 'PE missing BOM', metric: 'projects_ops_detail', slice: 'pe_missing_bom' },
    {
      q: 'Incentive eligible projects',
      metric: 'projects_ops_detail',
      slice: 'incentive_eligible',
    },
    { q: 'Lost deal details', metric: 'projects_ops_detail', slice: 'lost_detail' },
    {
      q: 'show projects with commissioning dates',
      metric: 'projects_ops_detail',
      slice: 'commissioning',
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const r = await ask(c.q);
    const sliceOk = !c.slice || r.filters?.detailSlice === c.slice;
    const pass = r.status === 200 && r.ok && r.metric === c.metric && sliceOk;
    if (!pass) failed += 1;
    console.log(pass ? 'PASS' : 'FAIL', JSON.stringify({ q: c.q, expect: c, got: r }));
  }
  await prisma.$disconnect();
  if (failed) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

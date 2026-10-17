/**
 * Local Ask smoke: unpaid under-install, quarter dates, QoQ/YoY.
 * Mints JWT from JWT_SECRET (API on :3000).
 *
 *   npx tsx scripts/smoke-zenith-ask-quarters.ts
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../src/prisma';

const API = process.env.SMOKE_API_BASE || 'http://localhost:3000';
const FAIL: string[] = [];
const PASS: string[] = [];

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
    { expiresIn: '15m' },
  );
}

async function ask(token: string, question: string) {
  const res = await fetch(`${API}/api/dashboard/zenith-nl-query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, fy: [], quarter: [], month: [] }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (process.env.SMOKE_DEBUG) {
    console.error(
      'DEBUG',
      question,
      res.status,
      JSON.stringify({
        ok: json.ok,
        kind: json.kind,
        metric: json.metric,
        filters: json.filters,
        phrase: json.effectiveDateFilter?.phrase,
        title: json.viz?.title,
        action: json.action,
        href: json.href,
        error: json.error,
        clarify: json.clarify,
        keys: Object.keys(json),
      }),
    );
  }
  return { status: res.status, json };
}

async function main() {
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
    fail('admin user', 'none found');
  } else {
    const token = tokenFor(admin);
    ok('mint JWT', admin.email);

    {
      const q = 'List all Under Installation Projects where Payment is pending';
      const { status, json } = await ask(token, q);
      const metric = json.intent?.metric ?? json.metric;
      const filters = json.intent?.filters ?? json.filters;
      if (status !== 200) fail('unpaid install HTTP', String(status));
      else if (json.kind === 'action') {
        fail('unpaid install', `got action ${json.action} href=${json.href}`);
      } else if (metric !== 'projects_list_slice') {
        fail('unpaid install metric', String(metric || json.kind));
      } else if (filters?.projectStatus !== 'UNDER_INSTALLATION') {
        fail('unpaid install status', JSON.stringify(filters));
      } else if (filters?.paymentStatus !== 'NOT_FULLY_PAID') {
        fail('unpaid install payment', JSON.stringify(filters));
      } else {
        const href = String(json.projectsHref || '');
        if (
          !href.includes('UNDER_INSTALLATION') ||
          !href.includes('PENDING') ||
          !href.includes('PARTIAL')
        ) {
          fail('unpaid install href', href || '(empty)');
        } else {
          ok('unpaid install list', `rows=${json.viz?.rows?.length ?? '?'} href ok`);
        }
      }
    }

    {
      const { status, json } = await ask(token, 'Under Installation Projects');
      if (status !== 200) fail('bare UI HTTP', String(status));
      else if (json.kind !== 'action' || json.action !== 'under_installation') {
        fail('bare UI', JSON.stringify({ kind: json.kind, action: json.action }));
      } else if (json.href !== '/projects?status=UNDER_INSTALLATION') {
        fail('bare UI href', String(json.href));
      } else ok('bare under installation action');
    }

    {
      const { status, json } = await ask(token, 'Profit summary this quarter');
      const metric = json.intent?.metric ?? json.metric;
      if (status !== 200) fail('profit Q HTTP', String(status));
      else if (metric !== 'profit_summary') fail('profit Q metric', String(metric));
      else if (
        !String(json.effectiveDateFilter?.phrase || '')
          .toLowerCase()
          .includes('this quarter')
      ) {
        fail('profit Q date phrase', JSON.stringify(json.effectiveDateFilter));
      } else if (
        !Array.isArray(json.effectiveDateFilter?.selectedQuarters) ||
        !json.effectiveDateFilter.selectedQuarters.length
      ) {
        fail('profit Q quarters', JSON.stringify(json.effectiveDateFilter));
      } else ok('profit this quarter', String(json.effectiveDateFilter.phrase));
    }

    {
      const { status, json } = await ask(token, 'Revenue next quarter');
      const metric = json.intent?.metric ?? json.metric;
      if (status !== 200) fail('next Q HTTP', String(status));
      else if (metric !== 'profit_summary') fail('next Q metric', String(metric));
      else if (
        !String(json.effectiveDateFilter?.phrase || '')
          .toLowerCase()
          .includes('next quarter')
      ) {
        fail('next Q phrase', JSON.stringify(json.effectiveDateFilter));
      } else ok('revenue next quarter', String(json.effectiveDateFilter.phrase));
    }

    {
      const { status, json } = await ask(token, 'Quarter on quarter revenue growth');
      const metric = json.intent?.metric ?? json.metric;
      if (status !== 200) fail('QoQ HTTP', String(status));
      else if (metric !== 'period_compare') fail('QoQ metric', String(metric));
      else if (
        !String(json.effectiveDateFilter?.phrase || '')
          .toLowerCase()
          .includes('comparing this quarter')
      ) {
        fail('QoQ phrase', JSON.stringify(json.effectiveDateFilter));
      } else if (json.viz?.kind !== 'table') fail('QoQ viz', String(json.viz?.kind));
      else if (!String(json.viz?.title || '').includes('QoQ')) {
        fail('QoQ title', String(json.viz?.title));
      } else {
        ok(
          'QoQ revenue',
          `title=${json.viz.title}; insight=${String(json.insight || '').slice(0, 80)}`,
        );
      }
    }

    {
      const { status, json } = await ask(token, 'YoY revenue growth');
      const metric = json.intent?.metric ?? json.metric;
      if (status !== 200) fail('YoY HTTP', String(status));
      else if (metric !== 'period_compare') fail('YoY metric', String(metric));
      else if (
        !String(json.effectiveDateFilter?.phrase || '')
          .toLowerCase()
          .includes('comparing this fy')
      ) {
        fail('YoY phrase', JSON.stringify(json.effectiveDateFilter));
      } else if (!String(json.viz?.title || '').includes('YoY')) {
        fail('YoY title', String(json.viz?.title));
      } else ok('YoY revenue', String(json.viz.title));
    }

    {
      const res = await fetch(`${API}/api/dashboard/zenith-ask-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { items?: unknown };
      if (res.status !== 200) fail('history HTTP', String(res.status));
      else if (!Array.isArray(json.items)) fail('history shape', JSON.stringify(json).slice(0, 120));
      else ok('ask history', `items=${json.items.length}`);
    }
  }

  console.log('\n=== ASK SMOKE PASS ===');
  for (const p of PASS) console.log('✓', p);
  if (FAIL.length) {
    console.log('\n=== ASK SMOKE FAIL ===');
    for (const f of FAIL) console.log('✗', f);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${PASS.length} checks passed.`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

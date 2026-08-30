/**
 * Cross-role Data Sense smoke against local API + live Neon (read-mostly).
 * Mints JWTs from JWT_SECRET — does not brute-force passwords.
 * One PUT without acknowledge is allowed only to assert 409 (no persist).
 *
 * Run from repo root (API on :3000):
 *   npx ts-node --transpile-only scripts/smoke-data-sense-roles.ts
 */
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env') })

import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'
import prisma from '../src/prisma'
import {
  DATA_SENSE_IMPOSSIBLE_CODE,
  DATA_SENSE_RULE_IDS,
  dataSenseImpossibleConflict,
  dataSenseNeedsReviewPrismaOr,
  evaluateDataSense,
} from '../src/utils/dataSense'
import fs from 'fs'

const API = process.env.SMOKE_API_BASE || 'http://localhost:3000'
const FAIL: string[] = []
const PASS: string[] = []

function ok(name: string, detail = '') {
  PASS.push(detail ? `${name} — ${detail}` : name)
}
function fail(name: string, detail: string) {
  FAIL.push(`${name}: ${detail}`)
}

function tokenFor(user: { id: string; email: string; role: UserRole; tokenVersion: number }) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing')
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
    secret,
    { expiresIn: '15m' },
  )
}

async function api(
  token: string,
  pathname: string,
  init?: RequestInit,
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { status: res.status, json }
}

async function main() {
  const health = await fetch(`${API}/health`)
    .then((r) => r.status)
    .catch(() => 0)
  if (health === 200) ok('API health', `${API}/health → 200`)
  else fail('API health', `${API}/health → ${health}`)

  const unauth = await fetch(`${API}/api/projects?dataSenseNeedsReview=true`).then((r) => r.status)
  if (unauth === 401) ok('Projects unauthenticated', '401')
  else fail('Projects unauthenticated', `expected 401 got ${unauth}`)

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true, name: true, tokenVersion: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  const byRole = new Map<UserRole, typeof allUsers>()
  for (const u of allUsers) {
    const list = byRole.get(u.role) ?? []
    list.push(u)
    byRole.set(u.role, list)
  }
  for (const role of Object.values(UserRole) as UserRole[]) {
    const n = byRole.get(role)?.length ?? 0
    if (n === 0) fail(`User roster ${role}`, 'no users in DB')
    else ok(`User roster ${role}`, `${n} account(s)`)
  }

  const sample = await prisma.project.findMany({
    take: 400,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      projectStatus: true,
      expectedCommissioningDate: true,
      confirmationDate: true,
      lostDate: true,
      lostReason: true,
      projectCost: true,
      advanceReceived: true,
      paymentStatus: true,
      stageEnteredAt: true,
      systemCapacity: true,
      balanceAmount: true,
    },
  })

  const now = new Date()
  const evalHits = sample.filter((p) => evaluateDataSense(p, now).length > 0)
  const byRule: Record<string, number> = Object.fromEntries(DATA_SENSE_RULE_IDS.map((id) => [id, 0]))
  for (const p of sample) {
    for (const f of evaluateDataSense(p, now)) byRule[f.id] += 1
  }
  const ruleSummary =
    DATA_SENSE_RULE_IDS.filter((id) => byRule[id] > 0)
      .map((id) => `${id}:${byRule[id]}`)
      .join(' ') || 'no flags in sample'
  ok('Evaluate sample', `${evalHits.length}/${sample.length} need review · ${ruleSummary}`)

  try {
    const orRows = await prisma.project.findMany({
      where: dataSenseNeedsReviewPrismaOr(now) as any,
      take: 80,
      select: {
        id: true,
        projectStatus: true,
        expectedCommissioningDate: true,
        confirmationDate: true,
        lostDate: true,
        lostReason: true,
        projectCost: true,
        advanceReceived: true,
        paymentStatus: true,
        stageEnteredAt: true,
        systemCapacity: true,
        balanceAmount: true,
      },
    })
    const falsePos = orRows.filter((p) => evaluateDataSense(p, now).length === 0)
    if (falsePos.length) {
      fail(
        'Prisma OR vs evaluate',
        `${falsePos.length}/${orRows.length} Prisma hits have zero evaluate findings (ids ${falsePos
          .slice(0, 5)
          .map((p) => p.id)
          .join(',')})`,
      )
    } else {
      ok('Prisma OR vs evaluate', `${orRows.length} OR-matched rows all evaluate to ≥1 finding`)
    }
  } catch (e: any) {
    fail('Prisma OR query', e?.message || String(e))
  }

  const impossibleInSample = sample.find((p) =>
    evaluateDataSense(p, now).some((f) => f.id === 'A4' || f.id === 'B3'),
  )

  const conflictAck = dataSenseImpossibleConflict(
    { advanceReceived: 999_999_999, acknowledgeDataSenseImpossibilities: true },
    {
      projectStatus: 'CONFIRMED',
      projectCost: 100,
      advanceReceived: 0,
      confirmationDate: now,
    },
  )
  if (conflictAck.length === 0) ok('Ack skips A4/B3 conflict')
  else fail('Ack skips A4/B3 conflict', JSON.stringify(conflictAck.map((f) => f.id)))

  const help = fs.readFileSync(path.join(__dirname, '../client/src/help/content/modules/projects.md'), 'utf8')
  if (help.includes('## Needs review (Data Sense)') && help.includes('Save anyway')) {
    ok('Help source', 'Needs review section + Save anyway')
  } else fail('Help source', 'missing heading or Save anyway')

  const publicHelp = fs.readFileSync(
    path.join(__dirname, '../client/public/help-docs/modules/projects.md'),
    'utf8',
  )
  if (publicHelp.includes('## Needs review (Data Sense)')) ok('Help public mirror')
  else fail('Help public mirror', 'projects.md out of date')

  const sections = fs.readFileSync(path.join(__dirname, '../client/src/help/sections.ts'), 'utf8')
  if (sections.includes('needs-review-data-sense')) ok('Help sidebar hash')
  else fail('Help sidebar hash', 'needs-review-data-sense missing')

  for (const user of allUsers) {
    const who = `${user.role} ${user.email}`
    const token = tokenFor(user)
    const list = await api(token, '/api/projects?dataSenseNeedsReview=true&limit=5')
    if (list.status !== 200) {
      fail(
        `${who} GET projects Needs review`,
        `HTTP ${list.status} ${JSON.stringify(list.json)?.slice(0, 180)}`,
      )
      continue
    }
    const total = list.json?.pagination?.total
    const n = Array.isArray(list.json?.projects) ? list.json.projects.length : -1
    ok(`${who} GET projects Needs review`, `HTTP 200 · page ${n} · total ${total}`)

    if (user.role === UserRole.SALES && Array.isArray(list.json?.projects)) {
      const leak = list.json.projects.filter(
        (p: any) => p.salespersonId && p.salespersonId !== user.id,
      )
      if (leak.length) fail(`${who} SALES scope`, `${leak.length} projects not assigned to this user`)
      else ok(`${who} SALES scope`, 'Needs-review rows are own assignments (or empty)')
    }

    if (user.role === UserRole.OPERATIONS && Array.isArray(list.json?.projects)) {
      const allowed = new Set(['CONFIRMED', 'UNDER_INSTALLATION', 'COMPLETED', 'COMPLETED_SUBSIDY_CREDITED'])
      const bad = list.json.projects.filter((p: any) => !allowed.has(p.projectStatus))
      if (bad.length) fail(`${who} OPERATIONS status gate`, bad.map((p: any) => p.projectStatus).join(','))
      else ok(`${who} OPERATIONS status gate`, 'Needs-review page is Confirmed+ only')
    }

    const ruleA1 = await api(token, '/api/projects?dataSenseRule=A1&limit=3')
    if (ruleA1.status === 200) ok(`${who} GET dataSenseRule=A1`, `total ${ruleA1.json?.pagination?.total}`)
    else fail(`${who} GET dataSenseRule=A1`, `HTTP ${ruleA1.status}`)

    const badRule = await api(token, '/api/projects?dataSenseRule=ZZ')
    if (badRule.status === 400) ok(`${who} invalid dataSenseRule`, '400')
    else fail(`${who} invalid dataSenseRule`, `expected 400 got ${badRule.status}`)

    const focus = await api(token, '/api/dashboard/zenith-focus')
    if (focus.status !== 200) {
      fail(`${who} zenith-focus`, `HTTP ${focus.status}`)
      continue
    }
    const kind = focus.json?.focusKind
    const hasGaps = Array.isArray(focus.json?.dataSenseGaps)
    const gapN = hasGaps ? focus.json.dataSenseGaps.length : 0

    if (user.role === UserRole.FINANCE) {
      if (kind === 'FINANCE' && focus.json?.dataSenseGaps == null) {
        ok(`${who} zenith-focus`, `kind=${kind} · no dataSenseGaps`)
      } else fail(`${who} zenith-focus`, `kind=${kind} gaps=${hasGaps}`)
    } else if (user.role === UserRole.OPERATIONS) {
      if (kind === 'OPERATIONS' && focus.json?.dataSenseGaps == null) {
        ok(`${who} zenith-focus`, `kind=${kind} · no dataSenseGaps`)
      } else fail(`${who} zenith-focus`, `kind=${kind} gaps=${hasGaps}`)
    } else if (user.role === UserRole.SALES) {
      if (kind === 'SALES' && hasGaps) ok(`${who} zenith-focus`, `kind=${kind} · dataSenseGaps ${gapN}`)
      else fail(`${who} zenith-focus`, `kind=${kind} hasGaps=${hasGaps}`)
    } else if (user.role === UserRole.MANAGEMENT || user.role === UserRole.ADMIN) {
      if (kind === 'MANAGEMENT' && hasGaps) {
        ok(`${who} zenith-focus`, `kind=${kind} · dataSenseGaps ${gapN}`)
      } else fail(`${who} zenith-focus`, `kind=${kind} hasGaps=${hasGaps}`)
    }

    if (n > 0 && list.json.projects[0]?.id) {
      const id = list.json.projects[0].id
      const one = await api(token, `/api/projects/${id}`)
      if (one.status === 200) {
        const findings = evaluateDataSense(one.json, now)
        ok(
          `${who} GET project detail`,
          `HTTP 200 · evaluate ${findings.map((f) => f.id).join(',') || 'none'}`,
        )
      } else if (one.status === 403 || one.status === 404) {
        ok(`${who} GET project detail`, `HTTP ${one.status} (role/scope)`)
      } else fail(`${who} GET project detail`, `HTTP ${one.status}`)
    }
  }

  const adminUser = allUsers.find((u) => u.role === UserRole.ADMIN)
  const financeUser = allUsers.find((u) => u.role === UserRole.FINANCE)
  const opsUser = allUsers.find((u) => u.role === UserRole.OPERATIONS)

  async function assertSoftBlock(
    label: string,
    actor: (typeof allUsers)[0] | undefined,
    projectId: string,
    body: object,
    restore?: Record<string, unknown>,
  ) {
    if (!actor) {
      fail(label, 'no user')
      return
    }
    const put = await api(tokenFor(actor), `/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    if (put.status === 409 && put.json?.code === DATA_SENSE_IMPOSSIBLE_CODE) {
      ok(label, `409 ${DATA_SENSE_IMPOSSIBLE_CODE}`)
      return
    }
    if (put.status === 200 && restore && adminUser) {
      fail(label, 'HTTP 200 wrote the bad payload — restoring previous fields')
      await api(tokenFor(adminUser), `/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...restore,
          acknowledgeDataSenseImpossibilities: true,
        }),
      })
      return
    }
    fail(
      label,
      `expected 409 ${DATA_SENSE_IMPOSSIBLE_CODE} got ${put.status} ${put.json?.code || put.json?.error}`,
    )
  }

  const victim = await prisma.project.findFirst({
    where: {
      projectStatus: { not: 'LOST' },
      projectCost: { gt: 0 },
    },
    select: {
      id: true,
      projectCost: true,
      advanceReceived: true,
      projectStatus: true,
    },
  })

  if (adminUser && victim) {
    const b3Body = {
      advanceReceived: Number(victim.projectCost) + 1,
    }
    const restoreB3 = { advanceReceived: victim.advanceReceived }
    await assertSoftBlock('P3 Admin PUT B3 (no ack)', adminUser, victim.id, b3Body, restoreB3)
    if (financeUser) {
      await assertSoftBlock('P3 Finance PUT B3 (no ack)', financeUser, victim.id, b3Body, restoreB3)
    }
    if (opsUser) {
      const a4Victim = await prisma.project.findFirst({
        where: {
          projectStatus: { in: ['CONFIRMED', 'UNDER_INSTALLATION'] },
          confirmationDate: { not: null },
        },
        select: { id: true, confirmationDate: true, expectedCommissioningDate: true },
      })
      if (a4Victim?.confirmationDate) {
        const before = new Date(a4Victim.confirmationDate.getTime() - 86400000 * 40)
        await assertSoftBlock(
          'P3 Operations PUT A4 (no ack)',
          opsUser,
          a4Victim.id,
          { expectedCommissioningDate: before.toISOString() },
          { expectedCommissioningDate: a4Victim.expectedCommissioningDate },
        )
      } else {
        ok('P3 Operations PUT A4', 'skipped — no Confirmed+ with confirmationDate')
      }
    }
  } else {
    fail('P3 synthetic PUT', 'no ADMIN user or editable project with cost > 0')
  }

  if (impossibleInSample && adminUser) {
    const p = impossibleInSample
    const put = await api(tokenFor(adminUser), `/api/projects/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        projectStatus: p.projectStatus,
        confirmationDate: p.confirmationDate,
        expectedCommissioningDate: p.expectedCommissioningDate,
        projectCost: p.projectCost,
        advanceReceived: p.advanceReceived,
      }),
    })
    if (put.status === 409 && put.json?.code === DATA_SENSE_IMPOSSIBLE_CODE) {
      ok('P3 PUT existing A4/B3 row', `409 ${DATA_SENSE_IMPOSSIBLE_CODE}`)
    } else {
      ok('P3 PUT existing A4/B3 row', `skipped path (HTTP ${put.status})`)
    }
  }

  const exec = fs.readFileSync(
    path.join(__dirname, '../client/src/components/zenith/ZenithExecutiveBody.tsx'),
    'utf8',
  )
  if (
    exec.includes('showDataSenseReminder=') &&
    exec.includes('UserRole.MANAGEMENT') &&
    exec.includes('UserRole.SALES')
  ) {
    ok('UI gate Zenith executive', 'Data Sense reminder for Sales/Admin/Management')
  } else fail('UI gate Zenith executive', 'showDataSenseReminder wiring unexpected')

  const ops = fs.readFileSync(
    path.join(__dirname, '../client/src/components/zenith/ZenithOperationsBody.tsx'),
    'utf8',
  )
  if (ops.includes('showLifecycleReminder') && !ops.includes('showDataSenseReminder')) {
    ok('UI gate Zenith operations', 'lifecycle only, no Data Sense reminder')
  } else fail('UI gate Zenith operations', 'unexpected Data Sense prop')

  const fin = fs.readFileSync(
    path.join(__dirname, '../client/src/components/zenith/ZenithFinanceBody.tsx'),
    'utf8',
  )
  if (!fin.includes('showDataSenseReminder') && !fin.includes('showLifecycleReminder')) {
    ok('UI gate Zenith finance', 'no attention Data Sense / lifecycle flags')
  } else fail('UI gate Zenith finance', 'unexpected reminder props')

  console.log('\n=== PASS ===')
  for (const l of PASS) console.log('OK  ', l)
  console.log('\n=== FAIL ===')
  if (!FAIL.length) console.log('(none)')
  for (const l of FAIL) console.log('FAIL', l)
  console.log(`\n${PASS.length} passed, ${FAIL.length} failed`)
  await prisma.$disconnect()
  process.exit(FAIL.length ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

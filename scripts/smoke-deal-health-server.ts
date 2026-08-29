/**
 * Server-side Deal Health smoke — mirrors key client scenarios.
 * Run: npx ts-node --transpile-only scripts/smoke-deal-health-server.ts
 */
import { LeadSource, PaymentStatus, ProjectStatus } from '@prisma/client';
import { computeDealHealthScoreForProjectList } from '../src/utils/dealHealthScore';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const lost = computeDealHealthScoreForProjectList({
  projectStatus: ProjectStatus.LOST,
  updatedAt: daysAgo(1),
  stageEnteredAt: daysAgo(1),
  projectCost: 300000,
  confirmationDate: null,
  advanceReceived: 0,
  leadSource: LeadSource.REFERRAL,
});
assert(lost === null, 'LOST must be null');

const proposal = computeDealHealthScoreForProjectList({
  projectStatus: ProjectStatus.PROPOSAL,
  updatedAt: daysAgo(20),
  stageEnteredAt: daysAgo(20),
  projectCost: 350000,
  confirmationDate: daysAgo(30),
  advanceReceived: 50000,
  leadSource: LeadSource.REFERRAL,
  paymentStatus: PaymentStatus.PENDING,
  balanceAmount: 300000,
});

const install = computeDealHealthScoreForProjectList({
  projectStatus: ProjectStatus.UNDER_INSTALLATION,
  updatedAt: daysAgo(20),
  stageEnteredAt: daysAgo(20),
  projectCost: 350000,
  confirmationDate: daysAgo(30),
  advanceReceived: 50000,
  leadSource: LeadSource.REFERRAL,
  paymentStatus: PaymentStatus.PENDING,
  balanceAmount: 300000,
});

assert(typeof proposal === 'number' && typeof install === 'number', 'open stages must score');
assert(install! > proposal!, `install (${install}) should beat proposal (${proposal})`);
assert(install! <= 100 && proposal! >= 0, 'scores in 0–100');

const large = computeDealHealthScoreForProjectList({
  projectStatus: ProjectStatus.PROPOSAL,
  updatedAt: daysAgo(1),
  stageEnteredAt: daysAgo(1),
  projectCost: 1850000,
  confirmationDate: daysAgo(2),
  advanceReceived: 0,
  leadSource: LeadSource.MANAGEMENT_CONNECT,
});
assert(typeof large === 'number' && large! >= 20 && large! < 75, `large neglected-ish score odd: ${large}`);

const website = computeDealHealthScoreForProjectList({
  projectStatus: ProjectStatus.LEAD,
  updatedAt: daysAgo(1),
  stageEnteredAt: daysAgo(1),
  projectCost: 250000,
  confirmationDate: null,
  advanceReceived: 0,
  leadSource: LeadSource.WEBSITE,
  expectedCommissioningDate: new Date(Date.now() + 14 * 86400000),
});
assert(typeof website === 'number', 'website lead must score');

console.log('server deal-health smoke OK', { proposal, install, large, website });

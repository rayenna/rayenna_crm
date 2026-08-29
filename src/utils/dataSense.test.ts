import { describe, expect, it } from 'vitest';
import { PaymentStatus, ProjectStatus } from '@prisma/client';
import {
  DATA_SENSE_RULE_IDS,
  dataSenseNeedsReviewPrismaOr,
  dataSensePrismaClause,
  dataSenseImpossibleConflict,
  evaluateDataSense,
  startOfTodayInIst,
} from './dataSense';

const NOW = new Date('2026-08-29T12:00:00+05:30');

describe('dataSenseNeedsReviewPrismaOr', () => {
  it('uses IST midnight for past commissioning', () => {
    const clause = dataSenseNeedsReviewPrismaOr(NOW) as {
      OR: Array<{ AND?: object[] }>;
    };
    expect(clause.OR.length).toBe(DATA_SENSE_RULE_IDS.length);
    const a1 = JSON.stringify(clause.OR[0]);
    expect(a1).toContain(startOfTodayInIst(NOW).toISOString());
    expect(a1).toContain('expectedCommissioningDate');
  });

  it('dataSensePrismaClause A1 is a single AND, not the full OR', () => {
    const clause = JSON.stringify(dataSensePrismaClause(NOW, 'A1'));
    expect(clause).toContain('expectedCommissioningDate');
    expect(clause).not.toContain('lostReason');
  });

  it('dataSensePrismaClause A4 uses a confirmationDate field reference', () => {
    const clause = JSON.stringify(dataSensePrismaClause(NOW, 'A4'));
    expect(clause).toContain('expectedCommissioningDate');
    expect(clause).toContain('confirmationDate');
  });
});

describe('evaluateDataSense (server)', () => {
  it('B1 uses PaymentStatus.PENDING', () => {
    const f = evaluateDataSense(
      {
        projectStatus: ProjectStatus.CONFIRMED,
        confirmationDate: new Date('2026-08-20T00:00:00+05:30'),
        projectCost: 100_000,
        advanceReceived: 0,
        paymentStatus: PaymentStatus.PENDING,
        systemCapacity: 5,
      },
      NOW,
    );
    expect(f.map((x) => x.id)).toEqual(['B1']);
  });

  it('B3 when advance exceeds cost', () => {
    const f = evaluateDataSense(
      {
        projectStatus: ProjectStatus.CONFIRMED,
        confirmationDate: new Date('2026-08-01T00:00:00+05:30'),
        projectCost: 100_000,
        advanceReceived: 120_000,
        paymentStatus: PaymentStatus.PARTIAL,
        systemCapacity: 5,
      },
      NOW,
    );
    expect(f.map((x) => x.id)).toEqual(['B3']);
  });
});

describe('dataSenseImpossibleConflict P3', () => {
  it('flags B3 from patch over persisted cost', () => {
    const findings = dataSenseImpossibleConflict(
      { advanceReceived: 200_000 },
      {
        projectStatus: ProjectStatus.CONFIRMED,
        confirmationDate: new Date('2026-08-01T00:00:00+05:30'),
        projectCost: 100_000,
        advanceReceived: 10_000,
      },
      NOW,
    );
    expect(findings.map((x) => x.id)).toEqual(['B3']);
  });

  it('skips when acknowledgeDataSenseImpossibilities is true', () => {
    const findings = dataSenseImpossibleConflict(
      { advanceReceived: 200_000, acknowledgeDataSenseImpossibilities: true },
      {
        projectStatus: ProjectStatus.CONFIRMED,
        confirmationDate: new Date('2026-08-01T00:00:00+05:30'),
        projectCost: 100_000,
        advanceReceived: 10_000,
      },
      NOW,
    );
    expect(findings).toEqual([]);
  });
});

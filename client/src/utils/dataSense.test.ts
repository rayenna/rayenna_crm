import { describe, expect, it } from 'vitest'
import {
  evaluateDataSense,
  projectNeedsDataSenseReview,
  startOfTodayInIst,
  dataSenseHitsOnExplorerProjects,
  dataSenseRollupBySalesperson,
  dataSenseImpossibleFindings,
} from './dataSense'

const NOW = new Date('2026-08-29T12:00:00+05:30')

function isoIst(ymd: string, time = '12:00:00'): string {
  return new Date(`${ymd}T${time}+05:30`).toISOString()
}

describe('startOfTodayInIst', () => {
  it('is midnight IST as UTC', () => {
    const start = startOfTodayInIst(NOW)
    expect(start.toISOString()).toBe('2026-08-28T18:30:00.000Z')
  })
})

describe('evaluateDataSense P0', () => {
  it('A1: past commissioning on open deal', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'PROPOSAL',
        expectedCommissioningDate: isoIst('2026-08-28'),
      },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['A1'])
    expect(f[0]?.severity).toBe('critical')
  })

  it('A1: commissioning today is not past', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'PROPOSAL',
        expectedCommissioningDate: isoIst('2026-08-29'),
      },
      NOW,
    )
    expect(f).toEqual([])
  })

  it('A1: skipped for Completed / Lost', () => {
    expect(
      evaluateDataSense(
        {
          projectStatus: 'COMPLETED',
          confirmationDate: isoIst('2026-08-01'),
          expectedCommissioningDate: isoIst('2026-08-01'),
          systemCapacity: 5,
          paymentStatus: 'FULLY_PAID',
          balanceAmount: 0,
          projectCost: 100_000,
          advanceReceived: 100_000,
        },
        NOW,
      ),
    ).toEqual([])
    expect(
      evaluateDataSense(
        {
          projectStatus: 'LOST',
          expectedCommissioningDate: isoIst('2026-08-01'),
          lostDate: isoIst('2026-08-02'),
          lostReason: 'OTHER',
        },
        NOW,
      ),
    ).toEqual([])
  })

  it('A2: Confirmed without confirmationDate', () => {
    const f = evaluateDataSense({ projectStatus: 'CONFIRMED', systemCapacity: 5 }, NOW)
    expect(f.map((x) => x.id)).toEqual(['A2'])
  })

  it('A2: Lead without confirmationDate is fine', () => {
    expect(evaluateDataSense({ projectStatus: 'LEAD' }, NOW)).toEqual([])
  })

  it('A3: Lost missing date or reason', () => {
    expect(evaluateDataSense({ projectStatus: 'LOST' }, NOW).map((x) => x.id)).toEqual(['A3'])
    expect(
      evaluateDataSense({ projectStatus: 'LOST', lostDate: isoIst('2026-08-01') }, NOW).map((x) => x.id),
    ).toEqual(['A3'])
    expect(
      evaluateDataSense(
        { projectStatus: 'LOST', lostDate: isoIst('2026-08-01'), lostReason: 'PRICE' },
        NOW,
      ),
    ).toEqual([])
  })

  it('B1: confirmed, cost, pending, no advance', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'CONFIRMED',
        confirmationDate: isoIst('2026-08-20'),
        projectCost: 500_000,
        advanceReceived: 0,
        paymentStatus: 'PENDING',
        systemCapacity: 5,
      },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['B1'])
  })

  it('B1: skipped when advance exists or not pending', () => {
    expect(
      evaluateDataSense(
        {
          projectStatus: 'CONFIRMED',
          confirmationDate: isoIst('2026-08-01'),
          projectCost: 500_000,
          advanceReceived: 10_000,
          paymentStatus: 'PENDING',
          systemCapacity: 5,
        },
        NOW,
      ),
    ).toEqual([])
    expect(
      evaluateDataSense(
        {
          projectStatus: 'CONFIRMED',
          confirmationDate: isoIst('2026-08-01'),
          projectCost: 500_000,
          advanceReceived: 0,
          paymentStatus: 'PARTIAL',
          systemCapacity: 5,
        },
        NOW,
      ),
    ).toEqual([])
  })

  it('can stack A1 + B1 + B2', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'UNDER_INSTALLATION',
        confirmationDate: isoIst('2026-07-01'),
        expectedCommissioningDate: isoIst('2026-08-01'),
        projectCost: 400_000,
        advanceReceived: null,
        paymentStatus: 'PENDING',
        systemCapacity: 5,
      },
      NOW,
    )
    expect(f.map((x) => x.id).sort()).toEqual(['A1', 'B1', 'B2'])
    expect(projectNeedsDataSenseReview(
      {
        projectStatus: 'UNDER_INSTALLATION',
        confirmationDate: isoIst('2026-07-01'),
        expectedCommissioningDate: isoIst('2026-08-01'),
        projectCost: 400_000,
        paymentStatus: 'PENDING',
        systemCapacity: 5,
      },
      NOW,
    )).toBe(true)
  })
})

describe('evaluateDataSense P2', () => {
  it('A4: commissioning before confirmation', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'CONFIRMED',
        confirmationDate: isoIst('2026-09-10'),
        expectedCommissioningDate: isoIst('2026-09-01'),
        systemCapacity: 5,
        projectCost: 100_000,
        advanceReceived: 10_000,
        paymentStatus: 'PARTIAL',
      },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['A4'])
  })

  it('A5: confirmation date on Lead', () => {
    const f = evaluateDataSense(
      { projectStatus: 'LEAD', confirmationDate: isoIst('2026-08-01') },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['A5'])
  })

  it('A6: past Deal Health SLA for Lead', () => {
    const f = evaluateDataSense(
      { projectStatus: 'LEAD', stageEnteredAt: isoIst('2026-08-01') },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['A6'])
  })

  it('B2 after 14 days with no advance', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'CONFIRMED',
        confirmationDate: isoIst('2026-08-01'),
        projectCost: 500_000,
        advanceReceived: 0,
        paymentStatus: 'PENDING',
        systemCapacity: 5,
      },
      NOW,
    )
    expect(f.map((x) => x.id).sort()).toEqual(['B1', 'B2'])
  })

  it('B4 completed still pending with balance', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'COMPLETED',
        confirmationDate: isoIst('2026-06-01'),
        expectedCommissioningDate: isoIst('2026-08-01'),
        paymentStatus: 'PENDING',
        balanceAmount: 50_000,
        systemCapacity: 5,
        projectCost: 200_000,
        advanceReceived: 10_000,
      },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['B4'])
  })

  it('B5 fully paid with balance', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'CONFIRMED',
        confirmationDate: isoIst('2026-08-01'),
        paymentStatus: 'FULLY_PAID',
        balanceAmount: 1,
        systemCapacity: 5,
        projectCost: 100_000,
        advanceReceived: 100_000,
      },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['B5'])
  })

  it('C2 missing capacity on Confirmed', () => {
    const f = evaluateDataSense(
      {
        projectStatus: 'CONFIRMED',
        confirmationDate: isoIst('2026-08-20'),
        projectCost: 100_000,
        advanceReceived: 10_000,
        paymentStatus: 'PARTIAL',
      },
      NOW,
    )
    expect(f.map((x) => x.id)).toEqual(['C2'])
  })
})

describe('dataSenseImpossibleFindings P3', () => {
  it('soft-blocks A4 and B3 only', () => {
    expect(
      dataSenseImpossibleFindings(
        {
          projectStatus: 'CONFIRMED',
          confirmationDate: isoIst('2026-09-10'),
          expectedCommissioningDate: isoIst('2026-09-01'),
          systemCapacity: 5,
          projectCost: 100_000,
          advanceReceived: 10_000,
          paymentStatus: 'PARTIAL',
        },
        NOW,
      ).map((x) => x.id),
    ).toEqual(['A4'])
    expect(
      dataSenseImpossibleFindings(
        {
          projectStatus: 'CONFIRMED',
          confirmationDate: isoIst('2026-08-01'),
          projectCost: 100_000,
          advanceReceived: 120_000,
          paymentStatus: 'PARTIAL',
          systemCapacity: 5,
        },
        NOW,
      ).map((x) => x.id),
    ).toEqual(['B3'])
    expect(
      dataSenseImpossibleFindings(
        {
          projectStatus: 'LEAD',
          expectedCommissioningDate: isoIst('2026-08-01'),
        },
        NOW,
      ),
    ).toEqual([])
  })
})

describe('dataSenseHitsOnExplorerProjects', () => {
  it('flags explorer rows with past expected_close_date', () => {
    const hits = dataSenseHitsOnExplorerProjects(
      [
        {
          id: 'p1',
          projectStatus: 'PROPOSAL',
          expected_close_date: isoIst('2026-08-28'),
          customer_name: 'Acme',
          deal_value: 0,
        },
      ],
      NOW,
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.primary.id).toBe('A1')
  })

  it('does not false-flag Lost rows (explorer has no lostDate/lostReason)', () => {
    const hits = dataSenseHitsOnExplorerProjects(
      [
        {
          id: 'lost-1',
          projectStatus: 'LOST',
          customer_name: 'Lost Co',
          deal_value: 100_000,
        },
      ],
      NOW,
    )
    expect(hits).toEqual([])
  })

  it('rolls up hits by salesperson', () => {
    const hits = dataSenseHitsOnExplorerProjects(
      [
        {
          id: 'p1',
          projectStatus: 'LEAD',
          expected_close_date: isoIst('2026-08-28'),
          customer_name: 'A',
          assigned_to_id: 'u1',
          assigned_to_name: 'Sam',
        },
        {
          id: 'p2',
          projectStatus: 'LEAD',
          expected_close_date: isoIst('2026-08-27'),
          customer_name: 'B',
          assigned_to_id: 'u1',
          assigned_to_name: 'Sam',
        },
        {
          id: 'p3',
          projectStatus: 'LEAD',
          expected_close_date: isoIst('2026-08-26'),
          customer_name: 'C',
          assigned_to_name: 'Unassigned',
        },
      ],
      NOW,
    )
    const rollup = dataSenseRollupBySalesperson(hits)
    expect(rollup[0]).toMatchObject({ salespersonId: 'u1', salespersonName: 'Sam', projectCount: 2 })
    expect(rollup[1]).toMatchObject({ salespersonId: null, projectCount: 1 })
  })
})

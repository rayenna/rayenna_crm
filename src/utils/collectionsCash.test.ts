import { describe, expect, it } from 'vitest'
import {
  agingBucket,
  buildCollectionsCash,
  isOnCollectionsBook,
  isSubsidyInFlight,
  type CollectionsProjectInput,
} from './collectionsCash'

const NOW = new Date('2026-10-29T06:30:00.000Z') // 12:00 IST 29 Oct 2026

function p(
  partial: Partial<CollectionsProjectInput> & Pick<CollectionsProjectInput, 'id'>,
): CollectionsProjectInput {
  return {
    slNo: 1,
    projectStatus: 'UNDER_INSTALLATION',
    year: '2026-27',
    type: 'SUBSIDY',
    projectCost: 500_000,
    balanceAmount: 200_000,
    totalAmountReceived: 300_000,
    paymentStatus: 'PARTIAL',
    confirmationDate: '2026-05-10T00:00:00.000Z',
    lastPaymentDate: '2026-09-01T00:00:00.000Z',
    availingLoan: false,
    financingBank: null,
    financingBankOther: null,
    subsidyRequestDate: null,
    subsidyCreditedDate: null,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'RAK Tower',
    customerType: 'APARTMENT',
    ...partial,
  }
}

describe('agingBucket', () => {
  it('splits 0–30 / 31–60 / 61–90 / 90+ / undated', () => {
    expect(agingBucket(0)).toBe('b0_30')
    expect(agingBucket(30)).toBe('b0_30')
    expect(agingBucket(31)).toBe('b31_60')
    expect(agingBucket(90)).toBe('b61_90')
    expect(agingBucket(91)).toBe('b90')
    expect(agingBucket(null)).toBe('undated')
  })
})

describe('isSubsidyInFlight', () => {
  it('treats requested or submitted/completed-not-credited subsidy as in flight', () => {
    expect(isSubsidyInFlight(p({ id: 'a', subsidyRequestDate: '2026-10-01T00:00:00.000Z' }))).toBe(true)
    expect(isSubsidyInFlight(p({ id: 'b', projectStatus: 'SUBMITTED_FOR_SUBSIDY', balanceAmount: 0 }))).toBe(
      true,
    )
    expect(
      isSubsidyInFlight(p({ id: 'c', projectStatus: 'COMPLETED_SUBSIDY_CREDITED', balanceAmount: 0 })),
    ).toBe(false)
    expect(isSubsidyInFlight(p({ id: 'd', type: 'NON_SUBSIDY', subsidyRequestDate: '2026-10-01' }))).toBe(
      false,
    )
    expect(
      isSubsidyInFlight(p({ id: 'e', projectStatus: 'PROPOSAL', subsidyRequestDate: '2026-10-01' })),
    ).toBe(false)
  })
})

describe('buildCollectionsCash', () => {
  it('ages outstanding from last payment, splits loan vs cash, and keeps subsidy in flight with zero balance', () => {
    const report = buildCollectionsCash(
      [
        p({
          id: 'fresh',
          lastPaymentDate: '2026-10-20T00:00:00.000Z',
          balanceAmount: 50_000,
          customerName: 'Fresh',
        }),
        p({
          id: 'stale',
          lastPaymentDate: '2026-06-01T00:00:00.000Z',
          balanceAmount: 400_000,
          customerName: 'Stale',
        }),
        p({
          id: 'loan',
          availingLoan: true,
          financingBank: 'SBI',
          balanceAmount: 100_000,
          lastPaymentDate: '2026-10-01T00:00:00.000Z',
          customerName: 'Loan Villa',
        }),
        p({
          id: 'subsidy',
          balanceAmount: 0,
          totalAmountReceived: 500_000,
          paymentStatus: 'FULLY_PAID',
          projectStatus: 'SUBMITTED_FOR_SUBSIDY',
          projectCost: 500_000,
          customerName: 'Paid waiting subsidy',
        }),
        p({ id: 'lost', projectStatus: 'LOST', balanceAmount: 80_000 }),
        p({
          id: 'pipeline',
          projectStatus: 'PROPOSAL',
          balanceAmount: 500_000,
          paymentStatus: 'PENDING',
          lastPaymentDate: null,
          customerName: 'Still a lead',
        }),
        p({ id: 'clear', balanceAmount: 0, paymentStatus: 'FULLY_PAID', projectStatus: 'CONFIRMED' }),
      ],
      NOW,
    )

    expect(report.rows.map((r) => r.id).sort()).toEqual(['fresh', 'loan', 'stale', 'subsidy'])
    expect(isOnCollectionsBook(p({ id: 'lost', projectStatus: 'LOST' }))).toBe(false)
    expect(
      isOnCollectionsBook(p({ id: 'pipe', projectStatus: 'PROPOSAL', balanceAmount: 500_000 })),
    ).toBe(false)
    expect(isOnCollectionsBook(p({ id: 'lead', projectStatus: 'LEAD', balanceAmount: 100_000 }))).toBe(
      false,
    )
    expect(report.kpis.outstanding).toBe(550_000)
    expect(report.kpis.outstandingJobs).toBe(3)
    expect(report.kpis.loanOutstanding).toBe(100_000)
    expect(report.kpis.cashOutstanding).toBe(450_000)
    expect(report.kpis.subsidyInFlightJobs).toBe(1)
    expect(report.kpis.subsidyInFlightValue).toBe(500_000)
    expect(report.kpis.aging90Jobs).toBe(1)
    expect(report.kpis.aging90).toBe(400_000)
    expect(report.rows[0].customerName).toBe('Stale')
    expect(report.sellerLoad[0]).toMatchObject({ salespersonName: 'Kavya V', jobs: 4 })
  })

  it('flags never paid when pending with no last payment date', () => {
    const report = buildCollectionsCash(
      [
        p({
          id: 'never',
          paymentStatus: 'PENDING',
          lastPaymentDate: null,
          confirmationDate: '2026-04-15T00:00:00.000Z',
          totalAmountReceived: 0,
          balanceAmount: 200_000,
        }),
      ],
      NOW,
    )
    expect(report.kpis.neverPaidJobs).toBe(1)
    expect(report.rows[0].flags).toContain('never_paid')
    expect(report.rows[0].flagLabels).toContain('Advance due')
    expect(report.rows[0].agingBucket).toBe('b90')
  })

  it('flags next installment on partial confirmed jobs', () => {
    const report = buildCollectionsCash(
      [
        p({
          id: 'partial',
          projectStatus: 'CONFIRMED',
          paymentStatus: 'PARTIAL',
          lastPaymentDate: '2026-10-01T00:00:00.000Z',
          totalAmountReceived: 100_000,
          balanceAmount: 100_000,
        }),
      ],
      NOW,
    )
    expect(report.rows[0].flags).toContain('installment')
    expect(report.rows[0].flagLabels).toContain('Next installment')
    expect(report.rows[0].flags).not.toContain('never_paid')
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildDeliveryControl,
  isOnSubsidyClock,
  jobBlockers,
  subsidyClockStep,
  type DeliveryControlProjectInput,
} from './deliveryControl'

const NOW = new Date('2026-10-29T06:30:00.000Z') // 12:00 IST 29 Oct 2026

function p(
  partial: Partial<DeliveryControlProjectInput> & Pick<DeliveryControlProjectInput, 'id'>,
): DeliveryControlProjectInput {
  return {
    slNo: 1,
    projectStatus: 'CONFIRMED',
    year: '2026-27',
    projectCost: 500_000,
    systemCapacity: 10,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: '2026-05-10T00:00:00.000Z',
    expectedCommissioningDate: '2026-11-15T00:00:00.000Z',
    stageEnteredAt: '2026-05-10T00:00:00.000Z',
    feasibilityDate: '2026-06-01T00:00:00.000Z',
    registrationDate: '2026-06-15T00:00:00.000Z',
    mnrePortalRegistrationDate: null,
    installationCompletionDate: null,
    completionReportSubmissionDate: null,
    subsidyRequestDate: null,
    subsidyCreditedDate: null,
    incentiveEligible: true,
    assignedOpsId: 'ops1',
    opsPersonName: 'Ops One',
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'RAK Tower',
    customerType: 'APARTMENT',
    documentCategories: ['kseb'],
    ...partial,
  }
}

describe('jobBlockers', () => {
  it('flags overdue, unassigned, and subsidy KSEB gaps', () => {
    const flags = jobBlockers(
      p({
        id: 'b1',
        assignedOpsId: null,
        expectedCommissioningDate: '2026-09-01T00:00:00.000Z',
        feasibilityDate: null,
        registrationDate: null,
        documentCategories: [],
      }),
      '2026-10-29',
    )
    expect(flags).toContain('overdue')
    expect(flags).toContain('unassigned')
    expect(flags).toContain('no_feasibility')
    expect(flags).toContain('no_kseb_doc')
  })

  it('does not flag MNRE on a confirmed job that has not started install', () => {
    const flags = jobBlockers(p({ id: 'b2', mnrePortalRegistrationDate: null }), '2026-10-29')
    expect(flags).not.toContain('no_mnre')
    expect(flags).not.toContain('overdue')
  })

  it('flags MNRE and completion report after install on subsidy jobs', () => {
    const flags = jobBlockers(
      p({
        id: 'b3',
        projectStatus: 'UNDER_INSTALLATION',
        installationCompletionDate: '2026-10-01T00:00:00.000Z',
        mnrePortalRegistrationDate: null,
        completionReportSubmissionDate: null,
        documentCategories: ['kseb'],
      }),
      '2026-10-29',
    )
    expect(flags).toContain('no_mnre')
    expect(flags).toContain('no_cr')
    expect(flags).toContain('no_mnre_doc')
  })
})

describe('buildDeliveryControl', () => {
  it('keeps only in-delivery statuses and buckets overdue into CQ', () => {
    const report = buildDeliveryControl(
      [
        p({ id: 'lead', projectStatus: 'LEAD' }),
        p({ id: 'done', projectStatus: 'COMPLETED' }),
        p({
          id: 'overdue',
          projectStatus: 'UNDER_INSTALLATION',
          expectedCommissioningDate: '2026-09-01T00:00:00.000Z',
          customerName: 'Overdue Villa',
        }),
        p({
          id: 'cq',
          expectedCommissioningDate: '2026-11-15T00:00:00.000Z',
          customerName: 'RAK Tower',
        }),
        p({
          id: 'nodate',
          expectedCommissioningDate: null,
          customerName: 'No Date',
        }),
      ],
      NOW,
    )
    expect(report.jobs.map((j) => j.id).sort()).toEqual(['cq', 'nodate', 'overdue'])
    expect(report.jobs.find((j) => j.id === 'overdue')?.forecastBucket).toBe('CQ')
    expect(report.jobs.find((j) => j.id === 'nodate')?.unscheduled).toBe(true)
    expect(report.kpis.inDeliveryJobs).toBe(3)
    expect(report.kpis.overdueJobs).toBe(1)
    expect(report.kpis.unscheduledJobs).toBe(1)
    expect(report.board.unscheduledJobs).toBe(1)
    const jobsRow = report.board.rows.find((r) => r.key === 'jobs')
    expect(jobsRow?.values[0]).toBeGreaterThanOrEqual(2)
    expect(jobsRow?.total).toBe(2)
  })

  it('aggregates ops load including an Unassigned row', () => {
    const report = buildDeliveryControl(
      [
        p({ id: 'a', assignedOpsId: 'ops1', opsPersonName: 'Ops One', projectCost: 100_000 }),
        p({ id: 'b', assignedOpsId: 'ops1', opsPersonName: 'Ops One', projectCost: 200_000 }),
        p({ id: 'c', assignedOpsId: null, opsPersonName: null, projectCost: 50_000 }),
      ],
      NOW,
    )
    expect(report.opsLoad).toHaveLength(2)
    expect(report.opsLoad[0]).toMatchObject({ opsPersonName: 'Ops One', jobs: 2, orderValue: 300_000 })
    expect(report.opsLoad[1]).toMatchObject({ opsPersonName: 'Unassigned', jobs: 1, opsPersonId: null })
    expect(report.kpis.unassignedJobs).toBe(1)
  })
})

describe('subsidyClock', () => {
  it('keeps completed-not-credited subsidy on the clock, not the factory board', () => {
    const report = buildDeliveryControl(
      [
        p({
          id: 'waiting',
          projectStatus: 'COMPLETED',
          subsidyRequestDate: '2026-08-01T00:00:00.000Z',
          installationCompletionDate: '2026-07-01T00:00:00.000Z',
          completionReportSubmissionDate: '2026-07-15T00:00:00.000Z',
          mnrePortalRegistrationDate: '2026-07-10T00:00:00.000Z',
          customerName: 'Credit Wait',
        }),
        p({
          id: 'credited',
          projectStatus: 'COMPLETED_SUBSIDY_CREDITED',
          subsidyRequestDate: '2026-07-01T00:00:00.000Z',
          subsidyCreditedDate: '2026-09-01T00:00:00.000Z',
        }),
        p({ id: 'lead', projectStatus: 'LEAD', type: 'SUBSIDY' }),
        p({ id: 'cash', projectStatus: 'CONFIRMED', type: 'NON_SUBSIDY' }),
      ],
      NOW,
    )
    expect(report.jobs.map((j) => j.id)).toEqual(['cash'])
    expect(report.subsidyClock.jobs.map((j) => j.id)).toEqual(['waiting'])
    expect(report.subsidyClock.kpis.awaitingCreditJobs).toBe(1)
    expect(report.subsidyClock.kpis.completedNotCreditedJobs).toBe(1)
    expect(isOnSubsidyClock(p({ id: 'lead', projectStatus: 'LEAD' }))).toBe(false)
  })

  it('walks KSEB → install → MNRE → request, then awaiting credit', () => {
    expect(subsidyClockStep(p({ id: 'a', feasibilityDate: null, registrationDate: null }))).toBe(
      'kseb_feasibility',
    )
    expect(subsidyClockStep(p({ id: 'b', registrationDate: null }))).toBe('kseb_registration')
    expect(subsidyClockStep(p({ id: 'c' }))).toBe('install')
    expect(
      subsidyClockStep(
        p({
          id: 'd',
          installationCompletionDate: '2026-10-01T00:00:00.000Z',
          mnrePortalRegistrationDate: null,
        }),
      ),
    ).toBe('mnre_portal')
    expect(
      subsidyClockStep(
        p({
          id: 'e',
          installationCompletionDate: '2026-10-01T00:00:00.000Z',
          mnrePortalRegistrationDate: '2026-10-05T00:00:00.000Z',
          completionReportSubmissionDate: null,
        }),
      ),
    ).toBe('completion_report')
    expect(
      subsidyClockStep(
        p({
          id: 'f',
          installationCompletionDate: '2026-10-01T00:00:00.000Z',
          mnrePortalRegistrationDate: '2026-10-05T00:00:00.000Z',
          completionReportSubmissionDate: '2026-10-10T00:00:00.000Z',
        }),
      ),
    ).toBe('request')
    expect(
      subsidyClockStep(
        p({
          id: 'g',
          subsidyRequestDate: '2026-10-12T00:00:00.000Z',
          feasibilityDate: null,
        }),
      ),
    ).toBe('awaiting_credit')
  })

  it('flags completed jobs that never filed a subsidy request', () => {
    const report = buildDeliveryControl(
      [
        p({
          id: 'gap',
          projectStatus: 'COMPLETED',
          subsidyRequestDate: null,
          installationCompletionDate: '2026-06-01T00:00:00.000Z',
          customerName: 'No request',
        }),
      ],
      NOW,
    )
    expect(report.subsidyClock.jobs[0].exceptions).toContain('completed_not_requested')
    expect(report.subsidyClock.jobs[0].exceptions).toContain('status_ahead')
    expect(report.subsidyClock.kpis.exceptionJobs).toBe(1)
    expect(report.subsidyClock.jobs[0].daysInStep).toBeGreaterThanOrEqual(90)
    expect(report.subsidyClock.kpis.stale90Jobs).toBe(1)
  })

  it('does not show negative days when a step date is in the future', () => {
    const report = buildDeliveryControl(
      [
        p({
          id: 'future',
          projectStatus: 'UNDER_INSTALLATION',
          completionReportSubmissionDate: '2026-11-10T00:00:00.000Z',
          installationCompletionDate: '2026-10-01T00:00:00.000Z',
          mnrePortalRegistrationDate: '2026-10-05T00:00:00.000Z',
        }),
      ],
      NOW,
    )
    expect(report.subsidyClock.jobs[0].step).toBe('request')
    expect(report.subsidyClock.jobs[0].daysInStep).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { ProjectStatus } from '../types'
import type { ZenithExplorerProject } from '../types/zenithExplorer'
import type { ZenithDateFilter } from '../components/zenith/zenithTypes'
import {
  buildForecastDrawerOpenPayload,
  buildForecastOpenDealsProjectsHref,
  buildZenithDrawerListProjectsHref,
} from './zenithListProjectsDeepLink'

const fy: ZenithDateFilter = {
  selectedFYs: ['2026-27'],
  selectedQuarters: [],
  selectedMonths: [],
}

function deal(partial: Partial<ZenithExplorerProject> & { id: string }): ZenithExplorerProject {
  return {
    projectStatus: ProjectStatus.PROPOSAL,
    stageLabel: 'Proposal',
    deal_value: 100000,
    lead_source: 'Sales',
    customer_segment: 'Residential',
    financial_year: '2026-27',
    assigned_to_id: 'arjun-id',
    assigned_to_name: 'Arjun Sasidharan',
    updated_at: '2026-08-01T00:00:00.000Z',
    customer_name: 'RADHA',
    ...partial,
  }
}

function params(href: string | null): URLSearchParams {
  expect(href).toBeTruthy()
  const q = href!.split('?')[1] ?? ''
  return new URLSearchParams(q)
}

describe('buildForecastOpenDealsProjectsHref', () => {
  it('scopes a Sales bar to that salesperson and open stages + FY', () => {
    const href = buildForecastOpenDealsProjectsHref(fy, {
      kind: 'slice',
      dimension: 'sales',
      label: 'Arjun Sasidharan',
      band: 'all',
      sample: deal({ id: 'p1' }),
    })
    const q = params(href)
    expect(q.getAll('salespersonId')).toEqual(['arjun-id'])
    expect(q.getAll('fy')).toEqual(['2026-27'])
    expect(q.getAll('status')).toEqual([
      ProjectStatus.LEAD,
      ProjectStatus.SITE_SURVEY,
      ProjectStatus.PROPOSAL,
      ProjectStatus.CONFIRMED,
      ProjectStatus.UNDER_INSTALLATION,
      ProjectStatus.SUBMITTED_FOR_SUBSIDY,
    ])
    expect(q.get('salespersonUnassigned')).toBeNull()
  })

  it('uses Unassigned + Early band statuses', () => {
    const href = buildForecastOpenDealsProjectsHref(fy, {
      kind: 'slice',
      dimension: 'sales',
      label: 'Unassigned',
      band: 'early',
    })
    const q = params(href)
    expect(q.get('salespersonUnassigned')).toBe('true')
    expect(q.getAll('salespersonId')).toEqual([])
    expect(q.getAll('status')).toEqual([
      ProjectStatus.LEAD,
      ProjectStatus.SITE_SURVEY,
      ProjectStatus.PROPOSAL,
    ])
  })

  it('maps source / segment / stage slices', () => {
    const source = params(
      buildForecastOpenDealsProjectsHref(fy, {
        kind: 'slice',
        dimension: 'source',
        label: 'Referral',
        band: 'all',
      }),
    )
    expect(source.getAll('leadSource')).toEqual(['REFERRAL'])

    const segment = params(
      buildForecastOpenDealsProjectsHref(fy, {
        kind: 'slice',
        dimension: 'segment',
        label: 'Residential',
        band: 'committed',
      }),
    )
    expect(segment.getAll('customerType')).toEqual(['RESIDENTIAL'])
    expect(segment.getAll('status')).toEqual([
      ProjectStatus.CONFIRMED,
      ProjectStatus.UNDER_INSTALLATION,
      ProjectStatus.SUBMITTED_FOR_SUBSIDY,
    ])

    const stage = params(
      buildForecastOpenDealsProjectsHref(fy, {
        kind: 'slice',
        dimension: 'stage',
        label: 'Proposal',
        band: 'all',
      }),
    )
    expect(stage.getAll('status')).toEqual([ProjectStatus.PROPOSAL])
  })

  it('does not invent a team-wide Open in Projects for Top 3 concentration', () => {
    expect(
      buildForecastOpenDealsProjectsHref(fy, { kind: 'top', band: 'all' }),
    ).toBeNull()
  })

  it('falls back to salesperson name when the sample has no id', () => {
    const href = buildForecastOpenDealsProjectsHref(fy, {
      kind: 'slice',
      dimension: 'sales',
      label: 'Arjun Sasidharan',
      band: 'all',
      sample: deal({ id: 'p1', assigned_to_id: null }),
    })
    expect(params(href).get('salespersonName')).toBe('Arjun Sasidharan')
    expect(params(href).getAll('salespersonId')).toEqual([])
  })
})

describe('buildForecastDrawerOpenPayload', () => {
  it('uses weighted totals and the salesperson from the filtered deals', () => {
    const payload = buildForecastDrawerOpenPayload(fy, {
      filterLabel: 'Weighted pipeline · Sales · Arjun Sasidharan',
      filteredProjects: [
        deal({ id: 'a', assigned_to_id: 'arjun-id' }),
        deal({ id: 'b', assigned_to_id: 'arjun-id', stageLabel: 'Confirmed Order', deal_value: 210000 }),
      ],
      kind: 'slice',
      dimension: 'sales',
      label: 'Arjun Sasidharan',
      band: 'all',
    })
    expect(payload.listAmountMode).toBe('weighted_pipeline')
    expect(params(payload.projectsPageHref).getAll('salespersonId')).toEqual(['arjun-id'])
  })
})

describe('buildZenithDrawerListProjectsHref outstanding_sales', () => {
  it('pins payment pending/partial to the clicked salesperson', () => {
    const href = buildZenithDrawerListProjectsHref(
      'outstanding_sales',
      'Arjun Sasidharan',
      fy,
      undefined,
      deal({ id: 'p1', assigned_to_id: 'arjun-id' }),
    )
    const q = params(href)
    expect(q.getAll('salespersonId')).toEqual(['arjun-id'])
    expect(q.getAll('paymentStatus')).toEqual(['PENDING', 'PARTIAL'])
    expect(q.getAll('fy')).toEqual(['2026-27'])
  })
})

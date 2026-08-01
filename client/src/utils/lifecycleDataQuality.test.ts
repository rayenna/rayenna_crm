import { describe, expect, it } from 'vitest'
import { ProjectStatus, UserRole } from '../types'
import {
  evaluateLifecycleDataQuality,
  peSoftGateFindings,
  presentLifecycleDataQualityForViewer,
  shouldShowLifecycleDataQualityBanner,
} from './lifecycleDataQuality'

function baseProject(
  over: Partial<Parameters<typeof evaluateLifecycleDataQuality>[0]> = {},
): Parameters<typeof evaluateLifecycleDataQuality>[0] {
  return {
    id: 'proj-1',
    customerId: 'cust-1',
    projectStatus: ProjectStatus.PROPOSAL,
    systemCapacity: 10,
    panelCapacityW: 590,
    panelBrand: 'Waaree',
    inverterBrand: 'Deye',
    documents: [{ id: 'd1' } as any],
    customer: { latitude: 10.0, longitude: 76.2, salespersonId: 'sales-1' } as any,
    ...over,
  }
}

describe('evaluateLifecycleDataQuality', () => {
  it('skips all checks when status is LOST', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.LOST,
        systemCapacity: undefined,
        panelCapacityW: null,
        customer: { latitude: null, longitude: null } as any,
      }),
      { peStatus: 'none' },
    )
    expect(findings).toEqual([])
  })

  it('flags PROPOSAL missing capacity and GPS as PE soft-gates', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.PROPOSAL,
        systemCapacity: undefined,
        customer: { latitude: null, longitude: null } as any,
      }),
      { peStatus: 'draft' },
    )
    const ids = findings.map((f) => f.id)
    expect(ids).toContain('missing_system_capacity')
    expect(ids).toContain('missing_gps')
    expect(peSoftGateFindings(findings).map((f) => f.id)).toEqual(
      expect.arrayContaining(['missing_system_capacity', 'missing_gps']),
    )
    const peInfo = findings.find((f) => f.id === 'pe_none_info')
    expect(peInfo).toBeUndefined()
  })

  it('adds informational PE-not-started on PROPOSAL without soft-gate', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({ projectStatus: ProjectStatus.PROPOSAL }),
      { peStatus: 'none' },
    )
    const peInfo = findings.find((f) => f.id === 'pe_none_info')
    expect(peInfo?.severity).toBe('info')
    expect(peInfo?.peSoftGate).toBe(false)
  })

  it('soft-gates CONFIRMED when PE artifacts are none', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.CONFIRMED,
        documents: [{ id: 'd1' } as any],
      }),
      { peStatus: 'none' },
    )
    const pe = findings.find((f) => f.id === 'pe_none')
    expect(pe?.peSoftGate).toBe(true)
    expect(peSoftGateFindings(findings).some((f) => f.id === 'pe_none')).toBe(true)
  })

  it('warns Under Installation brands without PE soft-gate', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.UNDER_INSTALLATION,
        panelBrand: '',
        inverterBrand: '',
        documents: [],
      }),
    )
    const brands = findings.find((f) => f.id === 'missing_brands')
    expect(brands).toBeTruthy()
    expect(brands?.peSoftGate).toBe(false)
    expect(peSoftGateFindings(findings)).toEqual([])
  })

  it('returns empty for clean CONFIRMED with PE ready', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.CONFIRMED,
        documents: [{ id: 'd1' } as any],
      }),
      { peStatus: 'proposal-ready' },
    )
    expect(findings).toEqual([])
  })

  it('flags decimal system capacity as missing', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({ systemCapacity: 10.46 }),
      { peStatus: 'draft' },
    )
    expect(findings.some((f) => f.id === 'missing_system_capacity')).toBe(true)
  })

  it('does not flag GPS on LEAD', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.LEAD,
        customer: { latitude: null, longitude: null } as any,
      }),
    )
    expect(findings.find((f) => f.id === 'missing_gps')).toBeUndefined()
  })

  it('flags GPS on SITE_SURVEY without PE soft-gate', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.SITE_SURVEY,
        customer: { latitude: null, longitude: null } as any,
      }),
    )
    const gps = findings.find((f) => f.id === 'missing_gps')
    expect(gps).toBeTruthy()
    expect(gps?.peSoftGate).toBe(false)
    expect(gps?.href).toContain('?edit=1')
  })

  it('accepts numeric strings for capacity and GPS', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        systemCapacity: '10' as any,
        panelCapacityW: '590' as any,
        customer: { latitude: '10.1' as any, longitude: '76.2' as any },
      }),
      { peStatus: 'proposal-ready' },
    )
    expect(findings.find((f) => f.id === 'missing_system_capacity')).toBeUndefined()
    expect(findings.find((f) => f.id === 'missing_panel_wattage')).toBeUndefined()
    expect(findings.find((f) => f.id === 'missing_gps')).toBeUndefined()
  })

  it('does not require brands on SUBMITTED_FOR_SUBSIDY', () => {
    const findings = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY,
        panelBrand: '',
        inverterBrand: '',
        documents: [{ id: 'd1' } as any],
      }),
    )
    expect(findings.find((f) => f.id === 'missing_brands')).toBeUndefined()
  })
})

describe('presentLifecycleDataQualityForViewer', () => {
  const project = {
    ...baseProject({
      projectStatus: ProjectStatus.CONFIRMED,
      panelCapacityW: null,
      salespersonId: 'sales-1',
      documents: [],
      customer: { latitude: null, longitude: null, salespersonId: 'sales-1' } as any,
    }),
    salespersonId: 'sales-1',
  }

  it('hides banner for Finance', () => {
    expect(shouldShowLifecycleDataQualityBanner({ role: UserRole.FINANCE })).toBe(false)
    const raw = evaluateLifecycleDataQuality(project, { peStatus: 'proposal-ready' })
    const presented = presentLifecycleDataQualityForViewer(raw, {
      project,
      user: { id: 'fin-1', role: UserRole.FINANCE },
    })
    expect(presented).toEqual([])
  })

  it('Sales: panel wattage asks Ops with no Fix link; capacity keeps Fix', () => {
    const raw = evaluateLifecycleDataQuality(
      baseProject({
        projectStatus: ProjectStatus.PROPOSAL,
        panelCapacityW: null,
        systemCapacity: undefined,
        salespersonId: 'sales-1' as any,
      } as any),
      { peStatus: 'draft' },
    )
    // attach salespersonId for canEditProject
    const proj = {
      ...baseProject({
        projectStatus: ProjectStatus.PROPOSAL,
        panelCapacityW: null,
        systemCapacity: undefined,
      }),
      salespersonId: 'sales-1',
    }
    const presented = presentLifecycleDataQualityForViewer(raw, {
      project: proj as any,
      user: { id: 'sales-1', role: UserRole.SALES },
    })
    const watt = presented.find((f) => f.id === 'missing_panel_wattage')
    expect(watt?.href).toBeUndefined()
    expect(watt?.detail).toMatch(/Operations/)
    const cap = presented.find((f) => f.id === 'missing_system_capacity')
    expect(cap?.href).toContain('/projects/')
    expect(cap?.href).toContain('/edit')
  })

  it('Ops on CONFIRMED can Fix panel wattage', () => {
    const proj = {
      ...baseProject({
        projectStatus: ProjectStatus.CONFIRMED,
        panelCapacityW: null,
        documents: [{ id: 'd1' } as any],
      }),
      salespersonId: 'sales-1',
    }
    const raw = evaluateLifecycleDataQuality(proj, { peStatus: 'proposal-ready' })
    const presented = presentLifecycleDataQualityForViewer(raw, {
      project: proj as any,
      user: { id: 'ops-1', role: UserRole.OPERATIONS },
    })
    const watt = presented.find((f) => f.id === 'missing_panel_wattage')
    expect(watt?.href).toContain('/edit')
  })

  it('Sales own customer keeps GPS Fix link', () => {
    const proj = {
      ...baseProject({
        projectStatus: ProjectStatus.PROPOSAL,
        customer: { latitude: null, longitude: null, salespersonId: 'sales-1' } as any,
      }),
      salespersonId: 'sales-1',
    }
    const raw = evaluateLifecycleDataQuality(proj, { peStatus: 'draft' })
    const presented = presentLifecycleDataQualityForViewer(raw, {
      project: proj as any,
      user: { id: 'sales-1', role: UserRole.SALES },
    })
    const gps = presented.find((f) => f.id === 'missing_gps')
    expect(gps?.href).toContain('?edit=1')
  })

  it('Ops on PROPOSAL cannot Fix lifecycle yet; copy points to Admin', () => {
    const proj = {
      ...baseProject({
        projectStatus: ProjectStatus.PROPOSAL,
        panelCapacityW: null,
      }),
      salespersonId: 'sales-1',
    }
    const raw = evaluateLifecycleDataQuality(proj, { peStatus: 'draft' })
    const presented = presentLifecycleDataQualityForViewer(raw, {
      project: proj as any,
      user: { id: 'ops-1', role: UserRole.OPERATIONS },
    })
    const watt = presented.find((f) => f.id === 'missing_panel_wattage')
    expect(watt?.href).toBeUndefined()
    expect(watt?.detail).toMatch(/Admin/)
  })

  it('Sales PE-none keeps Proposals guidance without Fix link', () => {
    const proj = {
      ...baseProject({ projectStatus: ProjectStatus.PROPOSAL }),
      salespersonId: 'sales-1',
    }
    const raw = evaluateLifecycleDataQuality(proj, { peStatus: 'none' })
    const presented = presentLifecycleDataQualityForViewer(raw, {
      project: proj as any,
      user: { id: 'sales-1', role: UserRole.SALES },
    })
    const pe = presented.find((f) => f.id === 'pe_none_info')
    expect(pe?.href).toBeUndefined()
    expect(pe?.detail).toMatch(/Proposals/)
    expect(pe?.detail).not.toMatch(/^Ask Sales/)
  })

  it('Finance soft-gate still sees raw pe findings when evaluating gate', () => {
    const proj = {
      ...baseProject({
        projectStatus: ProjectStatus.CONFIRMED,
        panelCapacityW: null,
        documents: [{ id: 'd1' } as any],
      }),
      salespersonId: 'sales-1',
    }
    const raw = evaluateLifecycleDataQuality(proj, { peStatus: 'none' })
    expect(peSoftGateFindings(raw).some((f) => f.id === 'pe_none')).toBe(true)
    expect(
      presentLifecycleDataQualityForViewer(raw, {
        project: proj as any,
        user: { id: 'fin-1', role: UserRole.FINANCE },
      }),
    ).toEqual([])
  })
})

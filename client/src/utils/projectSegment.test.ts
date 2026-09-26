import { describe, expect, it } from 'vitest'
import {
  defaultPanelTypeForProjectSegment,
  panelTypeMatchesProjectSegment,
} from './projectSegment'

describe('projectSegment panel type rules', () => {
  it('maps Subsidy → DCR and Non-Subsidy → Non-DCR', () => {
    expect(defaultPanelTypeForProjectSegment('SUBSIDY')).toBe('DCR')
    expect(defaultPanelTypeForProjectSegment('NON_SUBSIDY')).toBe('Non-DCR')
    expect(defaultPanelTypeForProjectSegment('RESIDENTIAL_SUBSIDY')).toBe('DCR')
    expect(defaultPanelTypeForProjectSegment('RESIDENTIAL_NON_SUBSIDY')).toBe('Non-DCR')
  })

  it('detects mismatches including blank panel type', () => {
    expect(panelTypeMatchesProjectSegment('SUBSIDY', 'DCR')).toBe(true)
    expect(panelTypeMatchesProjectSegment('SUBSIDY', 'Non-DCR')).toBe(false)
    expect(panelTypeMatchesProjectSegment('SUBSIDY', null)).toBe(false)
    expect(panelTypeMatchesProjectSegment('NON_SUBSIDY', 'Non-DCR')).toBe(true)
    expect(panelTypeMatchesProjectSegment('NON_SUBSIDY', 'DCR')).toBe(false)
  })
})

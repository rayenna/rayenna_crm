/** Display labels for Lost deal taxonomy (keep in sync with Prisma LostReason / LostToCompetitionReason). */

export const LOST_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'LOST_TO_COMPETITION', label: 'Lost to Competition' },
  { value: 'NO_BUDGET', label: 'No Budget' },
  { value: 'FINANCING_FAILED', label: 'Financing / Loan Failed' },
  { value: 'INDEFINITELY_DELAYED', label: 'Indefinitely Delayed / Not Ready' },
  { value: 'NO_FEASIBILITY', label: 'Site Not Feasible (roof, shade, structure)' },
  { value: 'SOCIETY_OR_LANDLORD_BLOCK', label: 'Society / Landlord / Association Block' },
  { value: 'REGULATORY_DISCOM', label: 'Regulatory / DISCOM / Net Metering Friction' },
  { value: 'CUSTOMER_NO_RESPONSE', label: 'Customer No Response / Ghosted' },
  { value: 'WRONG_LEAD', label: 'Wrong Lead / Not Serious' },
  { value: 'DIY_OR_LOCAL_INSTALLER', label: 'Went with DIY / Local Installer' },
  { value: 'PROPERTY_SOLD_OR_MOVED', label: 'Property Sold / Customer Moved' },
  { value: 'CUSTOMER_INTERNAL_DISAGREEMENT', label: 'Customer Internal Disagreement' },
  { value: 'OTHER', label: 'Other' },
]

export const LOST_TO_COMPETITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'LOST_DUE_TO_PRICE', label: 'Lost due to Price' },
  { value: 'LOST_DUE_TO_FEATURES', label: 'Lost due to Features / Specs' },
  { value: 'LOST_DUE_TO_TIMELINE', label: 'Lost due to Timeline / Availability' },
  { value: 'LOST_DUE_TO_BRAND_OR_WARRANTY', label: 'Lost due to Brand / Warranty' },
  { value: 'LOST_DUE_TO_RELATIONSHIP_OTHER', label: 'Lost due to Relationship / Other factors' },
]

export function lostReasonLabel(value: string | null | undefined): string {
  if (!value) return ''
  return LOST_REASON_OPTIONS.find((o) => o.value === value)?.label || value
}

export function lostToCompetitionLabel(value: string | null | undefined): string {
  if (!value) return ''
  return LOST_TO_COMPETITION_OPTIONS.find((o) => o.value === value)?.label || value
}

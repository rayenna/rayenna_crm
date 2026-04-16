/** Maps CRM `financingBank` enum values to display labels (same as Project detail). */
export const FINANCING_BANK_LABELS: Record<string, string> = {
  SBI: 'State Bank of India (SBI)',
  HDFC_BANK: 'HDFC Bank',
  ICICI_BANK: 'ICICI Bank',
  AXIS_BANK: 'Axis Bank',
  KOTAK_MAHINDRA_BANK: 'Kotak Mahindra Bank',
  INDUSIND_BANK: 'IndusInd Bank',
  YES_BANK: 'YES Bank',
  IDFC_FIRST_BANK: 'IDFC FIRST Bank',
  PUNJAB_NATIONAL_BANK: 'Punjab National Bank (PNB)',
  BANK_OF_BARODA: 'Bank of Baroda',
  CANARA_BANK: 'Canara Bank',
  UNION_BANK_OF_INDIA: 'Union Bank of India',
  FEDERAL_BANK: 'Federal Bank',
  SOUTH_INDIAN_BANK: 'South Indian Bank',
  CATHOLIC_SYRIAN_BANK: 'Catholic Syrian Bank',
  DHANLAXMI_BANK: 'Dhanlaxmi Bank',
  KERALA_GRAMIN_BANK: 'Kerala Gramin Bank',
  KERALA_BANK: 'Kerala Bank',
  KARNATAKA_BANK: 'Karnataka Bank',
  RBL_BANK: 'RBL Bank',
  TAMILNADU_MERCANTILE_BANK: 'Tamilnadu Mercantile Bank',
  CITY_UNION_BANK: 'City Union Bank',
  INDIAN_BANK: 'Indian Bank',
  INDIAN_OVERSEAS_BANK: 'Indian Overseas Bank',
  DCB_BANK: 'DCB Bank',
  KARUR_VYSYA_BANK: 'Karur Vysya Bank',
  EQUITAS_SMALL_FINANCE_BANK: 'Equitas Small Finance Bank',
  UJJIVAN_SMALL_FINANCE_BANK: 'Ujjivan Small Finance Bank',
  JANA_SMALL_FINANCE_BANK: 'Jana Small Finance Bank',
  UTKARSH_SMALL_FINANCE_BANK: 'Utkarsh Small Finance Bank',
  SHIVALIK_SMALL_FINANCE_BANK: 'Shivalik Small Finance Bank',
  AU_SMALL_FINANCE_BANK: 'AU Small Finance Bank',
  CAPITAL_SMALL_FINANCE_BANK: 'Capital Small Finance Bank',
  BANDHAN_BANK: 'Bandhan Bank',
  JAMMU_KASHMIR_BANK: 'Jammu & Kashmir Bank',
  BANK_OF_INDIA: 'Bank of India',
  BANK_OF_MAHARASHTRA: 'Bank of Maharashtra',
  ESAF_SMALL_FINANCE_BANK: 'ESAF Small Finance Bank',
  IDBI_BANK: 'IDBI Bank',
  OTHER: 'Other',
}

/** Same order as the project financing bank picker (values match stored `financingBank`). */
const FINANCING_BANK_OPTION_ORDER: readonly string[] = [
  'AXIS_BANK',
  'AU_SMALL_FINANCE_BANK',
  'BANDHAN_BANK',
  'BANK_OF_BARODA',
  'BANK_OF_INDIA',
  'BANK_OF_MAHARASHTRA',
  'CANARA_BANK',
  'CAPITAL_SMALL_FINANCE_BANK',
  'KOTAK_MAHINDRA_BANK',
  'CATHOLIC_SYRIAN_BANK',
  'CITY_UNION_BANK',
  'DCB_BANK',
  'DHANLAXMI_BANK',
  'EQUITAS_SMALL_FINANCE_BANK',
  'ESAF_SMALL_FINANCE_BANK',
  'FEDERAL_BANK',
  'HDFC_BANK',
  'ICICI_BANK',
  'IDBI_BANK',
  'IDFC_FIRST_BANK',
  'INDIAN_BANK',
  'INDIAN_OVERSEAS_BANK',
  'INDUSIND_BANK',
  'JAMMU_KASHMIR_BANK',
  'JANA_SMALL_FINANCE_BANK',
  'KARNATAKA_BANK',
  'KARUR_VYSYA_BANK',
  'KERALA_BANK',
  'KERALA_GRAMIN_BANK',
  'PUNJAB_NATIONAL_BANK',
  'RBL_BANK',
  'SBI',
  'SHIVALIK_SMALL_FINANCE_BANK',
  'SOUTH_INDIAN_BANK',
  'TAMILNADU_MERCANTILE_BANK',
  'UJJIVAN_SMALL_FINANCE_BANK',
  'UNION_BANK_OF_INDIA',
  'UTKARSH_SMALL_FINANCE_BANK',
  'YES_BANK',
  'OTHER',
]

export const FINANCING_BANK_FORM_OPTIONS: { value: string; label: string }[] = FINANCING_BANK_OPTION_ORDER.map(
  (value) => ({
    value,
    label: FINANCING_BANK_LABELS[value] || value,
  }),
)

/** Teal accent aligned with healthy Deal Health styling (`dealHealthScore.ts`). */
export const FINANCING_BANK_ACCENT = 'var(--accent-teal)'

/**
 * Human-readable financing bank for display. Returns `null` when nothing to show.
 */
export function getFinancingBankDisplayName(
  financingBank?: string | null,
  financingBankOther?: string | null,
): string | null {
  const other = financingBankOther?.trim()
  if (financingBank === 'OTHER') {
    return other || 'Other'
  }
  if (financingBank) {
    return FINANCING_BANK_LABELS[financingBank] || financingBank
  }
  if (other) return other
  return null
}

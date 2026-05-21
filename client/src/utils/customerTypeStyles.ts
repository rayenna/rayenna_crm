import { CUSTOMER_TYPE_OPTIONS, type CustomerType } from './customerRecord'

/** Table row background by linked customer type (Residential = default list colours). */
export function getProjectRowCustomerTypeClasses(customerType?: string | null): string {
  switch (customerType as CustomerType | undefined) {
    case 'APARTMENT':
      return [
        'odd:bg-[color:color-mix(in srgb,var(--accent-blue) 10%, var(--bg-table-alt))]',
        'even:bg-[color:color-mix(in srgb,var(--accent-blue) 10%, var(--bg-card))]',
        'hover:bg-[color:color-mix(in srgb,var(--accent-blue) 18%, var(--bg-table-hover))]',
      ].join(' ')
    case 'COMMERCIAL':
      return [
        'odd:bg-[color:color-mix(in srgb,var(--accent-teal) 10%, var(--bg-table-alt))]',
        'even:bg-[color:color-mix(in srgb,var(--accent-teal) 10%, var(--bg-card))]',
        'hover:bg-[color:color-mix(in srgb,var(--accent-teal) 18%, var(--bg-table-hover))]',
      ].join(' ')
    default:
      return [
        'odd:bg-[color:var(--bg-table-alt)]',
        'even:bg-[color:var(--bg-card)]',
        'hover:bg-[color:var(--bg-table-hover)]',
      ].join(' ')
  }
}

export function getCustomerTypeLegendSwatchClass(customerType: CustomerType): string {
  switch (customerType) {
    case 'APARTMENT':
      return 'border border-[color:var(--accent-blue-border)] bg-[color:color-mix(in srgb,var(--accent-blue) 22%, var(--bg-card))]'
    case 'COMMERCIAL':
      return 'border border-[color:var(--accent-teal-border)] bg-[color:color-mix(in srgb,var(--accent-teal) 22%, var(--bg-card))]'
    default:
      return 'border border-[color:var(--border-default)] bg-[color:var(--bg-card)]'
  }
}

export function getCustomerTypeLegendLabel(customerType: CustomerType): string {
  return CUSTOMER_TYPE_OPTIONS.find((o) => o.value === customerType)?.label ?? customerType
}

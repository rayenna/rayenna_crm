import { CUSTOMER_TYPE_OPTIONS, type CustomerType } from './customerRecord'

export function normalizeCustomerType(raw?: string | null): CustomerType | null {
  if (!raw) return null
  const upper = String(raw).trim().toUpperCase()
  if (upper === 'RESIDENTIAL' || upper === 'APARTMENT' || upper === 'COMMERCIAL') {
    return upper as CustomerType
  }
  return null
}

/** Text colour for project name by customer type (light + dark via theme tokens). */
export function getProjectNameCustomerTypeColorClass(customerType?: string | null): string {
  switch (normalizeCustomerType(customerType)) {
    case 'APARTMENT':
      return 'text-[color:var(--accent-purple)]'
    case 'COMMERCIAL':
      return 'text-[color:var(--accent-teal)]'
    case 'RESIDENTIAL':
    default:
      return 'text-[color:var(--text-primary)]'
  }
}

/**
 * Projects list — colour on the project name line only (#slNo · customer).
 * Residential (and unknown): default primary text + gold on row hover.
 */
export function getProjectNameCustomerTypeTextClass(customerType?: string | null): string {
  const base =
    'min-w-0 truncate text-sm font-semibold transition-colors lg:truncate-none lg:line-clamp-2 lg:leading-snug lg:break-words'
  const ct = normalizeCustomerType(customerType)
  const hover =
    ct === 'APARTMENT' || ct === 'COMMERCIAL'
      ? 'group-hover:opacity-90'
      : 'group-hover:text-[color:var(--accent-gold)]'
  return `${base} ${getProjectNameCustomerTypeColorClass(customerType)} ${hover}`
}

/** Badge / legend swatch (Projects legend, Project detail, Project form). */
export function getCustomerTypeLegendSwatchClass(customerType: CustomerType): string {
  switch (customerType) {
    case 'RESIDENTIAL':
      return [
        'border border-[color:var(--accent-gold-border)]',
        'bg-[color:color-mix(in srgb,var(--accent-gold) 24%, var(--bg-card))]',
        'text-[color:var(--accent-gold)]',
      ].join(' ')
    case 'APARTMENT':
      return [
        'border border-[color:var(--accent-purple-border)]',
        'bg-[color:color-mix(in srgb,var(--accent-purple) 24%, var(--bg-card))]',
        'text-[color:var(--accent-purple)]',
      ].join(' ')
    case 'COMMERCIAL':
      return [
        'border border-[color:var(--accent-teal-border)]',
        'bg-[color:color-mix(in srgb,var(--accent-teal) 24%, var(--bg-card))]',
        'text-[color:var(--accent-teal)]',
      ].join(' ')
    default:
      return 'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)]'
  }
}

export function getCustomerTypeLegendLabel(customerType: CustomerType): string {
  return CUSTOMER_TYPE_OPTIONS.find((o) => o.value === customerType)?.label ?? customerType
}

/** Resolve swatch classes when customer type may be missing (detail/form). */
export function getCustomerTypeBadgeClasses(customerType?: string | null): string {
  const ct = normalizeCustomerType(customerType) ?? 'RESIDENTIAL'
  return getCustomerTypeLegendSwatchClass(ct)
}

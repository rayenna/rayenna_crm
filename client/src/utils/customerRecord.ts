import type { Customer } from '../types'
import { getPrimaryContactLabel } from './customContacts'

export type CustomerType = 'RESIDENTIAL' | 'APARTMENT' | 'COMMERCIAL'

export const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'APARTMENT', label: 'Apartment / housing society' },
  { value: 'COMMERCIAL', label: 'Commercial' },
]

export function isBusinessCustomerType(customerType?: string | null): boolean {
  return customerType === 'COMMERCIAL' || customerType === 'APARTMENT'
}

const RESIDENTIAL_ID_PROOF_TYPES = [
  'Aadhaar',
  'PAN',
  'Voters Card',
  'DL',
  'Passport',
  'Others',
] as const

const APARTMENT_ID_PROOF_TYPES = [
  'PAN',
  'Society Registration',
  'RERA Registration',
  'Occupancy Certificate',
] as const

const COMMERCIAL_ID_PROOF_TYPES = ['PAN', 'CIN', 'TAN'] as const

export function getIdProofTypeOptions(
  customerType?: string | null,
  currentValue?: string | null,
): { value: string; label: string }[] {
  let values: readonly string[]
  switch (customerType) {
    case 'APARTMENT':
      values = APARTMENT_ID_PROOF_TYPES
      break
    case 'COMMERCIAL':
      values = COMMERCIAL_ID_PROOF_TYPES
      break
    default:
      values = RESIDENTIAL_ID_PROOF_TYPES
  }
  const options = values.map((v) => ({ value: v, label: v }))
  const saved = currentValue?.trim()
  if (saved && !options.some((o) => o.value === saved)) {
    options.push({ value: saved, label: `${saved} (saved)` })
  }
  return options
}

export function isAllowedIdProofType(customerType: string | undefined | null, idProofType: string | undefined | null): boolean {
  if (!idProofType?.trim()) return true
  return getIdProofTypeOptions(customerType).some((o) => o.value === idProofType.trim())
}

export function getGstFormValue(customer: Pick<Customer, 'companyGst' | 'gstNumber'> | null | undefined): string {
  if (!customer) return ''
  return (customer.companyGst || customer.gstNumber || '').trim()
}

/** Short label for customer type (lists, project detail/form). */
export function formatCustomerTypeDisplay(customerType?: string | null): string {
  if (!customerType || customerType === 'RESIDENTIAL') return 'Residential'
  if (customerType === 'APARTMENT') return 'Apartment'
  if (customerType === 'COMMERCIAL') return 'Commercial'
  return String(customerType).replace(/_/g, ' ')
}

export function getCustomerDisplayName(customer: Customer): string {
  const type = customer.customerType
  const company = customer.companyName?.trim()
  if (isBusinessCustomerType(type) && company) {
    const contact = getPrimaryContactLabel(customer)
    return contact ? `${company} (${contact})` : company
  }
  const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  if (company) return company
  return customer.customerName?.trim() || 'Unknown'
}

export function validateCustomerIdentityFields(input: {
  customerType?: string
  companyName?: string
  firstName?: string
}): string[] {
  const errs: string[] = []
  const type = (input.customerType || 'RESIDENTIAL') as CustomerType
  const company = (input.companyName || '').trim()
  const first = (input.firstName || '').trim()

  if (isBusinessCustomerType(type)) {
    if (!company) {
      errs.push(
        type === 'APARTMENT'
          ? 'Society / building name is required for apartment customers.'
          : 'Company name is required for commercial customers.',
      )
    }
  } else if (!first) {
    errs.push('First name is required for residential customers.')
  }
  return errs
}

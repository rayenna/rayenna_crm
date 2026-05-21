import { CustomerType } from '@prisma/client';

export type CustomerNameInput = {
  customerType?: CustomerType | string | null;
  companyName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
};

const BUSINESS_TYPES: CustomerType[] = [CustomerType.COMMERCIAL, CustomerType.APARTMENT];

export function isBusinessCustomerType(customerType?: string | null): boolean {
  return customerType != null && BUSINESS_TYPES.includes(customerType as CustomerType);
}

/** Display / legacy customerName stored on the customer row. */
export function buildCustomerNameForSave(input: CustomerNameInput): string {
  const company = input.companyName?.trim() || '';
  const personParts = [input.firstName, input.middleName, input.lastName]
    .map((p) => (p != null ? String(p).trim() : ''))
    .filter(Boolean);
  const personName = personParts.join(' ');

  if (isBusinessCustomerType(input.customerType) && company) {
    return company;
  }
  if (personName) return personName;
  if (company) return company;
  return input.firstName?.trim() || company || 'Customer';
}

export function validateCustomerIdentity(input: CustomerNameInput): string | null {
  const type = (input.customerType as CustomerType) || CustomerType.RESIDENTIAL;
  const company = input.companyName?.trim() || '';
  const first = input.firstName?.trim() || '';

  if (isBusinessCustomerType(type)) {
    if (!company) {
      return type === CustomerType.APARTMENT
        ? 'Society / building name is required for apartment customers.'
        : 'Company name is required for commercial customers.';
    }
    return null;
  }

  if (!first) {
    return 'First name is required for residential customers.';
  }
  return null;
}

/** Keep companyGst and gstNumber aligned for Tally and exports. */
export function normalizeGstFields(companyGst?: string | null): {
  companyGst: string | null;
  gstNumber: string | null;
} {
  const value = companyGst != null && String(companyGst).trim() !== '' ? String(companyGst).trim() : null;
  return { companyGst: value, gstNumber: value };
}

export function getCustomerDisplayNameForExport(customer: CustomerNameInput & { customerName?: string | null }): string {
  const built = buildCustomerNameForSave(customer);
  if (built && built !== 'Customer') return built;
  return customer.customerName?.trim() || 'Unknown';
}

import { CustomerType } from '@prisma/client';

const RESIDENTIAL_ID_PROOF_TYPES = [
  'Aadhaar',
  'PAN',
  'Voters Card',
  'DL',
  'Passport',
  'Others',
] as const;

const APARTMENT_ID_PROOF_TYPES = [
  'PAN',
  'Society Registration',
  'RERA Registration',
  'Occupancy Certificate',
] as const;

const COMMERCIAL_ID_PROOF_TYPES = ['PAN', 'CIN', 'TAN'] as const;

export function getAllowedIdProofTypes(customerType?: CustomerType | string | null): readonly string[] {
  switch (customerType) {
    case CustomerType.APARTMENT:
      return APARTMENT_ID_PROOF_TYPES;
    case CustomerType.COMMERCIAL:
      return COMMERCIAL_ID_PROOF_TYPES;
    case CustomerType.RESIDENTIAL:
    default:
      return RESIDENTIAL_ID_PROOF_TYPES;
  }
}

export function validateIdProofTypeForCustomer(
  customerType: CustomerType | string | null | undefined,
  idProofNumber?: string | null,
  idProofType?: string | null,
): string | null {
  if (!idProofNumber?.trim()) return null;
  if (!idProofType?.trim()) {
    return 'Type of Id Proof is required when Id Proof# is provided';
  }
  const allowed = getAllowedIdProofTypes(customerType);
  const trimmedType = idProofType.trim();
  if (!allowed.some((a) => a === trimmedType)) {
    return `Type of Id Proof is not valid for ${customerType ?? 'RESIDENTIAL'} customers`;
  }
  return null;
}

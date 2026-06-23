import { describe, expect, it } from 'vitest';
import {
  buildBaseUsername,
  normalizeUsername,
  resolveUniqueUsernameCandidate,
  resolveUsernameNameParts,
} from './consumerUsername';
import { CustomerType, type Customer } from '@prisma/client';

function mockCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust1',
    customerId: 'ABC123',
    customerName: 'Test Customer',
    customerNameSortKey: 'test customer',
    prefix: null,
    firstName: 'Ajay',
    middleName: null,
    lastName: 'Kumar',
    customerType: CustomerType.RESIDENTIAL,
    contactPerson: null,
    phone: null,
    email: null,
    address: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    country: null,
    pinCode: null,
    latitude: null,
    longitude: null,
    gstNumber: null,
    contactNumbers: null,
    consumerNumber: null,
    idProofNumber: null,
    idProofType: null,
    companyName: null,
    companyGst: null,
    contacts: null,
    createdById: null,
    salespersonId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('consumerUsername', () => {
  it('builds firstname.lastname for residential', () => {
    const parts = resolveUsernameNameParts(mockCustomer());
    expect(buildBaseUsername(parts, 0)).toBe('ajay.kumar');
  });

  it('builds firstname only when last name missing', () => {
    const parts = resolveUsernameNameParts(mockCustomer({ lastName: null }));
    expect(buildBaseUsername(parts, 0)).toBe('ajay');
  });

  it('uses username suffix for additional projects', () => {
    const parts = resolveUsernameNameParts(mockCustomer());
    expect(buildBaseUsername(parts, 1)).toBe('ajay.username1');
    expect(buildBaseUsername(parts, 2)).toBe('ajay.username2');
  });

  it('falls back to society name for apartment without contact names', () => {
    const parts = resolveUsernameNameParts(
      mockCustomer({
        firstName: null,
        lastName: null,
        customerType: CustomerType.APARTMENT,
        companyName: 'GreenScape Apartments',
        contacts: [],
      }),
    );
    expect(buildBaseUsername(parts, 0)).toBe('greenscapeapartments');
  });

  it('resolves global username collisions', () => {
    const taken = new Set(['ajay.kumar']);
    expect(resolveUniqueUsernameCandidate('ajay.kumar', taken)).toBe('ajay.kumar2');
  });

  it('normalizes login usernames', () => {
    expect(normalizeUsername('  Ajay.Kumar ')).toBe('ajay.kumar');
  });
});

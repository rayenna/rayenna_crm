import { describe, expect, it } from 'vitest';
import {
  allPhonesFromCustomer,
  primaryEmailFromCustomer,
  primaryPhoneFromCustomer,
} from './consumerCustomerProfile';
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
    phone: '9999888777',
    email: 'ajay@example.com',
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
    contactNumbers: JSON.stringify(['8888777666']),
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

describe('consumerCustomerProfile contacts', () => {
  it('uses first phone from customer master order', () => {
    expect(primaryPhoneFromCustomer(mockCustomer())).toBe('9999888777');
    expect(allPhonesFromCustomer(mockCustomer())).toEqual(['9999888777', '8888777666']);
  });

  it('uses first email from customer master', () => {
    expect(primaryEmailFromCustomer(mockCustomer())).toBe('ajay@example.com');
  });

  it('includes apartment contact phones', () => {
    const customer = mockCustomer({
      phone: null,
      contactNumbers: null,
      email: null,
      customerType: CustomerType.APARTMENT,
      contacts: [
        {
          firstName: 'Admin',
          lastName: 'User',
          phones: ['7777000001', '7777000002'],
          emails: ['society@example.com'],
        },
      ],
    });
    expect(primaryPhoneFromCustomer(customer)).toBe('7777000001');
    expect(primaryEmailFromCustomer(customer)).toBe('society@example.com');
  });
});

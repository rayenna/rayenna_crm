import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  formatCustomerEmails,
  formatCustomerPhones,
  matchCustomerDetailLookupIntent,
  matchCustomersListIntent,
} from './customerDetailAsk';

describe('matchCustomerDetailLookupIntent', () => {
  it('matches customer details phrases', () => {
    const intent = matchCustomerDetailLookupIntent(
      'Customer details for Ramesh',
      UserRole.ADMIN,
    );
    expect(intent?.metric).toBe('customer_detail_lookup');
    expect(intent?.filters?.search).toMatch(/ramesh/i);
  });

  it('ignores project status phrases', () => {
    expect(matchCustomerDetailLookupIntent("What's the status of SL 1?", UserRole.ADMIN)).toBeNull();
  });
});

describe('matchCustomersListIntent', () => {
  it('lists customers by city', () => {
    const intent = matchCustomersListIntent('List customers in Kochi', UserRole.MANAGEMENT);
    expect(intent?.metric).toBe('customers_list_slice');
    expect(intent?.filters?.city).toMatch(/kochi/i);
  });

  it('lists apartments in customer master (not as city)', () => {
    const intent = matchCustomersListIntent(
      'show all apartments in customer master',
      UserRole.ADMIN,
    );
    expect(intent?.metric).toBe('customers_list_slice');
    expect(intent?.filters?.customerType).toBe('APARTMENT');
    expect(intent?.filters?.city).toBeUndefined();
  });

  it('lists residential and commercial types', () => {
    expect(
      matchCustomersListIntent('Show all residential in customer master', UserRole.SALES)
        ?.filters?.customerType,
    ).toBe('RESIDENTIAL');
    expect(
      matchCustomersListIntent('List commercial customers', UserRole.MANAGEMENT)?.filters
        ?.customerType,
    ).toBe('COMMERCIAL');
  });

  it('does not steal project lists', () => {
    expect(
      matchCustomersListIntent('List all subsidy projects', UserRole.ADMIN),
    ).toBeNull();
  });
});

describe('formatCustomerPhones / formatCustomerEmails', () => {
  it('parses JSON-encoded email and contactNumbers (no brackets in display)', () => {
    const c = {
      phone: null,
      email: '["balakrishnanarun2001@gmail.com"]',
      contactNumbers: '["9446177817"]',
      contacts: null,
    };
    expect(formatCustomerPhones(c)).toBe('9446177817');
    expect(formatCustomerEmails(c)).toBe('balakrishnanarun2001@gmail.com');
  });

  it('merges primary phone with contactNumbers and contacts', () => {
    const c = {
      phone: '9000000000',
      email: 'a@example.com',
      contactNumbers: '["9000000000","9111111111"]',
      contacts: JSON.stringify([
        { firstName: 'X', phones: ['9222222222'], emails: ['b@example.com'] },
      ]),
    };
    expect(formatCustomerPhones(c)).toBe('9000000000, 9111111111, 9222222222');
    expect(formatCustomerEmails(c)).toBe('a@example.com, b@example.com');
  });
});

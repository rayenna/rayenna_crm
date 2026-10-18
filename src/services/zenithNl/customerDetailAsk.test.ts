import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
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

  it('does not steal project lists', () => {
    expect(
      matchCustomersListIntent('List all subsidy projects', UserRole.ADMIN),
    ).toBeNull();
  });
});

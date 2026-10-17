import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchAskActionIntent, wantsNotFullyPaidPayment } from './askActions';

describe('matchAskActionIntent', () => {
  it('opens new customer for Sales', () => {
    const m = matchAskActionIntent('New Customer', UserRole.SALES);
    expect(m?.action).toBe('new_customer');
    expect(m?.href).toBe('/customers?new=1');
  });

  it('rejects new customer for Finance', () => {
    expect(matchAskActionIntent('New Customer', UserRole.FINANCE)).toBeNull();
  });

  it('opens create support ticket', () => {
    const m = matchAskActionIntent('Create a Support Ticket', UserRole.ADMIN);
    expect(m?.action).toBe('create_support_ticket');
    expect(m?.href).toBe('/support-tickets?new=1');
  });

  it('does not treat ticket analytics as create action', () => {
    expect(
      matchAskActionIntent('Show me the total support tickets raised', UserRole.ADMIN),
    ).toBeNull();
  });

  it('does not steal overdue analytics chip into navigate', () => {
    expect(
      matchAskActionIntent('Show overdue support tickets', UserRole.ADMIN),
    ).toBeNull();
  });

  it('navigates overdue queue from action label', () => {
    expect(
      matchAskActionIntent('Overdue Support Tickets', UserRole.OPERATIONS)?.href,
    ).toBe('/support-tickets?filter=overdue');
  });

  it('opens My Day', () => {
    expect(matchAskActionIntent('Open My Day', UserRole.FINANCE)?.href).toBe('/zenith?myday=1');
  });

  it('searches customer by name', () => {
    const m = matchAskActionIntent('find customer Ramesh', UserRole.OPERATIONS);
    expect(m?.action).toBe('customer_search');
    expect(m?.href).toBe('/customers?q=Ramesh');
  });

  it('opens tally for Finance', () => {
    expect(matchAskActionIntent('Go to Tally Export', UserRole.FINANCE)?.href).toBe(
      '/tally-export',
    );
  });

  it('opens new project', () => {
    expect(matchAskActionIntent('new project', UserRole.SALES)?.href).toBe('/projects/new');
  });

  it('opens bare under-installation list', () => {
    expect(matchAskActionIntent('Under Installation Projects', UserRole.ADMIN)?.href).toBe(
      '/projects?status=UNDER_INSTALLATION',
    );
  });

  it('does not steal under-installation + payment pending into bare stage nav', () => {
    expect(
      matchAskActionIntent(
        'List all Under Installation Projects where Payment is pending',
        UserRole.ADMIN,
      ),
    ).toBeNull();
    expect(
      matchAskActionIntent(
        'under installation projects where we have not received full payment',
        UserRole.MANAGEMENT,
      ),
    ).toBeNull();
  });

  it('detects not-fully-paid payment phrasing', () => {
    expect(wantsNotFullyPaidPayment('payment is pending')).toBe(true);
    expect(wantsNotFullyPaidPayment('not fully paid')).toBe(true);
    expect(wantsNotFullyPaidPayment('under installation only')).toBe(false);
  });
});

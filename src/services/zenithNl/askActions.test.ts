import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchAskActionIntent } from './askActions';

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
});

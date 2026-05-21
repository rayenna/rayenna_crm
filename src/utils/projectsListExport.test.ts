import { describe, expect, it } from 'vitest';
import { ProjectType } from '@prisma/client';
import { mapProjectToExportRow } from './projectsListExport';

describe('mapProjectToExportRow', () => {
  it('maps segment, customer type, and service type labels', () => {
    const row = mapProjectToExportRow({
      slNo: 42,
      type: ProjectType.SUBSIDY,
      projectServiceType: 'EPC_PROJECT',
      systemCapacity: 5.5,
      projectCost: 250000,
      projectStatus: 'CONFIRMED',
      paymentStatus: 'PARTIAL',
      year: '2024-25',
      confirmationDate: new Date('2024-06-15'),
      createdAt: new Date('2024-05-01'),
      customer: {
        customerId: 'C-001',
        customerName: 'Fallback Name',
        customerType: 'COMMERCIAL',
        consumerNumber: 'CN-99',
        prefix: 'Mr',
        firstName: 'Amit',
        lastName: 'Shah',
      },
      salesperson: { name: 'Priya', email: 'priya@example.com' },
    });

    expect(row['SL No']).toBe(42);
    expect(row['Customer ID']).toBe('C-001');
    expect(row['Customer Name']).toBe('Mr Amit Shah');
    expect(row['Customer Type']).toBe('Commercial');
    expect(row['Consumer Number']).toBe('CN-99');
    expect(row.Segment).toBe('Subsidy');
    expect(row['Project Service Type']).toBe('EPC PROJECT');
    expect(row['System Capacity (kW)']).toBe(5.5);
    expect(row['Project Cost']).toBe(250000);
    expect(row['Project Status']).toBe('CONFIRMED');
    expect(row['Payment Status']).toBe('PARTIAL');
    expect(row.Salesperson).toBe('Priya');
    expect(row['Salesperson Email']).toBe('priya@example.com');
    expect(row.Year).toBe('2024-25');
    expect(row['Confirmation Date']).toMatch(/15/);
    expect(row['Created At']).toMatch(/1/);
  });

  it('falls back to customerName when name parts are empty', () => {
    const row = mapProjectToExportRow({
      type: ProjectType.NON_SUBSIDY,
      projectStatus: 'LEAD',
      customer: {
        customerName: 'Green Apartments Society',
        customerType: 'APARTMENT',
      },
    });

    expect(row['Customer Name']).toBe('Green Apartments Society');
    expect(row['Customer Type']).toBe('Apartment');
    expect(row.Segment).toBe('Non-Subsidy');
  });

  it('uses empty strings for missing optional fields', () => {
    const row = mapProjectToExportRow({
      type: ProjectType.SUBSIDY,
      projectStatus: 'PROPOSAL',
    });

    expect(row['Customer ID']).toBe('');
    expect(row['Customer Type']).toBe('');
    expect(row['Project Service Type']).toBe('');
    expect(row.Salesperson).toBe('');
    expect(row['Confirmation Date']).toBe('');
  });
});

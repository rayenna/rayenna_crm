import { describe, expect, it } from 'vitest';
import { ProjectStatus, ProjectType, UserRole } from '@prisma/client';
import { buildProjectsWhere, parseProjectsListFilters } from './projectsListWhere';

const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
const salesUser = { id: 'sales-1', role: UserRole.SALES };
const opsUser = { id: 'ops-1', role: UserRole.OPERATIONS };
const financeUser = { id: 'fin-1', role: UserRole.FINANCE };

describe('parseProjectsListFilters', () => {
  it('normalizes array and scalar query params', () => {
    const filters = parseProjectsListFilters({
      status: ['CONFIRMED', 'PROPOSAL'],
      type: ProjectType.SUBSIDY,
      customerType: ['RESIDENTIAL', 'COMMERCIAL'],
      search: '  acme  ',
      fy: '2024-25',
      quarter: 'Q1',
      month: ['04', '05'],
      peBucket: 'draft',
      hasDocuments: 'true',
      availingLoan: 'true',
      zenithSlice: 'revenue',
      zenithFyProfit: 'true',
    });

    expect(filters.statusArray).toEqual(['CONFIRMED', 'PROPOSAL']);
    expect(filters.typeArray).toEqual([ProjectType.SUBSIDY]);
    expect(filters.customerTypeArray).toEqual(['RESIDENTIAL', 'COMMERCIAL']);
    expect(filters.search).toBe('acme');
    expect(filters.fyFilters).toEqual(['2024-25']);
    expect(filters.quarterArray).toEqual(['Q1']);
    expect(filters.monthArray).toEqual(['04', '05']);
    expect(filters.peBucket).toBe('draft');
    expect(filters.hasDocumentsActive).toBe(true);
    expect(filters.availingLoanActive).toBe(true);
    expect(filters.zenithSlice).toBe('revenue');
    expect(filters.zenithFyProfit).toBe(true);
  });

  it('maps legacy year param to fyFilters', () => {
    const filters = parseProjectsListFilters({ year: '2023-24' });
    expect(filters.fyFilters).toEqual(['2023-24']);
  });

  it('ignores invalid peBucket values', () => {
    const filters = parseProjectsListFilters({ peBucket: 'invalid' });
    expect(filters.peBucket).toBeNull();
  });

  it('parses lifecycleSpecsIncomplete and defers complete filter', () => {
    const filters = parseProjectsListFilters({
      lifecycleSpecsIncomplete: 'true',
      lifecycleSpecsComplete: 'true',
    });
    expect(filters.lifecycleSpecsIncompleteActive).toBe(true);
    expect(filters.lifecycleSpecsCompleteActive).toBe(false);
  });
});

describe('buildProjectsWhere', () => {
  it('scopes Sales users to their salespersonId', () => {
    const filters = parseProjectsListFilters({});
    const built = buildProjectsWhere(filters, salesUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where).toEqual({ salespersonId: 'sales-1' });
  });

  it('restricts Operations to post-confirmation statuses by default', () => {
    const filters = parseProjectsListFilters({});
    const built = buildProjectsWhere(filters, opsUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where.projectStatus).toEqual({
      in: [
        ProjectStatus.CONFIRMED,
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ],
    });
  });

  it('intersects Operations status filter with allowed statuses', () => {
    const filters = parseProjectsListFilters({ status: [ProjectStatus.PROPOSAL, ProjectStatus.CONFIRMED] });
    const built = buildProjectsWhere(filters, opsUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where.projectStatus).toEqual({ in: [ProjectStatus.CONFIRMED] });
  });

  it('applies customerType on nested customer relation', () => {
    const filters = parseProjectsListFilters({ customerType: 'COMMERCIAL' });
    const built = buildProjectsWhere(filters, adminUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where).toMatchObject({
      AND: [{ customer: { customerType: { in: ['COMMERCIAL'] } } }],
    });
  });

  it('treats null customerType as Residential when filtering RESIDENTIAL (chart parity)', () => {
    const filters = parseProjectsListFilters({
      customerType: 'RESIDENTIAL',
      zenithSlice: 'revenue',
    });
    const built = buildProjectsWhere(filters, adminUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const and = (built.where as { AND?: object[] }).AND ?? [];
    expect(and).toEqual(
      expect.arrayContaining([
        {
          OR: [{ customer: { customerType: 'RESIDENTIAL' } }, { customer: { customerType: null } }],
        },
      ]),
    );
    expect(JSON.stringify(and)).toContain('projectCost');
    expect(JSON.stringify(and)).toContain('CONFIRMED');
  });

  it('applies type and projectServiceType filters for Admin', () => {
    const filters = parseProjectsListFilters({
      type: ProjectType.NON_SUBSIDY,
      projectServiceType: 'MAINTENANCE',
    });
    const built = buildProjectsWhere(filters, adminUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where.type).toEqual({ in: [ProjectType.NON_SUBSIDY] });
    expect(built.where.projectServiceType).toEqual({ in: ['MAINTENANCE'] });
  });

  it('adds search OR across customer fields', () => {
    const filters = parseProjectsListFilters({ search: 'rayenna' });
    const built = buildProjectsWhere(filters, adminUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const and = (built.where as { AND?: object[] }).AND ?? [];
    expect(and).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { customer: { customerName: { contains: 'rayenna', mode: 'insensitive' } } },
            { customer: { customerId: { contains: 'rayenna', mode: 'insensitive' } } },
            { customer: { consumerNumber: { contains: 'rayenna', mode: 'insensitive' } } },
          ],
        },
      ]),
    );
  });

  it('applies FY filter on year field', () => {
    const filters = parseProjectsListFilters({ fy: '2024-25' });
    const built = buildProjectsWhere(filters, adminUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where.year).toEqual({ in: ['2024-25'] });
  });

  it('skips date filters when skipDateFilters is true', () => {
    const filters = parseProjectsListFilters({ fy: '2024-25', quarter: 'Q1' });
    const built = buildProjectsWhere(filters, adminUser, { skipDateFilters: true });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where.year).toBeUndefined();
    const and = (built.where as { AND?: object[] }).AND;
    const hasQuarterClause = Array.isArray(and) && and.some((c) => 'OR' in (c as object));
    expect(hasQuarterClause).toBe(false);
  });

  it('returns 403 when Finance uses peBucket filter', () => {
    const filters = parseProjectsListFilters({ peBucket: 'proposal-ready' });
    const built = buildProjectsWhere(filters, financeUser);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.status).toBe(403);
    expect(built.error).toContain('peBucket');
  });

  it('allows Admin peBucket filter and merges PE clause', () => {
    const filters = parseProjectsListFilters({ peBucket: 'not-started' });
    const built = buildProjectsWhere(filters, adminUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const and = (built.where as { AND?: object[] }).AND ?? [];
    expect(and.length).toBeGreaterThan(0);
    expect(JSON.stringify(and)).toContain('peCostingSheets');
  });

  it('does not let Sales override salespersonId via query', () => {
    const filters = parseProjectsListFilters({ salespersonId: 'other-sales' });
    const built = buildProjectsWhere(filters, salesUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.where.salespersonId).toBe('sales-1');
  });

  it('filters late-stage projects with missing lifecycle brands', () => {
    const filters = parseProjectsListFilters({ lifecycleSpecsIncomplete: 'true' });
    const built = buildProjectsWhere(filters, adminUser);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const json = JSON.stringify(built.where);
    expect(json).toContain('UNDER_INSTALLATION');
    expect(json).toContain('panelBrand');
    expect(json).toContain('inverterBrand');
  });
});

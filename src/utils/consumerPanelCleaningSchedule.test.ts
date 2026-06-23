import { describe, expect, it } from 'vitest';
import {
  addMonths,
  computePanelCleaningSchedule,
  panelCleaningVisitDueDates,
  startOfDay,
} from './consumerPanelCleaningSchedule';

describe('panelCleaningVisitDueDates', () => {
  it('generates 10 visits over 5 years every 6 months from anchor', () => {
    const anchor = new Date('2026-01-01');
    const dates = panelCleaningVisitDueDates(anchor);
    expect(dates).toHaveLength(10);
    expect(dates[0]).toEqual(startOfDay(new Date('2026-07-01')));
    expect(dates[1]).toEqual(startOfDay(new Date('2027-01-01')));
    expect(dates[9]).toEqual(startOfDay(new Date('2031-01-01')));
  });
});

describe('computePanelCleaningSchedule', () => {
  const anchor = new Date('2026-01-01');

  it('waits for net meter date', () => {
    const result = computePanelCleaningSchedule({
      netMeterInstalledAt: null,
      today: new Date('2026-03-01'),
    });
    expect(result.awaitingNetMeterDate).toBe(true);
    expect(result.dueDate).toBeNull();
    expect(result.statusLabel).toContain('Awaiting net meter');
  });

  it('first cleaning due 6 months after net meter install', () => {
    const result = computePanelCleaningSchedule({
      netMeterInstalledAt: anchor,
      today: new Date('2026-02-15'),
    });
    expect(result.dbStatus).toBe('DUE');
    expect(result.dueDate).toEqual(startOfDay(new Date('2026-07-01')));
    expect(result.statusLabel).toMatch(/Due (in \d+ days|1 Jul 2026)/);
  });

  it('marks overdue when a visit date passed before the next slot', () => {
    const result = computePanelCleaningSchedule({
      netMeterInstalledAt: anchor,
      today: new Date('2026-08-15'),
    });
    expect(result.dbStatus).toBe('OVERDUE');
    expect(result.dueDate).toEqual(startOfDay(new Date('2026-07-01')));
  });

  it('shows next slot when overdue window has passed', () => {
    const result = computePanelCleaningSchedule({
      netMeterInstalledAt: anchor,
      today: new Date('2027-01-15'),
    });
    expect(result.dbStatus).toBe('OVERDUE');
    expect(result.dueDate).toEqual(startOfDay(new Date('2027-01-01')));
  });

  it('ends service after 5 years from net meter', () => {
    const result = computePanelCleaningSchedule({
      netMeterInstalledAt: anchor,
      today: new Date('2031-02-01'),
    });
    expect(result.serviceEnded).toBe(true);
    expect(result.dbStatus).toBe('COMPLETED');
    expect(result.dueDate).toBeNull();
  });

  it('handles month-end anchor without drifting', () => {
    const jan31 = new Date('2026-01-31');
    const firstDue = addMonths(startOfDay(jan31), 6);
    expect(firstDue.getMonth()).toBe(6); // July
  });
});

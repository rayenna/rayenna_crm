import { istMonthBoundsForFyMonth } from '../../utils/istCalendar';
import type { ZenithNlDateFilter } from './projectsHref';

const QUARTER_TO_MONTHS: Record<string, string[]> = {
  Q1: ['04', '05', '06'],
  Q2: ['07', '08', '09'],
  Q3: ['10', '11', '12'],
  Q4: ['01', '02', '03'],
};

function fyStartYear(fy: string): number | null {
  const m = fy.match(/^(\d{4})-(\d{2})$/);
  return m ? parseInt(m[1]!, 10) : null;
}

function fyInclusiveBounds(fy: string): { start: Date; end: Date } | null {
  const startYear = fyStartYear(fy);
  if (startYear == null) return null;
  return {
    start: istMonthBoundsForFyMonth(startYear, 4).start,
    end: istMonthBoundsForFyMonth(startYear, 3).end,
  };
}

/**
 * Map Zenith FY / Quarter / Month filters onto SupportTicket.createdAt windows (IST).
 * Empty filters → no createdAt constraint (all time).
 */
export function supportTicketCreatedAtWhere(
  dateFilter: ZenithNlDateFilter,
): { createdAt: { gte?: Date; lte?: Date } } | { OR: { createdAt: { gte: Date; lte: Date } }[] } | Record<string, never> {
  const fys = dateFilter.selectedFYs.filter(Boolean);
  if (fys.length === 0) return {};

  if (fys.length === 1) {
    const fy = fys[0]!;
    const startYear = fyStartYear(fy);
    if (startYear == null) return {};

    let months: string[] = [];
    if (dateFilter.selectedQuarters.length > 0) {
      const set = new Set<string>();
      for (const q of dateFilter.selectedQuarters) {
        (QUARTER_TO_MONTHS[q] || []).forEach((m) => set.add(m));
      }
      months =
        dateFilter.selectedMonths.length > 0
          ? dateFilter.selectedMonths.filter((m) => set.has(m))
          : Array.from(set);
    } else {
      months = [...dateFilter.selectedMonths];
    }

    if (months.length === 0) {
      const bounds = fyInclusiveBounds(fy);
      if (!bounds) return {};
      return { createdAt: { gte: bounds.start, lte: bounds.end } };
    }

    const windows = months.map((m) => {
      const { start, end } = istMonthBoundsForFyMonth(startYear, parseInt(m, 10));
      return { createdAt: { gte: start, lte: end } };
    });
    return windows.length === 1 ? windows[0]! : { OR: windows };
  }

  const windows = fys
    .map((fy) => fyInclusiveBounds(fy))
    .filter((b): b is { start: Date; end: Date } => Boolean(b))
    .map((b) => ({ createdAt: { gte: b.start, lte: b.end } }));
  if (windows.length === 0) return {};
  return windows.length === 1 ? windows[0]! : { OR: windows };
}

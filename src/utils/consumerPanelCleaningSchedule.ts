/**
 * Panel cleaning included in EPC service: twice per year for 5 years from net meter installation.
 * Anchor = CRM Project.subsidyRequestDate (Net Meter Installation Date).
 */

export const PANEL_CLEANING_INTERVAL_MONTHS = 6;
export const PANEL_CLEANING_SERVICE_YEARS = 5;
export const PANEL_CLEANING_VISITS_PER_YEAR = 2;
export const PANEL_CLEANING_TASK_KEY = 'panel_cleaning';

export type PanelCleaningDbStatus = 'DUE' | 'OVERDUE' | 'COMPLETED';

export type PanelCleaningScheduleState = {
  dueDate: Date | null;
  dbStatus: PanelCleaningDbStatus;
  statusLabel: string;
  planNote: string;
  serviceEnded: boolean;
  awaitingNetMeterDate: boolean;
};

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return startOfDay(d);
}

export function addYears(from: Date, years: number): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return startOfDay(d);
}

export function panelCleaningVisitDueDates(netMeterInstalledAt: Date): Date[] {
  const anchor = startOfDay(netMeterInstalledAt);
  const serviceEnd = addYears(anchor, PANEL_CLEANING_SERVICE_YEARS);
  const maxVisits = PANEL_CLEANING_SERVICE_YEARS * PANEL_CLEANING_VISITS_PER_YEAR;
  const dates: Date[] = [];

  for (let n = 1; n <= maxVisits; n++) {
    const due = addMonths(anchor, n * PANEL_CLEANING_INTERVAL_MONTHS);
    if (due <= serviceEnd) dates.push(due);
  }

  return dates;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatStatusLabel(
  dbStatus: PanelCleaningDbStatus,
  dueDate: Date | null,
  today: Date,
): string {
  if (!dueDate) return 'Scheduled';

  const due = startOfDay(dueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (dbStatus === 'OVERDUE') {
    return `Overdue — was due ${formatShortDate(due)}`;
  }
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays > 1 && diffDays <= 60) return `Due in ${diffDays} days`;
  return `Due ${formatShortDate(due)}`;
}

export function computePanelCleaningSchedule(input: {
  netMeterInstalledAt: Date | null;
  today?: Date;
}): PanelCleaningScheduleState {
  const today = startOfDay(input.today ?? new Date());
  const planNote =
    'Included twice yearly for 5 years from net meter installation (Rayenna service plan)';

  if (!input.netMeterInstalledAt) {
    return {
      dueDate: null,
      dbStatus: 'DUE',
      statusLabel: 'Awaiting net meter installation date',
      planNote,
      serviceEnded: false,
      awaitingNetMeterDate: true,
    };
  }

  const anchor = startOfDay(input.netMeterInstalledAt);
  const serviceEnd = addYears(anchor, PANEL_CLEANING_SERVICE_YEARS);

  if (today > serviceEnd) {
    return {
      dueDate: null,
      dbStatus: 'COMPLETED',
      statusLabel: 'Included service completed (5 years)',
      planNote: 'Your complimentary panel cleaning plan has ended',
      serviceEnded: true,
      awaitingNetMeterDate: false,
    };
  }

  const visitDates = panelCleaningVisitDueDates(anchor);
  const pastDue = visitDates.filter((d) => d < today);
  const nextFuture = visitDates.find((d) => d >= today);

  if (pastDue.length > 0 && nextFuture && today > pastDue[pastDue.length - 1]!) {
    const missed = pastDue[pastDue.length - 1]!;
    if (today < nextFuture) {
      return {
        dueDate: missed,
        dbStatus: 'OVERDUE',
        statusLabel: formatStatusLabel('OVERDUE', missed, today),
        planNote,
        serviceEnded: false,
        awaitingNetMeterDate: false,
      };
    }
  }

  if (nextFuture) {
    return {
      dueDate: nextFuture,
      dbStatus: 'DUE',
      statusLabel: formatStatusLabel('DUE', nextFuture, today),
      planNote,
      serviceEnded: false,
      awaitingNetMeterDate: false,
    };
  }

  const lastVisit = visitDates[visitDates.length - 1] ?? null;
  if (lastVisit && lastVisit < today) {
    return {
      dueDate: lastVisit,
      dbStatus: 'OVERDUE',
      statusLabel: formatStatusLabel('OVERDUE', lastVisit, today),
      planNote,
      serviceEnded: false,
      awaitingNetMeterDate: false,
    };
  }

  return {
    dueDate: null,
    dbStatus: 'COMPLETED',
    statusLabel: 'No scheduled visits',
    planNote,
    serviceEnded: false,
    awaitingNetMeterDate: false,
  };
}

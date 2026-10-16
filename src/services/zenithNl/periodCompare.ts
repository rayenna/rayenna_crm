import type { ZenithNlDateFilter } from './projectsHref';
import type { ZenithNlIntent } from './catalog';
import { currentFyQuarterMonth, getPreviousFY } from './relativeDates';

export type PeriodCompareFocus = 'revenue' | 'margin' | 'profit' | 'all';

export type PeriodCompareParse = {
  primaryFy: string;
  priorFy: string;
  focus: PeriodCompareFocus;
  /** Eyebrow / effective-date phrase */
  phrase: string;
  primary: ZenithNlDateFilter;
  prior: ZenithNlDateFilter;
};

function normQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bprophet\b/g, 'profit'); // common speech/typo
}

/**
 * Detect YoY / this-FY-vs-last-FY comparison questions.
 * Must run before single-period relative date parsing so "this FY" is not collapsed alone.
 */
export function parsePeriodCompare(
  question: string,
  now: Date = new Date(),
): PeriodCompareParse | null {
  const q = normQuestion(question);
  if (!q || q.length < 6) return null;

  const yoy =
    /\b(year[\s-]?on[\s-]?year|year[\s-]?over[\s-]?year|\byoy\b)\b/.test(q) ||
    (/\bgrowth\b/.test(q) && /\b(year|fy|financial)\b/.test(q));

  const versusLast =
    /\b(versus|vs\.?|compared\s+to|compared\s+with|compare[d]?)\b/.test(q) &&
    /\b(last|previous|prior)(\s+(fy|financial\s+year))?\b/.test(q);

  const thisVsLast =
    /\b(this|current|present)\s+(fy|financial\s+year)\b/.test(q) &&
    /\b(versus|vs\.?|compared\s+to|compared\s+with)\b/.test(q) &&
    /\blast\b/.test(q);

  if (!yoy && !versusLast && !thisVsLast) return null;

  const cur = currentFyQuarterMonth(now);
  const priorFy = getPreviousFY(cur.fy);
  if (!priorFy) return null;

  const focus = detectFocus(q, yoy);

  return {
    primaryFy: cur.fy,
    priorFy,
    focus,
    phrase: `Comparing this FY (${cur.fy}) vs last FY (${priorFy})`,
    primary: {
      selectedFYs: [cur.fy],
      selectedQuarters: [],
      selectedMonths: [],
    },
    prior: {
      selectedFYs: [priorFy],
      selectedQuarters: [],
      selectedMonths: [],
    },
  };
}

function detectFocus(q: string, yoy: boolean): PeriodCompareFocus {
  if (/\b(margin|profitability)\b/.test(q)) return 'margin';
  if (/\b(gross\s+profit|net\s+profit)\b/.test(q)) return 'profit';
  if (/\bprofit\b/.test(q) && !/\bmargin\b/.test(q) && !/\brevenue\b/.test(q)) {
    return 'profit';
  }
  if (/\b(revenue|order\s+value|turnover|sales\s+value)\b/.test(q)) return 'revenue';
  if (yoy || /\bgrowth\b/.test(q)) return 'revenue';
  return 'all';
}

/** Intent for closed-catalog period_compare (skip Claude). */
export function periodCompareIntent(parse: PeriodCompareParse): ZenithNlIntent {
  return {
    metric: 'period_compare',
    viz: 'table',
    filters: { compareFocus: parse.focus },
    insightHints: `YoY ${parse.focus} ${parse.primaryFy} vs ${parse.priorFy}`,
  };
}

export function growthPct(current: number, prior: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return null;
  if (prior === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10;
}

export function formatGrowthPct(pct: number | null): string {
  if (pct === null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

export function formatDelta(current: number, prior: number, kind: 'inr' | 'pp' | 'count'): string {
  const d = current - prior;
  if (kind === 'pp') {
    const sign = d > 0 ? '+' : '';
    return `${sign}${Math.round(d * 10) / 10} pp`;
  }
  if (kind === 'count') {
    const sign = d > 0 ? '+' : '';
    return `${sign}${Math.round(d)}`;
  }
  const sign = d > 0 ? '+' : d < 0 ? '−' : '';
  const abs = Math.abs(Math.round(d));
  try {
    return `${sign}${new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(abs)}`;
  } catch {
    return `${sign}₹${abs.toLocaleString('en-IN')}`;
  }
}

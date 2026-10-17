import type { ZenithNlDateFilter } from './projectsHref';
import type { ZenithNlIntent } from './catalog';
import {
  currentFyQuarterMonth,
  getPreviousFY,
  previousQuarter,
} from './relativeDates';

export type PeriodCompareFocus = 'revenue' | 'margin' | 'profit' | 'all';
export type PeriodCompareMode = 'yoy' | 'qoq';

export type PeriodCompareParse = {
  mode: PeriodCompareMode;
  primaryFy: string;
  priorFy: string;
  /** Set for QoQ (and unused for full-FY YoY). */
  primaryQuarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  priorQuarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
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

function detectFocus(q: string, growthCompare: boolean): PeriodCompareFocus {
  if (/\b(margin|profitability)\b/.test(q)) return 'margin';
  if (/\b(gross\s+profit|net\s+profit)\b/.test(q)) return 'profit';
  if (/\bprofit\b/.test(q) && !/\bmargin\b/.test(q) && !/\brevenue\b/.test(q)) {
    return 'profit';
  }
  if (/\b(revenue|order\s+value|turnover|sales\s+value)\b/.test(q)) return 'revenue';
  if (growthCompare || /\bgrowth\b/.test(q)) return 'revenue';
  return 'all';
}

/**
 * Detect YoY / QoQ / this-vs-last comparison questions.
 * Must run before single-period relative date parsing so compare phrases are not collapsed alone.
 */
export function parsePeriodCompare(
  question: string,
  now: Date = new Date(),
): PeriodCompareParse | null {
  const q = normQuestion(question);
  if (!q || q.length < 6) return null;

  // Do not steal loan-vs-cash / panel-vs type mix questions.
  if (/\b(loan\s+vs\s+cash|cash\s+vs\s+loan|paid\s+vs\s+pending)\b/.test(q)) {
    return null;
  }

  const qoq =
    /\b(quarter[\s-]?on[\s-]?quarter|quarter[\s-]?over[\s-]?quarter|\bqoq\b)\b/.test(q) ||
    (/\bgrowth\b/.test(q) && /\bquarter\b/.test(q) && !/\b(year[\s-]?on|yoy|financial\s+year|\bfy\b)\b/.test(q));

  const thisVsLastQ =
    /\b(this|current|present)\s+quarter\b/.test(q) &&
    /\b(versus|vs\.?|compared\s+to|compared\s+with|compare[d]?)\b/.test(q) &&
    /\blast\b/.test(q);

  const versusLastQ =
    /\b(versus|vs\.?|compared\s+to|compared\s+with|compare[d]?)\b/.test(q) &&
    /\b(last|previous|prior)\s+quarter\b/.test(q);

  const cur = currentFyQuarterMonth(now);

  if (qoq || thisVsLastQ || versusLastQ) {
    const prior = previousQuarter(cur.fy, cur.quarter);
    const focus = detectFocus(q, true);
    return {
      mode: 'qoq',
      primaryFy: cur.fy,
      priorFy: prior.fy,
      primaryQuarter: cur.quarter,
      priorQuarter: prior.quarter,
      focus,
      phrase: `Comparing this quarter (${cur.fy} ${cur.quarter}) vs last quarter (${prior.fy} ${prior.quarter})`,
      primary: {
        selectedFYs: [cur.fy],
        selectedQuarters: [cur.quarter],
        selectedMonths: [],
      },
      prior: {
        selectedFYs: [prior.fy],
        selectedQuarters: [prior.quarter],
        selectedMonths: [],
      },
    };
  }

  const yoy =
    /\b(year[\s-]?on[\s-]?year|year[\s-]?over[\s-]?year|\byoy\b)\b/.test(q) ||
    (/\bgrowth\b/.test(q) && /\b(year|fy|financial)\b/.test(q) && !/\bquarter\b/.test(q));

  const versusLastFy =
    /\b(versus|vs\.?|compared\s+to|compared\s+with|compare[d]?)\b/.test(q) &&
    /\b(last|previous|prior)\s+(fy|financial\s+year|year)\b/.test(q) &&
    !/\bquarter\b/.test(q);

  const thisVsLastFy =
    /\b(this|current|present)\s+(fy|financial\s+year)\b/.test(q) &&
    /\b(versus|vs\.?|compared\s+to|compared\s+with)\b/.test(q) &&
    /\blast\b/.test(q);

  if (!yoy && !versusLastFy && !thisVsLastFy) return null;

  const priorFy = getPreviousFY(cur.fy);
  if (!priorFy) return null;

  const focus = detectFocus(q, yoy);

  return {
    mode: 'yoy',
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

/** Intent for closed-catalog period_compare (skip Claude). */
export function periodCompareIntent(parse: PeriodCompareParse): ZenithNlIntent {
  const label =
    parse.mode === 'qoq'
      ? `QoQ ${parse.focus} ${parse.primaryFy} ${parse.primaryQuarter} vs ${parse.priorFy} ${parse.priorQuarter}`
      : `YoY ${parse.focus} ${parse.primaryFy} vs ${parse.priorFy}`;
  return {
    metric: 'period_compare',
    viz: 'table',
    filters: { compareFocus: parse.focus },
    insightHints: label,
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

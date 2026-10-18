import { calculateFYInIst, calendarYmdInTimeZone } from '../../utils/istCalendar';
import type { ZenithNlDateFilter } from './projectsHref';

export type ZenithRelativeDateParse = ZenithNlDateFilter & {
  /** Human phrase matched (e.g. "last FY"). */
  phrase: string;
  source: 'question';
};

export function getPreviousFY(fy: string): string {
  const twoDigit = fy.match(/^(\d{4})-(\d{2})$/);
  if (twoDigit) {
    const start = parseInt(twoDigit[1]!, 10);
    const end = parseInt(twoDigit[2]!, 10);
    return `${start - 1}-${String(end - 1).padStart(2, '0')}`;
  }
  return '';
}

export function getNextFY(fy: string): string {
  const twoDigit = fy.match(/^(\d{4})-(\d{2})$/);
  if (twoDigit) {
    const start = parseInt(twoDigit[1]!, 10);
    const end = parseInt(twoDigit[2]!, 10);
    return `${start + 1}-${String(end + 1).padStart(2, '0')}`;
  }
  return '';
}

export function currentFyQuarterMonth(now: Date = new Date()): {
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  month: string;
} {
  const fy = calculateFYInIst(now) || '2025-26';
  const ymd = calendarYmdInTimeZone(now);
  const monthNum = parseInt(ymd.split('-')[1] || '4', 10);
  const month = String(monthNum).padStart(2, '0');
  let quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  if (monthNum >= 4 && monthNum <= 6) quarter = 'Q1';
  else if (monthNum >= 7 && monthNum <= 9) quarter = 'Q2';
  else if (monthNum >= 10 && monthNum <= 12) quarter = 'Q3';
  else quarter = 'Q4';
  return { fy, quarter, month };
}

export function previousQuarter(
  fy: string,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
): {
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
} {
  if (quarter === 'Q1') return { fy: getPreviousFY(fy) || fy, quarter: 'Q4' };
  if (quarter === 'Q2') return { fy, quarter: 'Q1' };
  if (quarter === 'Q3') return { fy, quarter: 'Q2' };
  return { fy, quarter: 'Q3' };
}

export function nextQuarter(
  fy: string,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
): {
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
} {
  if (quarter === 'Q4') return { fy: getNextFY(fy) || fy, quarter: 'Q1' };
  if (quarter === 'Q1') return { fy, quarter: 'Q2' };
  if (quarter === 'Q2') return { fy, quarter: 'Q3' };
  return { fy, quarter: 'Q4' };
}

/** Indian FY half: H1 = Q1+Q2 (Apr–Sep), H2 = Q3+Q4 (Oct–Mar). */
export type FyHalf = 'H1' | 'H2';

export function halfForQuarter(quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): FyHalf {
  return quarter === 'Q1' || quarter === 'Q2' ? 'H1' : 'H2';
}

export function quartersForHalf(half: FyHalf): Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> {
  return half === 'H1' ? ['Q1', 'Q2'] : ['Q3', 'Q4'];
}

export function previousHalf(
  fy: string,
  half: FyHalf,
): { fy: string; half: FyHalf } {
  if (half === 'H1') return { fy: getPreviousFY(fy) || fy, half: 'H2' };
  return { fy, half: 'H1' };
}

export function nextHalf(fy: string, half: FyHalf): { fy: string; half: FyHalf } {
  if (half === 'H2') return { fy: getNextFY(fy) || fy, half: 'H1' };
  return { fy, half: 'H2' };
}

function previousMonth(fy: string, month: string): { fy: string; month: string } {
  const m = parseInt(month, 10);
  if (m === 4) return { fy: getPreviousFY(fy) || fy, month: '03' };
  if (m === 1) return { fy, month: '12' };
  return { fy, month: String(m - 1).padStart(2, '0') };
}

function halfYearResult(
  fy: string,
  half: FyHalf,
  phrase: string,
): ZenithRelativeDateParse {
  return {
    selectedFYs: [fy],
    selectedQuarters: quartersForHalf(half),
    selectedMonths: [],
    phrase,
    source: 'question',
  };
}

/**
 * Parse relative / explicit FY·Q·M phrases from an Ask question.
 * When matched, these override the command-bar filters for that Ask only.
 */
export function parseZenithRelativeDates(
  question: string,
  now: Date = new Date(),
): ZenithRelativeDateParse | null {
  const q = question.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!q) return null;

  const cur = currentFyQuarterMonth(now);

  // Explicit FY label: "FY 2024-25" / "financial year 2023-24"
  const explicitFy = q.match(
    /\b(?:fy|financial year)\s*(20\d{2})\s*[-/–]\s*(\d{2}|\d{4})\b/i,
  );
  if (explicitFy) {
    const start = explicitFy[1]!;
    let end = explicitFy[2]!;
    if (end.length === 4) end = end.slice(-2);
    const fy = `${start}-${end}`;
    return {
      selectedFYs: [fy],
      selectedQuarters: [],
      selectedMonths: [],
      phrase: `FY ${fy}`,
      source: 'question',
    };
  }

  if (/\b(last|previous|prior)\s+(fy|financial year)\b/.test(q)) {
    const fy = getPreviousFY(cur.fy);
    if (!fy) return null;
    return {
      selectedFYs: [fy],
      selectedQuarters: [],
      selectedMonths: [],
      phrase: `last FY (${fy})`,
      source: 'question',
    };
  }

  if (/\b(this|current|present)\s+(fy|financial year)\b/.test(q)) {
    return {
      selectedFYs: [cur.fy],
      selectedQuarters: [],
      selectedMonths: [],
      phrase: `this FY (${cur.fy})`,
      source: 'question',
    };
  }

  // Half year = two Indian FY quarters (H1 Q1–Q2, H2 Q3–Q4). Before single-quarter phrases.
  const halfToken = q.match(/\b(?:in\s+)?(h[12]|1h|2h|first\s+half|second\s+half)\b/);
  const halfYearPhrase =
    /\b(half[\s-]?year|halfyear|semi[\s-]?annual|semiannual)\b/.test(q) ||
    Boolean(halfToken);

  if (halfYearPhrase) {
    const curHalf = halfForQuarter(cur.quarter);
    let fy = cur.fy;
    let half = curHalf;

    if (/\b(last|previous|prior)\s+(half[\s-]?year|halfyear)\b/.test(q)) {
      const prev = previousHalf(cur.fy, curHalf);
      fy = prev.fy;
      half = prev.half;
      return halfYearResult(fy, half, `last half year (${fy} ${half} · ${quartersForHalf(half).join('+')})`);
    }
    if (/\b(next|upcoming|coming)\s+(half[\s-]?year|halfyear)\b/.test(q)) {
      const nxt = nextHalf(cur.fy, curHalf);
      fy = nxt.fy;
      half = nxt.half;
      return halfYearResult(fy, half, `next half year (${fy} ${half} · ${quartersForHalf(half).join('+')})`);
    }
    if (/\b(this|current|present)\s+(half[\s-]?year|halfyear)\b/.test(q)) {
      return halfYearResult(
        cur.fy,
        curHalf,
        `this half year (${cur.fy} ${curHalf} · ${quartersForHalf(curHalf).join('+')})`,
      );
    }

    // Explicit H1 / H2 / first half / second half (optional this/last FY)
    if (halfToken) {
      const raw = halfToken[1]!.replace(/\s+/g, ' ');
      if (raw === 'h1' || raw === '1h' || raw === 'first half') half = 'H1';
      else half = 'H2';
      if (/\b(last|previous)\s+(fy|financial year)\b/.test(q)) {
        fy = getPreviousFY(cur.fy) || fy;
      }
      return halfYearResult(fy, half, `${fy} ${half} · ${quartersForHalf(half).join('+')}`);
    }

    // Bare "half year" / "semi-annual" → current half of this FY
    return halfYearResult(
      cur.fy,
      curHalf,
      `this half year (${cur.fy} ${curHalf} · ${quartersForHalf(curHalf).join('+')})`,
    );
  }

  if (/\b(last|previous|prior)\s+quarter\b/.test(q)) {
    const prev = previousQuarter(cur.fy, cur.quarter);
    return {
      selectedFYs: [prev.fy],
      selectedQuarters: [prev.quarter],
      selectedMonths: [],
      phrase: `last quarter (${prev.fy} ${prev.quarter})`,
      source: 'question',
    };
  }

  if (/\b(this|current|present)\s+quarter\b/.test(q)) {
    return {
      selectedFYs: [cur.fy],
      selectedQuarters: [cur.quarter],
      selectedMonths: [],
      phrase: `this quarter (${cur.fy} ${cur.quarter})`,
      source: 'question',
    };
  }

  if (/\b(next|upcoming|coming)\s+quarter\b/.test(q)) {
    const nxt = nextQuarter(cur.fy, cur.quarter);
    return {
      selectedFYs: [nxt.fy],
      selectedQuarters: [nxt.quarter],
      selectedMonths: [],
      phrase: `next quarter (${nxt.fy} ${nxt.quarter})`,
      source: 'question',
    };
  }

  // "Q2" / "in Q1" with optional this/last FY
  const qMatch = q.match(/\b(?:in\s+)?(q[1-4])\b/);
  if (qMatch) {
    const quarter = qMatch[1]!.toUpperCase() as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    let fy = cur.fy;
    let phrase = `${quarter}`;
    if (/\b(last|previous)\s+(fy|financial year)\b/.test(q)) {
      fy = getPreviousFY(cur.fy) || fy;
      phrase = `${fy} ${quarter}`;
    } else if (/\b(this|current)\s+(fy|financial year)\b/.test(q) || /\bthis\s+fy\b/.test(q)) {
      phrase = `${fy} ${quarter}`;
    } else {
      phrase = `${fy} ${quarter}`;
    }
    return {
      selectedFYs: [fy],
      selectedQuarters: [quarter],
      selectedMonths: [],
      phrase,
      source: 'question',
    };
  }

  if (/\b(last|previous|prior)\s+month\b/.test(q)) {
    const prev = previousMonth(cur.fy, cur.month);
    return {
      selectedFYs: [prev.fy],
      selectedQuarters: [],
      selectedMonths: [prev.month],
      phrase: `last month (${prev.fy} · ${prev.month})`,
      source: 'question',
    };
  }

  if (/\b(this|current|present)\s+month\b/.test(q)) {
    return {
      selectedFYs: [cur.fy],
      selectedQuarters: [],
      selectedMonths: [cur.month],
      phrase: `this month (${cur.fy} · ${cur.month})`,
      source: 'question',
    };
  }

  return null;
}

/** Merge question dates over command-bar dates when a relative phrase is present. */
export function resolveAskDateFilter(
  question: string,
  commandBar: ZenithNlDateFilter,
  now: Date = new Date(),
): {
  dateFilter: ZenithNlDateFilter;
  relative: ZenithRelativeDateParse | null;
} {
  const relative = parseZenithRelativeDates(question, now);
  if (!relative) {
    return { dateFilter: commandBar, relative: null };
  }
  return {
    dateFilter: {
      selectedFYs: relative.selectedFYs,
      selectedQuarters: relative.selectedQuarters,
      selectedMonths: relative.selectedMonths,
    },
    relative,
  };
}

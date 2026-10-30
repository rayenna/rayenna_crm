/**
 * Ask Zenith — answer from weekly Reports packs (same build* math as /api/reports).
 */
import { UserRole } from '@prisma/client';
import { metricAllowedForRole, type ZenithNlIntent, type ZenithNlMetric, type ZenithNlViz } from './catalog';
import { projectsHrefForAskProjectIds } from './projectsHref';
import {
  loadCollectionsCashPack,
  loadDeliveryControlPack,
  loadFunnelVelocityPack,
  loadMarginMixPack,
  loadSalesReviewPack,
} from '../../utils/reportPackLoad';
import type { FunnelDeal } from '../../utils/funnelVelocity';
import type { DeliveryJob, SubsidyClockJob } from '../../utils/deliveryControl';
import type { CollectionsRow } from '../../utils/collectionsCash';
import type { MarginJob } from '../../utils/marginMix';

const TABLE_CAP = 20;

const PACK_HREF = {
  sales_review: '/reports/sales-review',
  funnel_velocity: '/reports/funnel-velocity',
  delivery_control: '/reports/delivery-control',
  collections_cash: '/reports/collections-cash',
  margin_mix: '/reports/margin-mix',
} as const;

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function money(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 10) / 10}%`;
}

/** Exact pack name / open / go to — leave those to navigation actions. */
export function isReportNavigateCommand(question: string): boolean {
  const q = norm(question).replace(/^(please\s+)?/, '');
  const stripped = q.replace(/^(go\s+to|open|show(\s+me)?(\s+the)?)\s+/, '').trim();
  return (
    /^(sales\s+review|funnel\s+velocity|delivery\s+control|collections(\s*(&|and)\s*cash)?|margin\s*(&|and)?\s*mix|reports)$/.test(
      stripped,
    )
  );
}

function definitionalHelp(q: string): boolean {
  if (/^what\s+(is|are)\s+(a\s+|the\s+)?(meaning of\s+)?/.test(q) && !/\b(my|our)\b/.test(q)) {
    return true;
  }
  if (/\bhow\s+(do|does|can|should)\s+(i|we|you)\b/.test(q)) return true;
  if (/\bwhere\s+(is|are|do|can)\b/.test(q)) return true;
  return false;
}

function intentFor(
  metric: ZenithNlMetric,
  slice: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole(metric, role)) return null;
  return {
    metric,
    viz: 'table',
    filters: { detailSlice: slice },
    insightHints: `reports ${metric} ${slice}`,
  };
}

/**
 * Map a question onto a Reports pack section. Null = not a report-data ask
 * (navigation, Help how-to, or another metric).
 */
export function matchReportAskIntent(question: string, role: UserRole): ZenithNlIntent | null {
  const q = norm(question);
  if (!q || q.length < 4) return null;
  if (isReportNavigateCommand(q)) return null;
  if (definitionalHelp(q)) return null;

  const salesPack = /\bsales\s+review\b/.test(q);
  const funnelPack = /\bfunnel\s+velocity\b/.test(q);
  const deliveryPack = /\bdelivery\s+control\b/.test(q) || /\bops\s+(standup|board|pack)\b/.test(q);
  const collectionsPack =
    /\bcollections(\s*(&|and)\s*cash)?\b/.test(q) || /\bcash\s+(report|pack)\b/.test(q);
  const marginPack =
    /\bmargin\s*(&|and)?\s*mix\b/.test(q) || /\bgross\s+profit\s+(report|pack|mix)\b/.test(q);

  if (salesPack) {
    if (/\bachievement|ytd|closed\s+revenue|deals\s+won\b/.test(q)) {
      return intentFor('sales_review', 'achievement', role);
    }
    if (/\bforecast|weighted\s+pipeline|next\s+quarter|unscheduled\b/.test(q)) {
      return intentFor('sales_review', 'forecast', role);
    }
    if (/\bdeal\s+list|open\s+deals|closed\s+deals|past[- ]due\b/.test(q)) {
      return intentFor('sales_review', 'deals', role);
    }
    return intentFor('sales_review', 'summary', role);
  }

  if (
    funnelPack ||
    /\b(sla\s+red|sla\s+amber|stuck\s+deals?|stage\s+ag(e)?ing|pipeline\s+hygiene|median\s+days\s+in\s+(the\s+)?(current\s+)?stage)\b/.test(
      q,
    )
  ) {
    if (!metricAllowedForRole('funnel_velocity', role)) {
      /* Ops/Finance asking SLA red without funnel access — fall through. */
    } else {
      if (/\bsla\s+red\b|\bred\s+(sla|band)\b/.test(q) && !/\bamber\b/.test(q)) {
        return intentFor('funnel_velocity', 'sla_red', role);
      }
      if (/\bsla\s+amber\b|\bamber\s+(sla|band)\b/.test(q) && !/\bred\b/.test(q)) {
        return intentFor('funnel_velocity', 'sla_amber', role);
      }
      if (/\b(sla|stuck|red|amber|aging|ageing)\b/.test(q)) {
        return intentFor('funnel_velocity', 'sla', role);
      }
      if (/\b(win\s+rate|conversion|days\s+to\s+confirm)\b/.test(q)) {
        return intentFor('funnel_velocity', 'conversion', role);
      }
      if (/\bdeals?\b/.test(q) && !funnelPack) {
        return intentFor('funnel_velocity', 'sla', role);
      }
      return intentFor('funnel_velocity', funnelPack ? 'summary' : 'sla', role);
    }
  }

  if (deliveryPack || /\bsubsidy\s+clock\b/.test(q) || /\bcommissioning\s+board\b/.test(q)) {
    if (/\bsubsidy\s+clock|awaiting\s+credit|90\+?\s*days\s+in\s+step\b/.test(q)) {
      return intentFor('delivery_control', 'subsidy_clock', role);
    }
    if (/\bblocker|overdue\s+commission|unassigned\s+ops\b/.test(q)) {
      return intentFor('delivery_control', 'blockers', role);
    }
    if (deliveryPack || /\bsubsidy\s+clock\b/.test(q)) {
      return intentFor('delivery_control', deliveryPack ? 'summary' : 'subsidy_clock', role);
    }
  }

  if (
    collectionsPack ||
    /\b(loan[- ]stuck|confirmed\s+outstanding|collections\s+aging|advance\s+due)\b/.test(q)
  ) {
    if (/\b(90\+|aging|ageing)\b/.test(q)) return intentFor('collections_cash', 'aging', role);
    if (/\bloan\b/.test(q)) return intentFor('collections_cash', 'loan', role);
    if (/\boutstanding|advance\s+due\b/.test(q)) {
      return intentFor('collections_cash', 'outstanding', role);
    }
    if (collectionsPack) return intentFor('collections_cash', 'summary', role);
  }

  if (
    marginPack ||
    /\b(thin\s+margin|missing\s+cost|pe\s+vs\s+crm|margin\s+band)\b/.test(q)
  ) {
    if (/\bmissing\s+cost\b/.test(q)) return intentFor('margin_mix', 'missing_cost', role);
    if (/\bthin|loss\s+jobs?\b/.test(q)) return intentFor('margin_mix', 'thin', role);
    if (/\b(by\s+(seller|segment|system|kW)|seller\s+mix|segment\s+mix)\b/.test(q)) {
      return intentFor('margin_mix', 'mix', role);
    }
    if (marginPack || /\bthin\s+margin|missing\s+cost\b/.test(q)) {
      return intentFor('margin_mix', marginPack ? 'summary' : 'thin', role);
    }
  }

  return null;
}

function kpiRows(entries: Array<[string, string | number]>): ZenithNlViz {
  return {
    kind: 'table',
    title: 'KPIs',
    columns: [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' },
    ],
    rows: entries.map(([metric, value]) => ({ metric, value })),
  };
}

function dealHref(id: string): string {
  return `/projects/${id}`;
}

export async function execReportPack(
  intent: ZenithNlIntent,
  ctx: {
    userId: string;
    role: UserRole;
    salespersonId?: string;
    opsId?: string;
    fy?: string;
    quarter?: string;
  },
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const metric = intent.metric;
  const slice = intent.filters?.detailSlice || 'summary';
  const scope = {
    role: ctx.role,
    userId: ctx.userId,
    salespersonId: ctx.salespersonId || '',
    opsPersonId: ctx.opsId || '',
    fy: ctx.fy || '',
    quarter: ctx.quarter || '',
    exportedBy: 'ask-zenith',
  };

  if (metric === 'sales_review') {
    const { payload, sellerLabel } = await loadSalesReviewPack(scope);
    const k = payload.kpis;
    const pack = PACK_HREF.sales_review;
    const ytd = payload.achievement.columns.find((c) => c.ytd)?.label || payload.currentFy;
    if (slice === 'achievement') {
      const cols = payload.achievement.columns;
      return {
        insight: `Sales Review achievement (${sellerLabel}). ${ytd} closed ${money(k.closedYtdRevenue)} across ${k.closedYtdDeals} deals — same numbers as Reports → Sales Review.`,
        viz: {
          kind: 'table',
          title: `Achievement · ${sellerLabel}`,
          columns: [
            { key: 'metric', label: 'Metric' },
            ...cols.map((c, i) => ({ key: `c${i}`, label: c.label })),
          ],
          rows: payload.achievement.rows.map((row) => {
            const rec: Record<string, string | number | null> = { metric: row.label };
            row.values.forEach((v, i) => {
              rec[`c${i}`] = row.key === 'avgProfitability' || row.key === 'yoy' ? pct(v) : v == null ? '—' : money(v);
            });
            return rec;
          }),
        },
        projectsHref: pack,
      };
    }
    if (slice === 'forecast') {
      const cols = payload.forecast.columns;
      return {
        insight: `Sales Review forecast (${sellerLabel}): open pipeline ${money(k.openPipeline)} weighted ${money(k.openWeighted)}. Unscheduled ${money(payload.forecast.unscheduledPipeline)}. Same board as Reports → Sales Review.`,
        viz: {
          kind: 'table',
          title: `Forecast · ${sellerLabel}`,
          columns: [
            { key: 'metric', label: 'Metric' },
            ...cols.map((c, i) => ({ key: `c${i}`, label: c.shortLabel })),
            { key: 'total', label: 'TOTAL' },
          ],
          rows: payload.forecast.rows.map((row) => {
            const rec: Record<string, string | number | null> = { metric: row.label };
            row.values.forEach((v, i) => {
              rec[`c${i}`] = row.key === 'yoy' || row.key === 'qoq' ? pct(v) : v == null ? '—' : money(v);
            });
            rec.total =
              row.total == null
                ? '—'
                : row.key === 'yoy' || row.key === 'qoq'
                  ? pct(row.total)
                  : money(row.total);
            return rec;
          }),
        },
        projectsHref: pack,
      };
    }
    if (slice === 'deals') {
      const deals = payload.deals.slice(0, TABLE_CAP);
      return {
        insight: `${k.openDeals} open deals (${money(k.openPipeline)}) on Sales Review · ${sellerLabel}. Showing ${deals.length}. Tap a row for the project.`,
        viz: dealTable(
          'Sales Review · deals',
          deals.map((d) => ({
            id: d.id,
            slNo: d.slNo,
            customer: d.customerName,
            stage: d.stage,
            extra: d.forecastBucket,
            value: d.orderValue,
          })),
        ),
        projectsHref: hrefIds(deals) || pack,
      };
    }
    return {
      insight: `Sales Review (${sellerLabel}, FY ${payload.currentFy}): YTD closed ${money(k.closedYtdRevenue)} · ${k.closedYtdDeals} deals · open pipeline ${money(k.openPipeline)} (${k.openDeals} deals). Same pack as Reports → Sales Review.`,
      viz: kpiRows([
        ['Closed YTD revenue', money(k.closedYtdRevenue)],
        ['Closed YTD deals', k.closedYtdDeals],
        ['Open pipeline', money(k.openPipeline)],
        ['Open weighted', money(k.openWeighted)],
        ['Past due deals', k.pastDueDeals],
        ['Unscheduled deals', k.unscheduledDeals],
      ]),
      projectsHref: pack,
    };
  }

  if (metric === 'funnel_velocity') {
    const { payload, sellerLabel } = await loadFunnelVelocityPack(scope);
    const k = payload.kpis;
    const pack = PACK_HREF.funnel_velocity;
    const slaDeals = payload.deals.filter((d) => d.slaBand === 'RED' || d.slaBand === 'AMBER');
    if (slice === 'sla' || slice === 'sla_red' || slice === 'sla_amber') {
      const pool =
        slice === 'sla_red'
          ? payload.deals.filter((d) => d.slaBand === 'RED')
          : slice === 'sla_amber'
            ? payload.deals.filter((d) => d.slaBand === 'AMBER')
            : slaDeals;
      const show = (pool.length ? pool : slaDeals.length ? slaDeals : payload.deals).slice(0, TABLE_CAP);
      const bandNote =
        slice === 'sla_red'
          ? `${k.slaRed} red of ${k.openDeals} Lead–Proposal deals`
          : slice === 'sla_amber'
            ? `${k.slaAmber} amber of ${k.openDeals} Lead–Proposal deals`
            : `${k.slaRed} red / ${k.slaAmber} amber of ${k.openDeals} Lead–Proposal deals`;
      return {
        insight: `Funnel Velocity SLA (${sellerLabel}): ${bandNote}. Median days in stage ${k.medianDays ?? '—'}. Same SLA as Reports → Funnel Velocity (Lead 7 / Survey 14 / Proposal 21).`,
        viz: dealTable(
          'Funnel Velocity · SLA',
          show.map((d) => ({
            id: d.id,
            slNo: d.slNo,
            customer: d.customerName,
            stage: d.stage,
            extra: `${d.slaLabel}${d.daysInStage != null ? ` · ${d.daysInStage}d` : ''}`,
            value: d.orderValue,
          })),
        ),
        projectsHref: hrefIds(show) || pack,
      };
    }
    if (slice === 'conversion') {
      return {
        insight: `Funnel Velocity conversion (${sellerLabel}, FY ${payload.currentFy}): win rate ${pct(k.winRate)} — ${k.confirmedYtdDeals} confirmed vs ${k.lostYtdDeals} lost. Median days to confirm ${k.medianDaysToConfirm ?? '—'} / to lose ${k.medianDaysToLose ?? '—'}.`,
        viz: kpiRows([
          ['Win rate (FY)', pct(k.winRate)],
          ['Confirmed YTD', `${k.confirmedYtdDeals} · ${money(k.confirmedYtdValue)}`],
          ['Lost YTD', `${k.lostYtdDeals} · ${money(k.lostYtdValue)}`],
          ['Median days to confirm', k.medianDaysToConfirm ?? '—'],
          ['Median days to lose', k.medianDaysToLose ?? '—'],
        ]),
        projectsHref: pack,
      };
    }
    if (slice === 'deals') {
      const deals = payload.deals.slice(0, TABLE_CAP);
      return {
        insight: `${k.openDeals} open funnel deals (${money(k.openPipeline)}) · ${sellerLabel}.`,
        viz: funnelDealViz(deals),
        projectsHref: hrefIds(deals) || pack,
      };
    }
    return {
      insight: `Funnel Velocity (${sellerLabel}): ${k.openDeals} open deals ${money(k.openPipeline)}, median ${k.medianDays ?? '—'} days in stage, ${k.slaRed} SLA red. Same numbers as Reports → Funnel Velocity.`,
      viz: kpiRows([
        ['Open pipeline', money(k.openPipeline)],
        ['Open deals', k.openDeals],
        ['Median days in stage', k.medianDays ?? '—'],
        ['SLA red', k.slaRed],
        ['SLA amber', k.slaAmber],
        ['Win rate (FY)', pct(k.winRate)],
      ]),
      projectsHref: pack,
    };
  }

  if (metric === 'delivery_control') {
    const { payload, opsLabel } = await loadDeliveryControlPack(scope);
    const k = payload.kpis;
    const pack = PACK_HREF.delivery_control;
    const clock = payload.subsidyClock;
    if (slice === 'blockers') {
      const blocked = payload.jobs.filter((j) => j.blockers.length > 0).slice(0, TABLE_CAP);
      return {
        insight: `Delivery Control blockers (${opsLabel}): ${k.blockedJobs} blocked / ${k.overdueJobs} overdue commissioning of ${k.inDeliveryJobs} in-delivery jobs. Same exceptions as Reports → Delivery Control.`,
        viz: dealTable(
          'Delivery Control · blockers',
          blocked.map((j) => ({
            id: j.id,
            slNo: j.slNo,
            customer: j.customerName,
            stage: j.stage,
            extra: j.blockerLabels.join(', ') || '—',
            value: j.orderValue,
          })),
        ),
        projectsHref: hrefIds(blocked) || pack,
      };
    }
    if (slice === 'subsidy_clock') {
      const jobs = clock.jobs.slice(0, TABLE_CAP);
      const ck = clock.kpis;
      return {
        insight: `Subsidy Clock (${opsLabel}): ${ck.onClockJobs} jobs ${money(ck.onClockValue)} still on a subsidy step · ${ck.awaitingCreditJobs} awaiting credit · ${ck.stale90Jobs} at 90+ days in step. Same clock as Reports → Delivery Control.`,
        viz: dealTable(
          'Subsidy clock',
          jobs.map((j: SubsidyClockJob) => ({
            id: j.id,
            slNo: j.slNo,
            customer: j.customerName,
            stage: j.stepLabel,
            extra: j.daysInStep != null ? `${j.daysInStep}d` : '—',
            value: j.orderValue,
          })),
        ),
        projectsHref: hrefIds(jobs) || pack,
      };
    }
    if (slice === 'jobs') {
      const jobs = payload.jobs.slice(0, TABLE_CAP);
      return {
        insight: `${k.inDeliveryJobs} in-delivery jobs (${money(k.inDeliveryValue)}) · ${opsLabel}.`,
        viz: deliveryJobViz(jobs),
        projectsHref: hrefIds(jobs) || pack,
      };
    }
    return {
      insight: `Delivery Control (${opsLabel}): ${k.inDeliveryJobs} jobs ${money(k.inDeliveryValue)} in delivery · ${k.overdueJobs} overdue · ${k.blockedJobs} blocked. Subsidy clock: ${clock.kpis.onClockJobs} still waiting. Same pack as Reports → Delivery Control.`,
      viz: kpiRows([
        ['In delivery', `${k.inDeliveryJobs} · ${money(k.inDeliveryValue)}`],
        ['Capacity (kW)', k.inDeliveryKw],
        ['Overdue commissioning', k.overdueJobs],
        ['No date', k.unscheduledJobs],
        ['Blocked', k.blockedJobs],
        ['Subsidy clock', clock.kpis.onClockJobs],
      ]),
      projectsHref: pack,
    };
  }

  if (metric === 'collections_cash') {
    const { payload, sellerLabel } = await loadCollectionsCashPack(scope);
    const k = payload.kpis;
    const pack = PACK_HREF.collections_cash;
    if (slice === 'aging') {
      const cols = payload.aging.columns;
      return {
        insight: `Collections aging (${sellerLabel}): ${money(k.outstanding)} outstanding on confirmed jobs · ${k.aging90Jobs} at 90+ days (${money(k.aging90)}). Pipeline (Lead/Survey/Proposal) is not on this pack.`,
        viz: {
          kind: 'table',
          title: `Aging · ${sellerLabel}`,
          columns: [
            { key: 'metric', label: 'Metric' },
            ...cols.map((c, i) => ({ key: `c${i}`, label: c.label })),
          ],
          rows: payload.aging.rows.map((row) => {
            const rec: Record<string, string | number> = { metric: row.label };
            row.values.forEach((v, i) => {
              rec[`c${i}`] = row.key === 'balance' ? money(v) : v;
            });
            return rec;
          }),
        },
        projectsHref: pack,
      };
    }
    if (slice === 'loan') {
      const rows = payload.rows.filter((r) => r.availingLoan && r.balance > 0).slice(0, TABLE_CAP);
      return {
        insight: `Loan-stuck collections (${sellerLabel}): ${k.loanJobs} jobs ${money(k.loanOutstanding)} outstanding on availing-loan confirmed orders.`,
        viz: collectionsViz(rows),
        projectsHref: hrefIds(rows) || pack,
      };
    }
    if (slice === 'outstanding') {
      const rows = payload.rows.filter((r) => r.balance > 0).slice(0, TABLE_CAP);
      return {
        insight: `Confirmed outstanding (${sellerLabel}): ${money(k.outstanding)} across ${k.outstandingJobs} jobs · cash ${money(k.cashOutstanding)} · loan ${money(k.loanOutstanding)} · ${k.neverPaidJobs} with advance still due.`,
        viz: collectionsViz(rows),
        projectsHref: hrefIds(rows) || pack,
      };
    }
    return {
      insight: `Collections & Cash (${sellerLabel}): ${money(k.outstanding)} outstanding on confirmed jobs (${k.outstandingJobs}) · 90+ ${money(k.aging90)} · subsidy in flight ${money(k.subsidyInFlightValue)}. Same pack as Reports → Collections & Cash.`,
      viz: kpiRows([
        ['Outstanding', money(k.outstanding)],
        ['Jobs', k.outstandingJobs],
        ['90+ days', `${k.aging90Jobs} · ${money(k.aging90)}`],
        ['Cash outstanding', money(k.cashOutstanding)],
        ['Loan stuck', money(k.loanOutstanding)],
        ['Subsidy in flight', money(k.subsidyInFlightValue)],
      ]),
      projectsHref: pack,
    };
  }

  if (metric === 'margin_mix') {
    const { payload, sellerLabel } = await loadMarginMixPack(scope);
    const k = payload.kpis;
    const pack = PACK_HREF.margin_mix;
    if (slice === 'missing_cost') {
      const jobs = payload.jobs.filter((j) => j.missingCost).slice(0, TABLE_CAP);
      return {
        insight: `Margin & Mix missing cost (${sellerLabel}, ${payload.periodLabel}): ${k.missingCostJobs} of ${k.jobs} won-book jobs have no cost — GP cannot be trusted until cost is entered.`,
        viz: marginJobViz(jobs),
        projectsHref: hrefIds(jobs) || pack,
      };
    }
    if (slice === 'thin') {
      const jobs = payload.jobs
        .filter((j) => j.flags.includes('thin') || j.flags.includes('loss'))
        .slice(0, TABLE_CAP);
      return {
        insight: `Margin & Mix thin / loss (${sellerLabel}, ${payload.periodLabel}): ${k.thinJobs} under 10% and ${k.lossJobs} at a loss of ${k.jobs} confirmed-and-beyond jobs.`,
        viz: marginJobViz(jobs),
        projectsHref: hrefIds(jobs) || pack,
      };
    }
    if (slice === 'mix') {
      return {
        insight: `Margin & Mix (${sellerLabel}, ${payload.periodLabel}): ${k.jobs} jobs ${money(k.revenue)} revenue, GP ${k.profit == null ? '—' : money(k.profit)} (${pct(k.profitPct)}). Mix by seller below — same pack as Reports → Margin & Mix.`,
        viz: {
          kind: 'table',
          title: `Seller mix · ${payload.periodLabel}`,
          columns: [
            { key: 'label', label: 'Seller' },
            { key: 'jobs', label: 'Jobs' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'profitPct', label: 'GP %' },
          ],
          rows: payload.sellerLoad.map((r) => ({
            label: r.label,
            jobs: r.jobs,
            revenue: money(r.revenue),
            profitPct: pct(r.profitPct),
          })),
        },
        projectsHref: pack,
      };
    }
    return {
      insight: `Margin & Mix (${sellerLabel}, ${payload.periodLabel}): ${k.jobs} jobs ${money(k.revenue)} · GP ${k.profit == null ? '—' : money(k.profit)} (${pct(k.profitPct)}) · ${k.missingCostJobs} missing cost · ${k.thinJobs} thin. Same numbers as Reports → Margin & Mix.`,
      viz: kpiRows([
        ['Revenue', money(k.revenue)],
        ['Gross profit', k.profit == null ? '—' : money(k.profit)],
        ['GP %', pct(k.profitPct)],
        ['Jobs', k.jobs],
        ['Missing cost', k.missingCostJobs],
        ['Thin / loss', `${k.thinJobs} / ${k.lossJobs}`],
      ]),
      projectsHref: pack,
    };
  }

  throw new Error('clarify');
}

function hrefIds(rows: Array<{ id: string }>): string | null {
  return projectsHrefForAskProjectIds(rows.map((r) => r.id));
}

function dealTable(
  title: string,
  rows: Array<{
    id: string;
    slNo: number | null;
    customer: string;
    stage: string;
    extra: string;
    value: number;
  }>,
): ZenithNlViz {
  return {
    kind: 'table',
    title,
    columns: [
      { key: 'slNo', label: 'SL' },
      { key: 'customer', label: 'Customer' },
      { key: 'stage', label: 'Stage' },
      { key: 'extra', label: 'Detail' },
      { key: 'value', label: '₹' },
    ],
    rows: rows.map((r) => ({
      slNo: r.slNo,
      customer: r.customer,
      stage: r.stage,
      extra: r.extra,
      value: Math.round(r.value),
      href: dealHref(r.id),
    })),
  };
}

function funnelDealViz(deals: FunnelDeal[]): ZenithNlViz {
  return dealTable(
    'Funnel Velocity · deals',
    deals.map((d) => ({
      id: d.id,
      slNo: d.slNo,
      customer: d.customerName,
      stage: d.stage,
      extra: d.slaLabel,
      value: d.orderValue,
    })),
  );
}

function deliveryJobViz(jobs: DeliveryJob[]): ZenithNlViz {
  return dealTable(
    'Delivery Control · jobs',
    jobs.map((j) => ({
      id: j.id,
      slNo: j.slNo,
      customer: j.customerName,
      stage: j.stage,
      extra: j.blockerLabels.join(', ') || j.forecastBucket,
      value: j.orderValue,
    })),
  );
}

function collectionsViz(rows: CollectionsRow[]): ZenithNlViz {
  return dealTable(
    'Collections',
    rows.map((r) => ({
      id: r.id,
      slNo: r.slNo,
      customer: r.customerName,
      stage: r.stage,
      extra: r.agingLabel,
      value: r.balance,
    })),
  );
}

function marginJobViz(jobs: MarginJob[]): ZenithNlViz {
  return dealTable(
    'Margin & Mix · jobs',
    jobs.map((j) => ({
      id: j.id,
      slNo: j.slNo,
      customer: j.customerName,
      stage: j.marginBandLabel,
      extra: j.flagLabels.join(', ') || '—',
      value: j.orderValue,
    })),
  );
}


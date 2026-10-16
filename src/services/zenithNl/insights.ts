import type { ZenithNlMetric, ZenithNlViz } from './catalog';

function formatInr(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function pct(part: number, whole: number): string {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

/**
 * Richer insight paragraphs from computed viz (numbers stay server-owned).
 */
export function enrichInsight(
  metric: ZenithNlMetric,
  viz: ZenithNlViz,
  fallback: string,
): string {
  // List / cohort answers already carry an accurate count + totals sentence.
  if (
    metric === 'cohort_summary' ||
    metric === 'projects_list_slice' ||
    metric === 'availing_loan' ||
    metric === 'outstanding_balance' ||
    metric === 'pending_subsidy' ||
    metric === 'top_customers_by_profit'
  ) {
    return fallback;
  }

  if (viz.kind === 'chart' && viz.series.length > 0) {
    const total = viz.series.reduce((s, x) => s + x.value, 0);
    const dealCount = viz.series.reduce((s, x) => s + (x.count || 0), 0);
    const [top, second] = viz.series;
    const share = pct(top.value, total);
    const parts: string[] = [];
    parts.push(
      `${viz.title}: ${formatInr(total)}${dealCount ? ` across ${dealCount} deals` : ''} under your filters.`,
    );
    parts.push(`Leading slice is ${top.label} at ${formatInr(top.value)} (${share} of the total).`);
    if (second && second.value > 0) {
      parts.push(
        `Next is ${second.label} at ${formatInr(second.value)} (${pct(second.value, total)}).`,
      );
    }
    if (viz.series.length > 2) {
      parts.push(`${viz.series.length} categories shown — use Open in Projects to drill into a slice.`);
    }
    return parts.join(' ');
  }

  if (viz.kind === 'table' && viz.rows.length > 0) {
    const valueCol = viz.columns.find((c) =>
      /value|revenue|balance|profit|₹|capacity/i.test(c.label) ||
      ['value', 'revenue', 'balance', 'profit', 'crmOrderValue'].includes(c.key),
    );
    const countCol = viz.columns.find((c) => /count|deals/i.test(c.label) || c.key === 'count');
    const labelCol = viz.columns[0];

    if (valueCol && labelCol) {
      const ranked = [...viz.rows]
        .map((r) => ({
          label: String(r[labelCol.key] ?? ''),
          value: Number(r[valueCol.key]) || 0,
          count: countCol ? Number(r[countCol.key]) || 0 : 0,
        }))
        .filter((r) => r.label)
        .sort((a, b) => b.value - a.value);
      const total = ranked.reduce((s, r) => s + r.value, 0);
      const top = ranked[0];
      if (top) {
        const unit =
          metric === 'capacity_sold' || /kW|capacity/i.test(valueCol.label)
            ? `${top.value.toLocaleString('en-IN')} ${/kW/i.test(valueCol.label) ? 'kW' : ''}`.trim()
            : formatInr(top.value);
        const totalUnit =
          metric === 'capacity_sold' || /kW|capacity/i.test(valueCol.label)
            ? `${total.toLocaleString('en-IN')} ${/kW/i.test(valueCol.label) ? 'kW' : ''}`.trim()
            : formatInr(total);
        return `${viz.title}: ${ranked.length} row${ranked.length === 1 ? '' : 's'} under your filters (total ${totalUnit}). Top: ${top.label} at ${unit}${top.count ? ` (${top.count} deals)` : ''}.`;
      }
    }

    return `${viz.title}: showing ${viz.rows.length} row${viz.rows.length === 1 ? '' : 's'} for your current Zenith filters. ${fallback}`;
  }

  return fallback;
}

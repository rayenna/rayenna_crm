import type { YearlyRow } from './types';

/** Same palette as FinancialBenefitsBlock / MUJEER PPT chart. */
export const CHART_GOLD = '#eab308';
export const CHART_NAVY = '#0d1b3a';
export const CHART_PAYBACK = '#ef4444';
export const CHART_MUTED = '#6b7280';
export const CHART_AXIS = '#9ca3af';
export const CHART_GRID = '#e5e7eb';

export interface CumulativeSavingsChartInput {
  rows: YearlyRow[];
  projectCost?: number;
  /** Logical CSS pixels before devicePixelRatio scaling. */
  width?: number;
  height?: number;
}

export function fmtChartAxis(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${(n / 1000).toFixed(0)}K`;
}

/** Bar fill: gold until payback, navy after (matches proposal SVG). */
export function barFillForRow(row: YearlyRow): string {
  return row.paybackReached ? CHART_NAVY : CHART_GOLD;
}

/** Build the MUJEER-style cumulative savings chart as an SVG string (testable without canvas). */
export function buildCumulativeSavingsChartSvg(input: CumulativeSavingsChartInput): string | undefined {
  const rows = input.rows ?? [];
  if (rows.length === 0) return undefined;

  const W = input.width ?? 1278;
  const H = input.height ?? 420;
  const padL = 72;
  const padR = 24;
  const padT = 56;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxCumulative = Math.max(1, rows[rows.length - 1]?.cumulativeSavings ?? 1);
  const projectCost = input.projectCost ?? 0;
  const barSlot = plotW / rows.length;
  const barW = Math.max(4, barSlot - 2);

  const barX = (i: number) => padL + i * barSlot + (barSlot - barW) / 2;
  const barH = (val: number) => Math.max(2, (val / maxCumulative) * plotH);

  const guides = [0.25, 0.5, 0.75, 1.0]
    .map((g) => {
      const y = padT + plotH - g * plotH;
      const label = escapeXml(fmtChartAxis(g * maxCumulative));
      return [
        `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${CHART_GRID}" stroke-width="1" stroke-dasharray="4,4"/>`,
        `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" font-family="Calibri,Inter,sans-serif" fill="${CHART_AXIS}">${label}</text>`,
      ].join('');
    })
    .join('');

  const paybackLine =
    projectCost > 0 && projectCost <= maxCumulative
      ? (() => {
          const y = padT + plotH - (projectCost / maxCumulative) * plotH;
          return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${CHART_PAYBACK}" stroke-width="1.5" stroke-dasharray="6,4"/>`;
        })()
      : '';

  const bars = rows
    .map((row, i) => {
      const bh = barH(row.cumulativeSavings);
      const by = padT + plotH - bh;
      return `<rect x="${barX(i)}" y="${by}" width="${barW}" height="${bh}" fill="${barFillForRow(row)}" rx="1.5" opacity="0.85"/>`;
    })
    .join('');

  const xLabels = rows
    .filter((r) => r.year % 5 === 0)
    .map((row) => {
      const i = row.year - 1;
      if (i < 0 || i >= rows.length) return '';
      return `<text x="${barX(i) + barW / 2}" y="${H - 14}" text-anchor="middle" font-size="12" font-family="Calibri,Inter,sans-serif" fill="${CHART_MUTED}">Yr ${row.year}</text>`;
    })
    .join('');

  const legendPayback =
    projectCost > 0 && projectCost <= maxCumulative
      ? [
          `<line x1="${padL + 230}" y1="39" x2="${padL + 250}" y2="39" stroke="${CHART_PAYBACK}" stroke-width="1.5" stroke-dasharray="5,3"/>`,
          `<text x="${padL + 256}" y="42" font-size="12" font-family="Calibri,Inter,sans-serif" fill="${CHART_PAYBACK}">Payback line</text>`,
        ].join('')
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff" rx="10" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${padL}" y="28" font-size="14" font-weight="600" font-family="Calibri,Inter,sans-serif" fill="${CHART_AXIS}">25-YEAR CUMULATIVE SAVINGS</text>
  <rect x="${padL}" y="35" width="10" height="8" fill="${CHART_GOLD}" rx="1"/>
  <text x="${padL + 14}" y="42" font-size="12" font-family="Calibri,Inter,sans-serif" fill="${CHART_MUTED}">Pre-payback</text>
  <rect x="${padL + 110}" y="35" width="10" height="8" fill="${CHART_NAVY}" rx="1"/>
  <text x="${padL + 124}" y="42" font-size="12" font-family="Calibri,Inter,sans-serif" fill="${CHART_MUTED}">Post-payback</text>
  ${legendPayback}
  ${guides}
  ${paybackLine}
  ${bars}
  ${xLabels}
</svg>`;
}

/**
 * Rasterize the cumulative savings chart to a PNG data URL for PPT embed.
 * Draws directly on canvas (browser). Returns undefined when rows are empty
 * or 2D canvas is unavailable.
 */
export function renderCumulativeSavingsChartPng(
  input: CumulativeSavingsChartInput,
): string | undefined {
  const rows = input.rows ?? [];
  if (rows.length === 0) return undefined;
  if (typeof document === 'undefined') return undefined;

  const W = input.width ?? 1278;
  const H = input.height ?? 420;
  const padL = 72;
  const padR = 24;
  const padT = 56;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxCumulative = Math.max(1, rows[rows.length - 1]?.cumulativeSavings ?? 1);
  const projectCost = input.projectCost ?? 0;
  const barSlot = plotW / rows.length;
  const barW = Math.max(4, barSlot - 2);

  const canvas = document.createElement('canvas');
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  roundRectPath(ctx, 0.5, 0.5, W - 1, H - 1, 10);
  ctx.stroke();

  ctx.fillStyle = CHART_AXIS;
  ctx.font = '600 14px Calibri, Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('25-YEAR CUMULATIVE SAVINGS', padL, 28);

  const legendY = 42;
  fillRoundRect(ctx, padL, legendY - 7, 10, 8, 1, CHART_GOLD);
  ctx.fillStyle = CHART_MUTED;
  ctx.font = '12px Calibri, Inter, sans-serif';
  ctx.fillText('Pre-payback', padL + 14, legendY);
  fillRoundRect(ctx, padL + 110, legendY - 7, 10, 8, 1, CHART_NAVY);
  ctx.fillText('Post-payback', padL + 124, legendY);
  if (projectCost > 0 && projectCost <= maxCumulative) {
    ctx.strokeStyle = CHART_PAYBACK;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(padL + 230, legendY - 3);
    ctx.lineTo(padL + 250, legendY - 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CHART_PAYBACK;
    ctx.fillText('Payback line', padL + 256, legendY);
  }

  const barX = (i: number) => padL + i * barSlot + (barSlot - barW) / 2;
  const barH = (val: number) => Math.max(2, (val / maxCumulative) * plotH);

  ctx.font = '11px Calibri, Inter, sans-serif';
  for (const g of [0.25, 0.5, 0.75, 1.0]) {
    const y = padT + plotH - g * plotH;
    ctx.strokeStyle = CHART_GRID;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CHART_AXIS;
    ctx.textAlign = 'right';
    ctx.fillText(fmtChartAxis(g * maxCumulative), padL - 8, y + 4);
  }

  if (projectCost > 0 && projectCost <= maxCumulative) {
    const y = padT + plotH - (projectCost / maxCumulative) * plotH;
    ctx.strokeStyle = CHART_PAYBACK;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const bh = barH(row.cumulativeSavings);
    const by = padT + plotH - bh;
    ctx.globalAlpha = 0.85;
    fillRoundRect(ctx, barX(i), by, barW, bh, 1.5, barFillForRow(row));
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = CHART_MUTED;
  ctx.font = '12px Calibri, Inter, sans-serif';
  ctx.textAlign = 'center';
  for (const row of rows) {
    if (row.year % 5 !== 0) continue;
    const i = row.year - 1;
    if (i < 0 || i >= rows.length) continue;
    ctx.fillText(`Yr ${row.year}`, barX(i) + barW / 2, H - 14);
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

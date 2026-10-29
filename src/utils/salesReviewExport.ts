import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'
import type { SalesReviewDeal, SalesReviewPayload } from './salesReview'

const GOLD = 'F5A623'
const NAVY = '1A1A2E'
const TEAL = '2DD4BF'
const BLUE = '4A90D9'

export type SalesReviewExportMeta = {
  sellerLabel: string
  exportedBy: string
}

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const rounded = Math.round(n * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(1)}%`
}

function formatKw(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n).toLocaleString('en-IN')} kW`
}

function formatCloseDate(ymd: string | null | undefined): string {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${String(y).slice(-2)}`
}

function loanLabel(v: boolean | null): string {
  if (v === true) return 'Y'
  if (v === false) return 'N'
  return '—'
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'export'
}

export function salesReviewExportBasename(payload: SalesReviewPayload, sellerLabel: string): string {
  const day = (payload.generatedAt || new Date().toISOString()).slice(0, 10)
  return `sales-review-FY${payload.currentFy}-${slug(sellerLabel)}-${day}`
}

function metricCell(rowKey: string, n: number | null): string | number {
  if (n == null || !Number.isFinite(n)) return '—'
  if (rowKey === 'yoy' || rowKey === 'qoq' || rowKey === 'avgProfitability') return formatPct(n)
  if (rowKey === 'deals') return n
  if (rowKey === 'capacityKw') return n
  return n
}

export function salesReviewExcelSheets(payload: SalesReviewPayload, meta: SalesReviewExportMeta) {
  const k = payload.kpis
  const summary = [
    { Field: 'Report', Value: 'Sales Review' },
    { Field: 'Financial year', Value: payload.currentFy },
    { Field: 'Seller', Value: meta.sellerLabel },
    { Field: 'Generated', Value: payload.generatedAt },
    { Field: 'Exported by', Value: meta.exportedBy },
    { Field: 'YTD revenue', Value: k.closedYtdRevenue },
    { Field: 'YTD profit', Value: k.closedYtdProfit },
    { Field: 'YTD deals won', Value: k.closedYtdDeals },
    { Field: 'YTD capacity kW', Value: k.closedYtdKw },
    { Field: 'Open pipeline', Value: k.openPipeline },
    { Field: 'Weighted forecast', Value: k.openWeighted },
    { Field: 'Open deals', Value: k.openDeals },
    { Field: 'Overdue deals', Value: k.pastDueDeals },
    { Field: 'Unscheduled deals', Value: k.unscheduledDeals },
    { Field: 'Lost YTD deals', Value: k.lostYtdDeals },
    { Field: 'Lost YTD value', Value: k.lostYtdValue },
  ]

  const achievement = payload.achievement.rows.map((row) => {
    const rec: Record<string, string | number> = { Metric: row.label }
    payload.achievement.columns.forEach((col, i) => {
      rec[col.label] = metricCell(row.key, row.values[i] ?? null)
    })
    return rec
  })

  const forecast = payload.forecast.rows.map((row) => {
    const rec: Record<string, string | number> = { Metric: row.label }
    payload.forecast.columns.forEach((col, i) => {
      rec[col.shortLabel] = metricCell(row.key, row.values[i] ?? null)
    })
    rec.Total = metricCell(row.key, row.total)
    return rec
  })
  forecast.push({
    Metric: 'Unscheduled pipeline',
    ...Object.fromEntries(payload.forecast.columns.map((c) => [c.shortLabel, '—'])),
    Total: payload.forecast.unscheduledPipeline,
  })

  const deals = payload.deals.map((d) => ({
    '#': d.slNo ?? '',
    Customer: d.customerName,
    Seller: d.salespersonName ?? '',
    Stage: d.stage,
    'Probability %': d.probability,
    Type: d.customerTypeLabel,
    System: d.systemTypeLabel,
    Segment: d.segmentLabel,
    'Close date': d.closeDate ?? '',
    Quarter: d.quarter ?? '',
    FY: d.fy ?? '',
    Loan: loanLabel(d.bankLoan),
    'Order value': d.orderValue,
    Weighted: d.weightedValue,
    Overdue: d.pastDue ? 'Y' : 'N',
    Unscheduled: d.unscheduled ? 'Y' : 'N',
  }))

  return { summary, achievement, forecast, deals }
}

export function buildSalesReviewExcelBuffer(payload: SalesReviewPayload, meta: SalesReviewExportMeta): Buffer {
  const sheets = salesReviewExcelSheets(payload, meta)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.summary), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.achievement), 'Achievement')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.forecast), 'Forecast')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.deals), 'Deal list')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function buildSalesReviewPdfBuffer(payload: SalesReviewPayload, meta: SalesReviewExportMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 36
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin,
      info: { Title: `Sales Review FY${payload.currentFy}`, Author: 'Rayenna CRM' },
    })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width
    const pageH = doc.page.height
    const contentW = pageW - margin * 2
    const gold = '#C47F12'
    const navy = '#1A1A2E'
    const muted = '#6b7280'

    const textAt = (
      str: string,
      tx: number,
      ty: number,
      opts: { width?: number; align?: 'left' | 'right' | 'center'; height?: number } = {},
    ) => {
      doc.text(str, tx, ty, {
        lineBreak: false,
        height: opts.height ?? 12,
        ellipsis: true,
        width: opts.width,
        align: opts.align,
      })
    }

    const footer = () => {
      doc.font('Helvetica').fontSize(8).fillColor(muted)
      textAt(
        `Rayenna CRM · Sales Review · FY${payload.currentFy} · ${meta.sellerLabel} · Confidential`,
        margin,
        pageH - 22,
        { width: contentW, align: 'left' },
      )
    }

    doc.on('pageAdded', footer)

    doc.font('Helvetica-Bold').fontSize(18).fillColor(navy)
    textAt('Sales Review', margin, margin, { width: contentW })
    doc.font('Helvetica').fontSize(10).fillColor(muted)
    textAt(`Weekly pack · FY${payload.currentFy} · ${meta.sellerLabel}`, margin, margin + 24, { width: contentW })
    textAt(
      `Generated ${payload.generatedAt.slice(0, 16).replace('T', ' ')} · Exported by ${meta.exportedBy}`,
      margin,
      margin + 38,
      { width: contentW },
    )

    const k = payload.kpis
    const kpis: [string, string][] = [
      ['YTD revenue', formatInr(k.closedYtdRevenue)],
      ['YTD profit', formatInr(k.closedYtdProfit)],
      ['YTD capacity', formatKw(k.closedYtdKw)],
      ['Open pipeline', formatInr(k.openPipeline)],
      ['Weighted forecast', formatInr(k.openWeighted)],
      ['Call flags', `${k.pastDueDeals} overdue · ${k.unscheduledDeals} no date · ${k.lostYtdDeals} lost YTD`],
    ]
    let x = margin
    const kpiY = margin + 58
    const kpiW = contentW / 6 - 6
    kpis.forEach(([label, value]) => {
      doc.roundedRect(x, kpiY, kpiW, 42, 4).strokeColor('#e5e7eb').lineWidth(0.6).stroke()
      doc.font('Helvetica-Bold').fontSize(7).fillColor(gold)
      textAt(label.toUpperCase(), x + 6, kpiY + 6, { width: kpiW - 12 })
      doc.font('Helvetica-Bold').fontSize(9).fillColor(navy)
      textAt(value, x + 6, kpiY + 20, { width: kpiW - 12 })
      x += kpiW + 7
    })

    let y = kpiY + 56
    const drawTable = (title: string, headers: string[], rows: string[][], colW: number[]) => {
      if (y > pageH - 80) {
        doc.addPage()
        y = margin
      }
      doc.font('Helvetica-Bold').fontSize(12).fillColor(navy)
      textAt(title, margin, y, { width: contentW })
      y += 18
      const rowH = 16
      const drawHeader = () => {
        doc.rect(margin, y, contentW, rowH).fill('#F5E6C8')
        doc.fillColor(gold)
        let cx = margin
        headers.forEach((h, i) => {
          doc.font('Helvetica-Bold').fontSize(8)
          textAt(h, cx + 4, y + 4, { width: colW[i] - 8, align: i === 0 ? 'left' : 'right' })
          cx += colW[i]
        })
        y += rowH
      }
      drawHeader()
      rows.forEach((row, ri) => {
        if (y > pageH - 48) {
          doc.addPage()
          y = margin
          drawHeader()
        }
        if (ri % 2 === 1) doc.rect(margin, y, contentW, rowH).fill('#FAFAF8')
        doc.fillColor(navy)
        let cx = margin
        row.forEach((cell, i) => {
          doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(navy)
          textAt(cell, cx + 4, y + 4, { width: colW[i] - 8, align: i === 0 ? 'left' : 'right' })
          cx += colW[i]
        })
        y += rowH
      })
      y += 12
    }

    const achHeaders = ['Metric', ...payload.achievement.columns.map((c) => c.label)]
    const achColW = [160, ...payload.achievement.columns.map(() => (contentW - 160) / payload.achievement.columns.length)]
    const achRows = payload.achievement.rows.map((row) => [
      row.label,
      ...row.values.map((v) => String(metricCell(row.key, v))),
    ])
    drawTable('Achievement', achHeaders, achRows, achColW)

    const fcHeaders = ['Metric', ...payload.forecast.columns.map((c) => c.shortLabel), 'Total']
    const fcColW = [180, ...payload.forecast.columns.map(() => (contentW - 180) / (payload.forecast.columns.length + 1)), (contentW - 180) / (payload.forecast.columns.length + 1)]
    const fcRows = payload.forecast.rows.map((row) => [
      row.label,
      ...row.values.map((v) => String(metricCell(row.key, v))),
      String(metricCell(row.key, row.total)),
    ])
    drawTable('Forecast', fcHeaders, fcRows, fcColW)

    const dealHeaders = ['#', 'Customer', 'Stage', 'Prob.', 'Type', 'Close', 'Qtr', 'Loan', 'Order value']
    const dealColW = [40, 170, 110, 46, 90, 70, 50, 40, contentW - 616]
    const dealRows = payload.deals.map((d) => [
      d.slNo != null ? String(d.slNo) : '',
      d.customerName,
      d.stage,
      `${d.probability}%`,
      d.customerTypeLabel,
      formatCloseDate(d.closeDate),
      d.quarter ?? '—',
      loanLabel(d.bankLoan),
      formatInr(d.orderValue),
    ])
    drawTable(`Deal list (${payload.deals.length} open)`, dealHeaders, dealRows, dealColW)

    footer()
    doc.end()
  })
}

function pptTable(
  headers: string[],
  rows: string[][],
  opts?: { alignRightFrom?: number },
): PptxGenJS.TableRow[] {
  const rightFrom = opts?.alignRightFrom ?? 1
  const head: PptxGenJS.TableRow = headers.map((h) => ({
    text: h,
    options: {
      fill: { color: GOLD },
      color: NAVY,
      bold: true,
      align: 'center',
      valign: 'middle',
      fontSize: 10,
    },
  }))
  const body: PptxGenJS.TableRow[] = rows.map((row) =>
    row.map((cell, i) => ({
      text: cell,
      options: {
        color: NAVY,
        align: i >= rightFrom ? 'right' : 'left',
        valign: 'middle',
        fontSize: 9,
        fill: { color: 'FFFFFF' },
      },
    })),
  )
  return [head, ...body]
}

export async function buildSalesReviewPptxBuffer(
  payload: SalesReviewPayload,
  meta: SalesReviewExportMeta,
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Sales Review FY${payload.currentFy}`
  pptx.author = 'Rayenna CRM'
  pptx.company = 'Rayenna Energy Private Limited'
  pptx.subject = `Weekly sales review · ${meta.sellerLabel}`

  const k = payload.kpis
  const title = pptx.addSlide()
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: NAVY } })
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } })
  title.addText('SALES REVIEW', {
    x: 0.7,
    y: 2.1,
    w: 12,
    fontSize: 14,
    bold: true,
    color: GOLD,
    fontFace: 'Arial',
  })
  title.addText(`FY${payload.currentFy}`, {
    x: 0.7,
    y: 2.55,
    w: 12,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  })
  title.addText(`${meta.sellerLabel}  ·  Weekly pack`, {
    x: 0.7,
    y: 3.4,
    w: 12,
    fontSize: 16,
    color: 'D2CBC0',
    fontFace: 'Arial',
  })
  title.addText(`Generated ${payload.generatedAt.slice(0, 10)}  ·  ${meta.exportedBy}`, {
    x: 0.7,
    y: 6.7,
    w: 12,
    fontSize: 11,
    color: '9CA3AF',
    fontFace: 'Arial',
  })

  const kpiSlide = pptx.addSlide()
  kpiSlide.addText('Call snapshot', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  const kpiItems: [string, string][] = [
    ['YTD revenue', formatInr(k.closedYtdRevenue)],
    ['YTD profit', formatInr(k.closedYtdProfit)],
    ['YTD capacity', formatKw(k.closedYtdKw)],
    ['Open pipeline', formatInr(k.openPipeline)],
    ['Weighted forecast', formatInr(k.openWeighted)],
    ['Overdue / lost YTD', `${k.pastDueDeals} overdue · ${k.lostYtdDeals} lost`],
  ]
  kpiItems.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.4 + col * 4.2
    const y = 1.1 + row * 2.6
    kpiSlide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: 3.95,
      h: 2.2,
      fill: { color: 'F7F4EF' },
      rectRadius: 0.1,
    })
    kpiSlide.addText(label.toUpperCase(), {
      x: x + 0.2,
      y: y + 0.3,
      w: 3.55,
      fontSize: 11,
      bold: true,
      color: GOLD,
      fontFace: 'Arial',
    })
    kpiSlide.addText(value, {
      x: x + 0.2,
      y: y + 0.85,
      w: 3.55,
      fontSize: 22,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
  })

  const ach = pptx.addSlide()
  ach.addText('Achievement', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  ach.addTable(
    pptTable(
      ['Metric', ...payload.achievement.columns.map((c) => c.label)],
      payload.achievement.rows.map((row) => [row.label, ...row.values.map((v) => String(metricCell(row.key, v)))]),
    ),
    { x: 0.4, y: 0.85, w: 12.5, colW: [2.6, ...payload.achievement.columns.map(() => 9.9 / payload.achievement.columns.length)], border: { pt: 0.5, color: 'E5E7EB' }, align: 'center' },
  )

  const fc = pptx.addSlide()
  fc.addText('Forecast vs last year', { x: 0.4, y: 0.2, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  fc.addTable(
    pptTable(
      ['Metric', ...payload.forecast.columns.map((c) => c.shortLabel), 'Total'],
      payload.forecast.rows.map((row) => [
        row.label,
        ...row.values.map((v) => String(metricCell(row.key, v))),
        String(metricCell(row.key, row.total)),
      ]),
    ),
    {
      x: 0.4,
      y: 0.7,
      w: 12.5,
      colW: [2.4, ...payload.forecast.columns.map(() => 8.6 / (payload.forecast.columns.length + 1)), 8.6 / (payload.forecast.columns.length + 1)],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )
  const labels = payload.forecast.columns.map((c) => c.shortLabel)
  const pipe = payload.forecast.rows.find((r) => r.key === 'pipeline')
  const weighted = payload.forecast.rows.find((r) => r.key === 'weighted')
  const lastYear = payload.forecast.rows.find((r) => r.key === 'lastYear')
  fc.addChart(
    pptx.ChartType.bar,
    [
      { name: 'Pipeline', labels, values: labels.map((_, i) => pipe?.values[i] ?? 0) },
      { name: 'Weighted', labels, values: labels.map((_, i) => weighted?.values[i] ?? 0) },
      { name: 'Last year', labels, values: labels.map((_, i) => lastYear?.values[i] ?? 0) },
    ],
    {
      x: 0.4,
      y: 3.55,
      w: 12.5,
      h: 3.5,
      barGrouping: 'clustered',
      showLegend: true,
      legendPos: 'b',
      chartColors: [BLUE, GOLD, TEAL],
      showValue: false,
      catAxisLabelColor: NAVY,
      valAxisLabelColor: NAVY,
    },
  )

  const perSlide = 12
  const dealChunks: SalesReviewDeal[][] = []
  for (let i = 0; i < payload.deals.length; i += perSlide) {
    dealChunks.push(payload.deals.slice(i, i + perSlide))
  }
  if (dealChunks.length === 0) dealChunks.push([])
  dealChunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(
      dealChunks.length > 1 ? `Open deals (${idx + 1}/${dealChunks.length})` : 'Open deals',
      { x: 0.35, y: 0.2, fontSize: 16, bold: true, color: NAVY, fontFace: 'Arial' },
    )
    const rows = chunk.map((d) => [
      d.slNo != null ? String(d.slNo) : '',
      d.customerName,
      d.stage,
      `${d.probability}%`,
      d.customerTypeLabel,
      formatCloseDate(d.closeDate),
      formatInr(d.orderValue),
    ])
    slide.addTable(pptTable(['#', 'Customer', 'Stage', 'Prob.', 'Type', 'Close', 'Order value'], rows, { alignRightFrom: 6 }), {
      x: 0.3,
      y: 0.7,
      w: 12.7,
      colW: [0.6, 3.4, 2.2, 0.8, 1.6, 1.2, 2.9],
      border: { pt: 0.4, color: 'E5E7EB' },
      fontFace: 'Arial',
    })
  })

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array)
}

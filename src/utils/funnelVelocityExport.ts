import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'
import {
  FUNNEL_AGING_LABELS,
  type FunnelDeal,
  type FunnelVelocityPayload,
} from './funnelVelocity'

const GOLD = 'F5A623'
const NAVY = '1A1A2E'

export type FunnelVelocityExportMeta = {
  sellerLabel: string
  exportedBy: string
}

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function formatInrPdf(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `Rs ${Math.round(n).toLocaleString('en-IN')}`
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`
}

function formatDays(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n}`
}

function formatCloseDate(ymd: string | null | undefined): string {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${String(y).slice(-2)}`
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'export'
  )
}

export function funnelVelocityExportBasename(payload: FunnelVelocityPayload, sellerLabel: string): string {
  const day = (payload.generatedAt || new Date().toISOString()).slice(0, 10)
  return `funnel-velocity-FY${payload.currentFy}-${slug(sellerLabel)}-${day}`
}

function funnelCell(rowKey: string, n: number | null): string | number {
  if (n == null || !Number.isFinite(n)) return '—'
  if (rowKey === 'pipeline') return n
  return n
}

export function funnelVelocityExcelSheets(payload: FunnelVelocityPayload, meta: FunnelVelocityExportMeta) {
  const k = payload.kpis
  const summary = [
    { Field: 'Report', Value: 'Funnel Velocity' },
    { Field: 'Financial year', Value: payload.currentFy },
    { Field: 'Seller', Value: meta.sellerLabel },
    { Field: 'Generated', Value: payload.generatedAt },
    { Field: 'Exported by', Value: meta.exportedBy },
    { Field: 'Open deals', Value: k.openDeals },
    { Field: 'Open pipeline', Value: k.openPipeline },
    { Field: 'Median days in stage', Value: k.medianDays ?? '' },
    { Field: 'SLA red', Value: k.slaRed },
    { Field: 'SLA amber', Value: k.slaAmber },
    { Field: 'Estimated stage dates', Value: k.estimatedDates },
    { Field: 'Confirmed YTD deals', Value: k.confirmedYtdDeals },
    { Field: 'Confirmed YTD value', Value: k.confirmedYtdValue },
    { Field: 'Lost YTD deals', Value: k.lostYtdDeals },
    { Field: 'Lost YTD value', Value: k.lostYtdValue },
    { Field: 'Win rate %', Value: k.winRate ?? '' },
    { Field: 'Median days to confirm', Value: k.medianDaysToConfirm ?? '' },
    { Field: 'Median days to lose', Value: k.medianDaysToLose ?? '' },
  ]

  const funnel = payload.funnel.rows.map((row) => {
    const rec: Record<string, string | number> = { Metric: row.label }
    payload.funnel.columns.forEach((col, i) => {
      rec[col.label] = funnelCell(row.key, row.values[i] ?? null)
    })
    rec.Total = funnelCell(row.key, row.total)
    return rec
  })

  const aging = payload.aging.rows.map((row) => {
    const rec: Record<string, string | number> = { Metric: row.label }
    payload.aging.columns.forEach((col, i) => {
      rec[col.label] = row.values[i] ?? 0
    })
    rec.Total = row.total
    return rec
  })

  const sellerLoad = payload.sellerLoad.map((r) => ({
    Seller: r.salespersonName,
    Deals: r.deals,
    Pipeline: r.pipeline,
    'Median days': r.medianDays ?? '',
    'SLA red': r.slaRed,
    'SLA amber': r.slaAmber,
  }))

  const deals = payload.deals.map((d) => ({
    '#': d.slNo ?? '',
    Customer: d.customerName,
    Seller: d.salespersonName ?? '',
    Stage: d.stage,
    'Days in stage': d.daysInStage ?? '',
    SLA: d.slaLabel,
    Aging: d.agingLabel,
    'Probability %': d.probability,
    Type: d.customerTypeLabel,
    System: d.systemTypeLabel,
    Segment: d.segmentLabel,
    'Stage date': d.stageEnteredYmd ?? '',
    Estimated: d.stageDateEstimated ? 'Y' : 'N',
    'Order value': d.orderValue,
    Flags: d.flagLabels.join('; '),
  }))

  return { summary, funnel, aging, sellerLoad, deals }
}

export function buildFunnelVelocityExcelBuffer(
  payload: FunnelVelocityPayload,
  meta: FunnelVelocityExportMeta,
): Buffer {
  const sheets = funnelVelocityExcelSheets(payload, meta)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.summary), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.funnel), 'Funnel')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.aging), 'Aging')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.sellerLoad), 'Seller load')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.deals), 'Stuck list')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function buildFunnelVelocityPdfBuffer(
  payload: FunnelVelocityPayload,
  meta: FunnelVelocityExportMeta,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 36
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin,
      info: { Title: `Funnel Velocity FY${payload.currentFy}`, Author: 'Rayenna CRM' },
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

    const fitCols = (weights: number[]): number[] => {
      const sum = weights.reduce((s, w) => s + w, 0) || 1
      return weights.map((w) => (w / sum) * contentW)
    }

    const cellText = (
      str: string,
      tx: number,
      ty: number,
      tw: number,
      th: number,
      align: 'left' | 'right',
    ) => {
      doc.save()
      doc.rect(tx, ty, Math.max(0, tw), th).clip()
      doc.text(str, tx + 3, ty + 3.5, {
        width: Math.max(8, tw - 6),
        height: th - 5,
        ellipsis: true,
        lineBreak: false,
        align,
      })
      doc.restore()
    }

    const footer = () => {
      doc.font('Helvetica').fontSize(8).fillColor(muted)
      textAt(
        `Rayenna CRM · Funnel Velocity · FY${payload.currentFy} · ${meta.sellerLabel} · Confidential`,
        margin,
        pageH - 22,
        { width: contentW, align: 'left' },
      )
    }

    doc.on('pageAdded', footer)

    doc.font('Helvetica-Bold').fontSize(18).fillColor(navy)
    textAt('Funnel Velocity', margin, margin, { width: contentW })
    doc.font('Helvetica').fontSize(10).fillColor(muted)
    textAt(`Weekly sales hygiene pack · FY${payload.currentFy} · ${meta.sellerLabel}`, margin, margin + 24, {
      width: contentW,
    })
    textAt(
      `Generated ${payload.generatedAt.slice(0, 16).replace('T', ' ')} · Exported by ${meta.exportedBy}`,
      margin,
      margin + 38,
      { width: contentW },
    )

    const k = payload.kpis
    const kpis: [string, string][] = [
      ['Open pipeline', `${formatInrPdf(k.openPipeline)} · ${k.openDeals} deals`],
      ['Median days', formatDays(k.medianDays)],
      ['SLA red', String(k.slaRed)],
      ['Win rate', formatPct(k.winRate)],
      ['Confirmed YTD', `${k.confirmedYtdDeals} · ${formatInrPdf(k.confirmedYtdValue)}`],
      ['Lost YTD', `${k.lostYtdDeals} · ${formatInrPdf(k.lostYtdValue)}`],
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
    const drawTable = (title: string, headers: string[], rows: string[][], weights: number[], rightAlign: boolean[]) => {
      if (y > pageH - 80) {
        doc.addPage()
        y = margin
      }
      const colW = fitCols(weights)
      doc.font('Helvetica-Bold').fontSize(12).fillColor(navy)
      textAt(title, margin, y, { width: contentW })
      y += 18
      const rowH = 16
      const drawHeader = () => {
        doc.rect(margin, y, contentW, rowH).fill('#F5E6C8')
        let cx = margin
        headers.forEach((h, i) => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(gold)
          cellText(h, cx, y, colW[i] ?? 40, rowH, rightAlign[i] ? 'right' : 'left')
          cx += colW[i] ?? 40
        })
        y += rowH
      }
      drawHeader()
      rows.forEach((row, ri) => {
        if (y > pageH - 36) {
          doc.addPage()
          y = margin
          drawHeader()
        }
        if (ri % 2 === 1) doc.rect(margin, y, contentW, rowH).fill('#FAFAF8')
        let cx = margin
        row.forEach((cell, i) => {
          doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(navy)
          cellText(cell, cx, y, colW[i] ?? 40, rowH, rightAlign[i] ? 'right' : 'left')
          cx += colW[i] ?? 40
        })
        y += rowH
      })
      y += 14
    }

    const funnelHeaders = ['Metric', ...payload.funnel.columns.map((c) => c.label), 'Total']
    const funnelRight = funnelHeaders.map((_, i) => i > 0)
    drawTable(
      'Open funnel',
      funnelHeaders,
      payload.funnel.rows.map((row) => [
        row.label,
        ...row.values.map((v) =>
          row.key === 'pipeline' ? formatInrPdf(v) : v == null ? '—' : String(v),
        ),
        row.key === 'pipeline' ? formatInrPdf(row.total) : row.total == null ? '—' : String(row.total),
      ]),
      [160, 140, 140, 140, 140],
      funnelRight,
    )

    const agingHeaders = ['Metric', ...payload.aging.columns.map((c) => FUNNEL_AGING_LABELS[c.key]), 'Total']
    drawTable(
      'Days in stage',
      agingHeaders,
      payload.aging.rows.map((row) => [
        row.label,
        ...row.values.map((v) => (row.key === 'pipeline' ? formatInrPdf(v) : String(v))),
        row.key === 'pipeline' ? formatInrPdf(row.total) : String(row.total),
      ]),
      [120, 80, 80, 80, 80, 80, 80, 90],
      agingHeaders.map((_, i) => i > 0),
    )

    drawTable(
      'Seller load',
      ['Seller', 'Deals', 'Pipeline', 'Median days', 'SLA red', 'SLA amber'],
      payload.sellerLoad.map((r) => [
        r.salespersonName,
        String(r.deals),
        formatInrPdf(r.pipeline),
        formatDays(r.medianDays),
        String(r.slaRed),
        String(r.slaAmber),
      ]),
      [220, 80, 140, 110, 90, 90],
      [false, true, true, true, true, true],
    )

    doc.addPage()
    y = margin
    drawTable(
      'Stuck list',
      ['Customer', 'Stage', 'Days', 'SLA', 'Aging', 'Seller', 'Value'],
      payload.deals.map((d) => [
        `${d.slNo != null ? `#${d.slNo} ` : ''}${d.customerName}`,
        d.stage,
        formatDays(d.daysInStage),
        d.slaLabel,
        d.agingLabel,
        d.salespersonName || '—',
        formatInrPdf(d.orderValue),
      ]),
      [220, 110, 60, 70, 70, 120, 110],
      [false, false, true, false, false, false, true],
    )

    footer()
    doc.end()
  })
}

function pptTable(
  headers: string[],
  rows: string[][],
  opts?: { alignRightFrom?: number },
): PptxGenJS.TableRow[] {
  const rightFrom = opts?.alignRightFrom ?? 99
  const head: PptxGenJS.TableRow = headers.map((h) => ({
    text: h,
    options: { bold: true, color: GOLD, fill: { color: 'F5E6C8' }, align: 'left', valign: 'middle', fontSize: 10 },
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

export async function buildFunnelVelocityPptxBuffer(
  payload: FunnelVelocityPayload,
  meta: FunnelVelocityExportMeta,
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Funnel Velocity FY${payload.currentFy}`
  pptx.author = 'Rayenna CRM'
  pptx.company = 'Rayenna Energy Private Limited'
  pptx.subject = `Weekly sales hygiene pack · ${meta.sellerLabel}`

  const k = payload.kpis
  const title = pptx.addSlide()
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: NAVY } })
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } })
  title.addText('FUNNEL VELOCITY', {
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
  title.addText(`${meta.sellerLabel}  ·  Weekly sales hygiene pack`, {
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
  kpiSlide.addText('Funnel snapshot', {
    x: 0.4,
    y: 0.25,
    fontSize: 18,
    bold: true,
    color: NAVY,
    fontFace: 'Arial',
  })
  const kpiItems: [string, string][] = [
    ['Open pipeline', formatInr(k.openPipeline)],
    ['Median days', formatDays(k.medianDays)],
    ['SLA red / amber', `${k.slaRed} / ${k.slaAmber}`],
    ['Win rate', formatPct(k.winRate)],
    ['Confirmed YTD', `${k.confirmedYtdDeals} · ${formatInr(k.confirmedYtdValue)}`],
    ['Lost YTD', `${k.lostYtdDeals} · ${formatInr(k.lostYtdValue)}`],
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
      fontSize: 20,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
  })

  const funnel = pptx.addSlide()
  funnel.addText('Open funnel', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  funnel.addTable(
    pptTable(
      ['Metric', ...payload.funnel.columns.map((c) => c.label), 'Total'],
      payload.funnel.rows.map((row) => [
        row.label,
        ...row.values.map((v) => (row.key === 'pipeline' ? formatInr(v) : v == null ? '—' : String(v))),
        row.key === 'pipeline' ? formatInr(row.total) : row.total == null ? '—' : String(row.total),
      ]),
      { alignRightFrom: 1 },
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [2.4, 2.5, 2.5, 2.5, 2.6],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const aging = pptx.addSlide()
  aging.addText('Days in stage', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  aging.addTable(
    pptTable(
      ['Metric', ...payload.aging.columns.map((c) => c.label), 'Total'],
      payload.aging.rows.map((row) => [
        row.label,
        ...row.values.map((v) => (row.key === 'pipeline' ? formatInr(v) : String(v))),
        row.key === 'pipeline' ? formatInr(row.total) : String(row.total),
      ]),
      { alignRightFrom: 1 },
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [2.0, ...payload.aging.columns.map(() => 1.4), 1.5],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const load = pptx.addSlide()
  load.addText('Seller load', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  load.addTable(
    pptTable(
      ['Seller', 'Deals', 'Pipeline', 'Median days', 'SLA red', 'SLA amber'],
      payload.sellerLoad.map((r) => [
        r.salespersonName,
        String(r.deals),
        formatInr(r.pipeline),
        formatDays(r.medianDays),
        String(r.slaRed),
        String(r.slaAmber),
      ]),
      { alignRightFrom: 1 },
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [3.3, 1.4, 2.4, 1.8, 1.8, 1.8],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const perSlide = 12
  const chunks: FunnelDeal[][] = []
  for (let i = 0; i < payload.deals.length; i += perSlide) chunks.push(payload.deals.slice(i, i + perSlide))
  if (chunks.length === 0) chunks.push([])
  chunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(chunks.length > 1 ? `Stuck list (${idx + 1}/${chunks.length})` : 'Stuck list', {
      x: 0.35,
      y: 0.2,
      fontSize: 16,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
    const rows = chunk.map((d) => [
      d.slNo != null ? String(d.slNo) : '',
      d.customerName,
      d.stage,
      formatDays(d.daysInStage),
      d.slaLabel,
      d.flagLabels[0] || '—',
      formatInr(d.orderValue),
    ])
    slide.addTable(
      pptTable(['#', 'Customer', 'Stage', 'Days', 'SLA', 'Flag', 'Value'], rows, { alignRightFrom: 6 }),
      {
        x: 0.3,
        y: 0.7,
        w: 12.7,
        colW: [0.6, 3.4, 1.7, 0.9, 1.4, 2.0, 2.7],
        border: { pt: 0.4, color: 'E5E7EB' },
        fontFace: 'Arial',
      },
    )
  })

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array)
}

import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import PptxGenJS from 'pptxgenjs'
import {
  DELIVERY_BLOCKER_LABELS,
  type DeliveryControlPayload,
  type DeliveryJob,
  type SubsidyClockJob,
} from './deliveryControl'

const GOLD = 'F5A623'
const NAVY = '1A1A2E'

const SUBSIDY_CLOCK_PDF_HEADERS: Record<string, string> = {
  kseb_feasibility: 'Feas.',
  kseb_registration: 'KSEB reg.',
  install: 'Install',
  mnre_portal: 'MNRE',
  completion_report: 'CR',
  request: 'Request',
  awaiting_credit: 'Credit',
}

export type DeliveryControlExportMeta = {
  opsLabel: string
  exportedBy: string
}

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** Helvetica has no rupee glyph — keep PDF amounts in ASCII. */
function formatInrPdf(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `Rs ${Math.round(n).toLocaleString('en-IN')}`
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

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'export'
  )
}

export function deliveryControlExportBasename(payload: DeliveryControlPayload, opsLabel: string): string {
  const day = (payload.generatedAt || new Date().toISOString()).slice(0, 10)
  return `delivery-control-FY${payload.currentFy}-${slug(opsLabel)}-${day}`
}

function boardCell(rowKey: string, n: number | null): string | number {
  if (n == null || !Number.isFinite(n)) return '—'
  if (rowKey === 'value') return n
  return n
}

export function deliveryControlExcelSheets(payload: DeliveryControlPayload, meta: DeliveryControlExportMeta) {
  const k = payload.kpis
  const clock = payload.subsidyClock
  const summary = [
    { Field: 'Report', Value: 'Delivery Control' },
    { Field: 'Financial year', Value: payload.currentFy },
    { Field: 'Ops filter', Value: meta.opsLabel },
    { Field: 'Generated', Value: payload.generatedAt },
    { Field: 'Exported by', Value: meta.exportedBy },
    { Field: 'In delivery jobs', Value: k.inDeliveryJobs },
    { Field: 'In delivery value', Value: k.inDeliveryValue },
    { Field: 'In delivery kW', Value: k.inDeliveryKw },
    { Field: 'Confirmed', Value: k.confirmedJobs },
    { Field: 'Under installation', Value: k.installingJobs },
    { Field: 'Submitted for subsidy', Value: k.subsidyJobs },
    { Field: 'Overdue', Value: k.overdueJobs },
    { Field: 'No commissioning date', Value: k.unscheduledJobs },
    { Field: 'Unassigned ops', Value: k.unassignedJobs },
    { Field: 'Process blockers', Value: k.blockedJobs },
    { Field: 'Subsidy on clock', Value: clock.kpis.onClockJobs },
    { Field: 'Subsidy awaiting credit', Value: clock.kpis.awaitingCreditJobs },
    { Field: 'Completed not credited', Value: clock.kpis.completedNotCreditedJobs },
    { Field: 'Subsidy 90+ days in step', Value: clock.kpis.stale90Jobs },
  ]

  const commissioning = payload.board.rows.map((row) => {
    const rec: Record<string, string | number> = { Metric: row.label }
    payload.board.columns.forEach((col, i) => {
      rec[col.shortLabel] = boardCell(row.key, row.values[i] ?? 0)
    })
    rec.Total = boardCell(row.key, row.total)
    return rec
  })

  const opsLoad = payload.opsLoad.map((r) => ({
    Ops: r.opsPersonName,
    Jobs: r.jobs,
    'Capacity kW': r.capacityKw,
    'Order value': r.orderValue,
    Overdue: r.overdue,
    Blocked: r.blocked,
  }))

  const jobs = payload.jobs.map((j) => ({
    '#': j.slNo ?? '',
    Customer: j.customerName,
    Stage: j.stage,
    Ops: j.opsPersonName || 'Unassigned',
    Seller: j.salespersonName || '',
    Type: j.customerTypeLabel,
    Segment: j.segmentLabel,
    'Capacity kW': j.capacityKw ?? '',
    'Commission date': j.commissionDate ?? '',
    Quarter: j.quarter ?? '',
    FY: j.fy ?? '',
    'Days late': j.daysLate ?? '',
    Overdue: j.pastDue ? 'Y' : 'N',
    Unscheduled: j.unscheduled ? 'Y' : 'N',
    Blockers: j.blockerLabels.join('; '),
    'Order value': j.orderValue,
  }))

  const subsidyFunnel = clock.rows.map((row) => {
    const rec: Record<string, string | number> = { Metric: row.label }
    clock.columns.forEach((col, i) => {
      rec[col.label] = row.values[i] ?? 0
    })
    rec.Total = row.total
    return rec
  })

  const subsidyJobs = clock.jobs.map((j) => ({
    '#': j.slNo ?? '',
    Customer: j.customerName,
    Stage: j.stage,
    Step: j.stepLabel,
    'Days in step': j.daysInStep ?? '',
    Ops: j.opsPersonName || 'Unassigned',
    Seller: j.salespersonName || '',
    'Capacity kW': j.capacityKw ?? '',
    'Request date': j.requestDate ?? '',
    Exceptions: j.exceptionLabels.join('; '),
    'Order value': j.orderValue,
  }))

  return { summary, commissioning, opsLoad, jobs, subsidyFunnel, subsidyJobs }
}

export function buildDeliveryControlExcelBuffer(
  payload: DeliveryControlPayload,
  meta: DeliveryControlExportMeta,
): Buffer {
  const sheets = deliveryControlExcelSheets(payload, meta)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.summary), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.commissioning), 'Commissioning')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.opsLoad), 'Ops load')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.jobs), 'Job list')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.subsidyFunnel), 'Subsidy clock')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheets.subsidyJobs), 'Subsidy jobs')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function buildDeliveryControlPdfBuffer(
  payload: DeliveryControlPayload,
  meta: DeliveryControlExportMeta,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 36
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin,
      info: { Title: `Delivery Control FY${payload.currentFy}`, Author: 'Rayenna CRM' },
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
        `Rayenna CRM · Delivery Control · FY${payload.currentFy} · ${meta.opsLabel} · Confidential`,
        margin,
        pageH - 22,
        { width: contentW, align: 'left' },
      )
    }

    doc.on('pageAdded', footer)

    doc.font('Helvetica-Bold').fontSize(18).fillColor(navy)
    textAt('Delivery Control', margin, margin, { width: contentW })
    doc.font('Helvetica').fontSize(10).fillColor(muted)
    textAt(`Weekly ops pack · FY${payload.currentFy} · ${meta.opsLabel}`, margin, margin + 24, {
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
      ['In delivery', `${formatInrPdf(k.inDeliveryValue)} · ${k.inDeliveryJobs} jobs`],
      ['Capacity', formatKw(k.inDeliveryKw)],
      ['Overdue', String(k.overdueJobs)],
      ['No date', String(k.unscheduledJobs)],
      ['Unassigned', String(k.unassignedJobs)],
      ['Blockers', String(k.blockedJobs)],
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
    const drawTable = (
      title: string,
      headers: string[],
      rows: string[][],
      weights: number[],
      rightAlign: boolean[],
    ) => {
      const colW = fitCols(weights)
      if (y > pageH - 88) {
        doc.addPage()
        y = margin
      }
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

    const boardHeaders = ['Metric', ...payload.board.columns.map((c) => c.shortLabel), 'Total']
    drawTable(
      'Commissioning board',
      boardHeaders,
      payload.board.rows.map((row) => [
        row.label,
        ...row.values.map((v) => (row.key === 'value' ? formatInrPdf(v) : String(v))),
        row.key === 'value' ? formatInrPdf(row.total) : String(row.total),
      ]),
      [160, ...payload.board.columns.map(() => 110), 110],
      boardHeaders.map((_, i) => i > 0),
    )

    drawTable(
      'Ops load',
      ['Ops', 'Jobs', 'kW', 'Value', 'Overdue', 'Blocked'],
      payload.opsLoad.map((r) => [
        r.opsPersonName,
        String(r.jobs),
        formatKw(r.capacityKw),
        formatInrPdf(r.orderValue),
        String(r.overdue),
        String(r.blocked),
      ]),
      [220, 70, 90, 130, 80, 80],
      [false, true, true, true, true, true],
    )

    footer()
    doc.addPage()
    y = margin
    const clock = payload.subsidyClock
    const ck = clock.kpis
    doc.font('Helvetica-Bold').fontSize(14).fillColor(navy)
    textAt('Subsidy clock', margin, y, { width: contentW })
    y += 20
    doc.font('Helvetica').fontSize(9).fillColor(muted)
    textAt(
      'Confirmed subsidy jobs until credit. Completed-not-credited stay on this clock.',
      margin,
      y,
      { width: contentW },
    )
    y += 18
    const clockKpis: [string, string][] = [
      ['On clock', `${formatInrPdf(ck.onClockValue)} · ${ck.onClockJobs} jobs`],
      ['Awaiting credit', `${ck.awaitingCreditJobs} · ${formatInrPdf(ck.awaitingCreditValue)}`],
      ['Completed, not credited', String(ck.completedNotCreditedJobs)],
      ['90+ days in step', String(ck.stale90Jobs)],
      ['Exceptions', String(ck.exceptionJobs)],
    ]
    let ckx = margin
    const ckW = contentW / 5 - 6
    clockKpis.forEach(([label, value]) => {
      doc.roundedRect(ckx, y, ckW, 40, 4).strokeColor('#e5e7eb').lineWidth(0.6).stroke()
      doc.font('Helvetica-Bold').fontSize(7).fillColor(gold)
      textAt(label.toUpperCase(), ckx + 6, y + 6, { width: ckW - 12 })
      doc.font('Helvetica-Bold').fontSize(9).fillColor(navy)
      textAt(value, ckx + 6, y + 20, { width: ckW - 12 })
      ckx += ckW + 7
    })
    y += 52

    const funnelHeaders = [
      'Metric',
      ...clock.columns.map((c) => SUBSIDY_CLOCK_PDF_HEADERS[c.key] || c.label),
      'Total',
    ]
    drawTable(
      'Subsidy funnel',
      funnelHeaders,
      clock.rows.map((row) => [
        row.label,
        ...row.values.map((v) =>
          row.key === 'value' ? formatInrPdf(v) : row.key === 'capacityKw' ? formatKw(v) : String(v),
        ),
        row.key === 'value'
          ? formatInrPdf(row.total)
          : row.key === 'capacityKw'
            ? formatKw(row.total)
            : String(row.total),
      ]),
      [110, ...clock.columns.map(() => 70), 70],
      funnelHeaders.map((_, i) => i > 0),
    )
    drawTable(
      `Subsidy jobs · ${ck.onClockJobs} on clock · ${ck.awaitingCreditJobs} awaiting credit`,
      ['Customer', 'Step', 'Days', 'Ops', 'Exceptions'],
      clock.jobs.map((j) => [
        `${j.slNo != null ? `#${j.slNo} ` : ''}${j.customerName}`,
        j.stepLabel,
        j.daysInStep != null ? `${j.daysInStep}d` : '—',
        j.opsPersonName || 'Unassigned',
        j.exceptionLabels[0] || '—',
      ]),
      [210, 130, 50, 120, 160],
      [false, false, true, false, false],
    )

    doc.addPage()
    y = margin
    drawTable(
      'Job list',
      ['Customer', 'Stage', 'Ops', 'kW', 'Date', 'Late', 'Blockers'],
      payload.jobs.map((j) => [
        `${j.slNo != null ? `#${j.slNo} ` : ''}${j.customerName}`,
        j.stage,
        j.opsPersonName || 'Unassigned',
        formatKw(j.capacityKw),
        formatCloseDate(j.commissionDate),
        j.pastDue && j.daysLate != null ? `+${j.daysLate}d` : '—',
        j.blockerLabels.slice(0, 2).join(', ') || '—',
      ]),
      [180, 110, 100, 60, 70, 50, 160],
      [false, false, false, true, true, true, false],
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

export async function buildDeliveryControlPptxBuffer(
  payload: DeliveryControlPayload,
  meta: DeliveryControlExportMeta,
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Delivery Control FY${payload.currentFy}`
  pptx.author = 'Rayenna CRM'
  pptx.company = 'Rayenna Energy Private Limited'
  pptx.subject = `Weekly delivery pack · ${meta.opsLabel}`

  const k = payload.kpis
  const title = pptx.addSlide()
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: NAVY } })
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } })
  title.addText('DELIVERY CONTROL', {
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
  title.addText(`${meta.opsLabel}  ·  Weekly ops pack`, {
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
  kpiSlide.addText('Ops snapshot', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  const kpiItems: [string, string][] = [
    ['In delivery', formatInr(k.inDeliveryValue)],
    ['Jobs / kW', `${k.inDeliveryJobs} · ${formatKw(k.inDeliveryKw)}`],
    ['Confirmed / install / subsidy', `${k.confirmedJobs} / ${k.installingJobs} / ${k.subsidyJobs}`],
    ['Overdue', String(k.overdueJobs)],
    ['No date / unassigned', `${k.unscheduledJobs} / ${k.unassignedJobs}`],
    ['Process blockers', String(k.blockedJobs)],
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

  const board = pptx.addSlide()
  board.addText('Commissioning board', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  board.addTable(
    pptTable(
      ['Metric', ...payload.board.columns.map((c) => c.shortLabel), 'Total'],
      payload.board.rows.map((row) => [
        row.label,
        ...row.values.map((v) => (row.key === 'value' ? formatInr(v) : String(v))),
        row.key === 'value' ? formatInr(row.total) : String(row.total),
      ]),
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [2.4, ...payload.board.columns.map(() => 8.6 / (payload.board.columns.length + 1)), 8.6 / (payload.board.columns.length + 1)],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const load = pptx.addSlide()
  load.addText('Ops load', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  load.addTable(
    pptTable(
      ['Ops', 'Jobs', 'kW', 'Value', 'Overdue', 'Blocked'],
      payload.opsLoad.map((r) => [
        r.opsPersonName,
        String(r.jobs),
        formatKw(r.capacityKw),
        formatInr(r.orderValue),
        String(r.overdue),
        String(r.blocked),
      ]),
      { alignRightFrom: 1 },
    ),
    {
      x: 0.4,
      y: 0.85,
      w: 12.5,
      colW: [3.5, 1.4, 1.8, 2.4, 1.7, 1.7],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const clock = payload.subsidyClock
  const subsidy = pptx.addSlide()
  subsidy.addText('Subsidy clock', { x: 0.4, y: 0.25, fontSize: 18, bold: true, color: NAVY, fontFace: 'Arial' })
  subsidy.addText(
    `${clock.kpis.onClockJobs} on clock · ${clock.kpis.awaitingCreditJobs} awaiting credit · ${clock.kpis.completedNotCreditedJobs} completed not credited · ${clock.kpis.stale90Jobs} 90+ days`,
    { x: 0.4, y: 0.62, w: 12.5, fontSize: 11, color: '6B7280', fontFace: 'Arial' },
  )
  subsidy.addTable(
    pptTable(
      ['Metric', ...clock.columns.map((c) => SUBSIDY_CLOCK_PDF_HEADERS[c.key] || c.label), 'Total'],
      clock.rows.map((row) => [
        row.label,
        ...row.values.map((v) =>
          row.key === 'value' ? formatInr(v) : row.key === 'capacityKw' ? formatKw(v) : String(v),
        ),
        row.key === 'value' ? formatInr(row.total) : row.key === 'capacityKw' ? formatKw(row.total) : String(row.total),
      ]),
    ),
    {
      x: 0.25,
      y: 1.05,
      w: 12.8,
      colW: [1.6, ...clock.columns.map(() => 11.2 / (clock.columns.length + 1)), 11.2 / (clock.columns.length + 1)],
      border: { pt: 0.5, color: 'E5E7EB' },
    },
  )

  const clockChunks: SubsidyClockJob[][] = []
  const clockPer = 12
  for (let i = 0; i < clock.jobs.length; i += clockPer) clockChunks.push(clock.jobs.slice(i, i + clockPer))
  if (clockChunks.length === 0) clockChunks.push([])
  clockChunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(
      clockChunks.length > 1 ? `Subsidy jobs (${idx + 1}/${clockChunks.length})` : 'Subsidy jobs',
      { x: 0.35, y: 0.2, fontSize: 16, bold: true, color: NAVY, fontFace: 'Arial' },
    )
    const rows = chunk.map((j) => [
      j.slNo != null ? String(j.slNo) : '',
      j.customerName,
      j.stepLabel,
      j.daysInStep != null ? `${j.daysInStep}d` : '—',
      j.opsPersonName || 'Unassigned',
      j.exceptionLabels[0] || '—',
      formatInr(j.orderValue),
    ])
    slide.addTable(
      pptTable(['#', 'Customer', 'Step', 'Days', 'Ops', 'Exception', 'Value'], rows, { alignRightFrom: 6 }),
      {
        x: 0.3,
        y: 0.7,
        w: 12.7,
        colW: [0.6, 2.8, 2.1, 0.9, 1.8, 2.4, 2.1],
        border: { pt: 0.4, color: 'E5E7EB' },
        fontFace: 'Arial',
      },
    )
  })

  const perSlide = 12
  const chunks: DeliveryJob[][] = []
  for (let i = 0; i < payload.jobs.length; i += perSlide) chunks.push(payload.jobs.slice(i, i + perSlide))
  if (chunks.length === 0) chunks.push([])
  chunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide()
    slide.addText(chunks.length > 1 ? `Jobs (${idx + 1}/${chunks.length})` : 'Jobs', {
      x: 0.35,
      y: 0.2,
      fontSize: 16,
      bold: true,
      color: NAVY,
      fontFace: 'Arial',
    })
    const rows = chunk.map((j) => [
      j.slNo != null ? String(j.slNo) : '',
      j.customerName,
      j.stage,
      j.opsPersonName || 'Unassigned',
      formatCloseDate(j.commissionDate),
      j.blockerLabels[0] ? DELIVERY_BLOCKER_LABELS[j.blockers[0]] || j.blockers[0] : '—',
      formatInr(j.orderValue),
    ])
    slide.addTable(pptTable(['#', 'Customer', 'Stage', 'Ops', 'Date', 'Blocker', 'Value'], rows, { alignRightFrom: 6 }), {
      x: 0.3,
      y: 0.7,
      w: 12.7,
      colW: [0.6, 3.0, 2.0, 1.8, 1.2, 2.2, 1.9],
      border: { pt: 0.4, color: 'E5E7EB' },
      fontFace: 'Arial',
    })
  })

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array)
}

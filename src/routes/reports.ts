import express, { Request, Response } from 'express'
import { UserRole, Prisma, ProjectStatus, ProjectType } from '@prisma/client'
import prisma from '../prisma'
import { authenticate, authorize } from '../middleware/auth'
import { buildSalesReview, type SalesReviewPayload, type SalesReviewProjectInput } from '../utils/salesReview'
import {
  buildSalesReviewExcelBuffer,
  buildSalesReviewPdfBuffer,
  buildSalesReviewPptxBuffer,
  salesReviewExportBasename,
} from '../utils/salesReviewExport'
import {
  buildDeliveryControl,
  DELIVERY_CONTROL_STATUSES,
  type DeliveryControlPayload,
  type DeliveryControlProjectInput,
} from '../utils/deliveryControl'
import {
  buildDeliveryControlExcelBuffer,
  buildDeliveryControlPdfBuffer,
  buildDeliveryControlPptxBuffer,
  deliveryControlExportBasename,
} from '../utils/deliveryControlExport'
import {
  buildCollectionsCash,
  COLLECTIONS_STATUSES,
  type CollectionsCashPayload,
  type CollectionsProjectInput,
} from '../utils/collectionsCash'
import {
  buildCollectionsCashExcelBuffer,
  buildCollectionsCashPdfBuffer,
  buildCollectionsCashPptxBuffer,
  collectionsCashExportBasename,
} from '../utils/collectionsCashExport'
import {
  buildFunnelVelocity,
  type FunnelVelocityPayload,
  type FunnelVelocityProjectInput,
} from '../utils/funnelVelocity'
import {
  buildFunnelVelocityExcelBuffer,
  buildFunnelVelocityPdfBuffer,
  buildFunnelVelocityPptxBuffer,
  funnelVelocityExportBasename,
} from '../utils/funnelVelocityExport'
import {
  buildMarginMix,
  MARGIN_MIX_STATUSES,
  type MarginMixPayload,
  type MarginMixProjectInput,
} from '../utils/marginMix'
import {
  buildMarginMixExcelBuffer,
  buildMarginMixPdfBuffer,
  buildMarginMixPptxBuffer,
  marginMixExportBasename,
} from '../utils/marginMixExport'

const router = express.Router()

export const REPORTS_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGEMENT,
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
]
export const SALES_REVIEW_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES]
export const DELIVERY_CONTROL_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGEMENT,
  UserRole.SALES,
  UserRole.OPERATIONS,
]
export const COLLECTIONS_CASH_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGEMENT,
  UserRole.FINANCE,
  UserRole.SALES,
]
export const FUNNEL_VELOCITY_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES]
export const MARGIN_MIX_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.FINANCE]

const DELIVERY_STATUSES = DELIVERY_CONTROL_STATUSES as unknown as ProjectStatus[]

const EXPORT_MIME: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

async function loadSalesReview(req: Request): Promise<{
  payload: SalesReviewPayload
  sellerLabel: string
  exportedBy: string
}> {
  const role = req.user!.role as UserRole
  const userId = req.user!.id
  const requestedSalesperson =
    typeof req.query.salespersonId === 'string' ? req.query.salespersonId.trim() : ''

  const where: Prisma.ProjectWhereInput = {}
  if (role === UserRole.SALES) {
    where.salespersonId = userId
  } else if (requestedSalesperson) {
    where.salespersonId = requestedSalesperson
  }

  const rows = await prisma.project.findMany({
    where,
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      year: true,
      projectCost: true,
      grossProfit: true,
      expectedProfit: true,
      profitability: true,
      salesProbability: true,
      systemCapacity: true,
      systemType: true,
      type: true,
      confirmationDate: true,
      expectedCommissioningDate: true,
      availingLoan: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
      customer: { select: { customerName: true, customerType: true } },
    },
  })

  const projects: SalesReviewProjectInput[] = rows.map((r) => ({
    id: r.id,
    slNo: r.slNo,
    projectStatus: r.projectStatus,
    year: r.year,
    projectCost: r.projectCost,
    grossProfit: r.grossProfit,
    expectedProfit: r.expectedProfit,
    profitability: r.profitability,
    salesProbability: r.salesProbability,
    systemCapacity: r.systemCapacity,
    systemType: r.systemType,
    type: r.type,
    confirmationDate: r.confirmationDate,
    expectedCommissioningDate: r.expectedCommissioningDate,
    availingLoan: r.availingLoan,
    salespersonId: r.salespersonId,
    salespersonName: r.salesperson?.name ?? null,
    customerName: r.customer?.customerName ?? null,
    customerType: r.customer?.customerType ?? null,
  }))

  const payload = buildSalesReview(projects)
  payload.salespersonId = role === UserRole.SALES ? userId : requestedSalesperson || null

  let sellerLabel = 'All sellers'
  if (payload.salespersonId) {
    const seller = await prisma.user.findUnique({
      where: { id: payload.salespersonId },
      select: { name: true, email: true },
    })
    sellerLabel = seller?.name?.trim() || seller?.email || 'Seller'
  }

  return { payload, sellerLabel, exportedBy: req.user!.email }
}

router.get(
  '/sales-review',
  authenticate,
  authorize(...SALES_REVIEW_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadSalesReview(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Sales Review'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/sales-review/export/:format',
  authenticate,
  authorize(...SALES_REVIEW_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadSalesReview(req)
      const meta = { sellerLabel, exportedBy }
      const basename = salesReviewExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildSalesReviewExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildSalesReviewPdfBuffer(payload, meta)
      else buffer = await buildSalesReviewPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Sales Review'
      console.error('Sales Review export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

async function loadDeliveryControl(req: Request): Promise<{
  payload: DeliveryControlPayload
  opsLabel: string
  exportedBy: string
}> {
  const role = req.user!.role as UserRole
  const userId = req.user!.id
  const requestedOps = typeof req.query.opsPersonId === 'string' ? req.query.opsPersonId.trim() : ''

  const scope: Prisma.ProjectWhereInput = {}
  if (role === UserRole.SALES) {
    scope.salespersonId = userId
  } else if (requestedOps === 'unassigned') {
    scope.assignedOpsId = null
  } else if (requestedOps) {
    scope.assignedOpsId = requestedOps
  }

  const where: Prisma.ProjectWhereInput = {
    AND: [
      {
        OR: [
          { projectStatus: { in: DELIVERY_STATUSES } },
          {
            projectStatus: ProjectStatus.COMPLETED,
            type: ProjectType.SUBSIDY,
            subsidyCreditedDate: null,
          },
        ],
      },
      scope,
    ],
  }

  const rows = await prisma.project.findMany({
    where,
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      year: true,
      projectCost: true,
      systemCapacity: true,
      systemType: true,
      type: true,
      confirmationDate: true,
      expectedCommissioningDate: true,
      stageEnteredAt: true,
      feasibilityDate: true,
      registrationDate: true,
      mnrePortalRegistrationDate: true,
      installationCompletionDate: true,
      completionReportSubmissionDate: true,
      subsidyRequestDate: true,
      subsidyCreditedDate: true,
      incentiveEligible: true,
      assignedOpsId: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
      opsPerson: { select: { name: true } },
      customer: { select: { customerName: true, customerType: true } },
      documents: { select: { category: true } },
    },
  })

  const projects: DeliveryControlProjectInput[] = rows.map((r) => ({
    id: r.id,
    slNo: r.slNo,
    projectStatus: r.projectStatus,
    year: r.year,
    projectCost: r.projectCost,
    systemCapacity: r.systemCapacity,
    systemType: r.systemType,
    type: r.type,
    confirmationDate: r.confirmationDate,
    expectedCommissioningDate: r.expectedCommissioningDate,
    stageEnteredAt: r.stageEnteredAt,
    feasibilityDate: r.feasibilityDate,
    registrationDate: r.registrationDate,
    mnrePortalRegistrationDate: r.mnrePortalRegistrationDate,
    installationCompletionDate: r.installationCompletionDate,
    completionReportSubmissionDate: r.completionReportSubmissionDate,
    subsidyRequestDate: r.subsidyRequestDate,
    subsidyCreditedDate: r.subsidyCreditedDate,
    incentiveEligible: r.incentiveEligible,
    assignedOpsId: r.assignedOpsId,
    opsPersonName: r.opsPerson?.name ?? null,
    salespersonId: r.salespersonId,
    salespersonName: r.salesperson?.name ?? null,
    customerName: r.customer?.customerName ?? null,
    customerType: r.customer?.customerType ?? null,
    documentCategories: r.documents.map((d) => d.category),
  }))

  const payload = buildDeliveryControl(projects)
  payload.opsPersonId = role === UserRole.SALES ? null : requestedOps || null

  let opsLabel = 'All ops'
  if (payload.opsPersonId === 'unassigned') opsLabel = 'Unassigned'
  else if (payload.opsPersonId) {
    const ops = await prisma.user.findUnique({
      where: { id: payload.opsPersonId },
      select: { name: true, email: true },
    })
    opsLabel = ops?.name?.trim() || ops?.email || 'Ops'
  }
  if (role === UserRole.SALES) opsLabel = 'My jobs'

  return { payload, opsLabel, exportedBy: req.user!.email }
}

router.get(
  '/delivery-control',
  authenticate,
  authorize(...DELIVERY_CONTROL_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadDeliveryControl(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Delivery Control'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/delivery-control/export/:format',
  authenticate,
  authorize(...DELIVERY_CONTROL_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, opsLabel, exportedBy } = await loadDeliveryControl(req)
      const meta = { opsLabel, exportedBy }
      const basename = deliveryControlExportBasename(payload, opsLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildDeliveryControlExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildDeliveryControlPdfBuffer(payload, meta)
      else buffer = await buildDeliveryControlPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Delivery Control'
      console.error('Delivery Control export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

async function loadCollectionsCash(req: Request): Promise<{
  payload: CollectionsCashPayload
  sellerLabel: string
  exportedBy: string
}> {
  const role = req.user!.role as UserRole
  const userId = req.user!.id
  const requestedSalesperson =
    typeof req.query.salespersonId === 'string' ? req.query.salespersonId.trim() : ''

  const where: Prisma.ProjectWhereInput = {
    projectStatus: { in: COLLECTIONS_STATUSES as unknown as ProjectStatus[] },
    OR: [
      { balanceAmount: { gt: 0 } },
      {
        type: ProjectType.SUBSIDY,
        subsidyCreditedDate: null,
        projectStatus: { not: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
        OR: [
          { subsidyRequestDate: { not: null } },
          { projectStatus: { in: [ProjectStatus.SUBMITTED_FOR_SUBSIDY, ProjectStatus.COMPLETED] } },
        ],
      },
    ],
  }
  if (role === UserRole.SALES) {
    where.salespersonId = userId
  } else if (requestedSalesperson) {
    where.salespersonId = requestedSalesperson
  }

  const rows = await prisma.project.findMany({
    where,
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      year: true,
      type: true,
      projectCost: true,
      balanceAmount: true,
      totalAmountReceived: true,
      paymentStatus: true,
      confirmationDate: true,
      lastPaymentDate: true,
      availingLoan: true,
      financingBank: true,
      financingBankOther: true,
      subsidyRequestDate: true,
      subsidyCreditedDate: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
      customer: { select: { customerName: true, customerType: true } },
    },
  })

  const projects: CollectionsProjectInput[] = rows.map((r) => ({
    id: r.id,
    slNo: r.slNo,
    projectStatus: r.projectStatus,
    year: r.year,
    type: r.type,
    projectCost: r.projectCost,
    balanceAmount: r.balanceAmount,
    totalAmountReceived: r.totalAmountReceived,
    paymentStatus: r.paymentStatus,
    confirmationDate: r.confirmationDate,
    lastPaymentDate: r.lastPaymentDate,
    availingLoan: r.availingLoan,
    financingBank: r.financingBank,
    financingBankOther: r.financingBankOther,
    subsidyRequestDate: r.subsidyRequestDate,
    subsidyCreditedDate: r.subsidyCreditedDate,
    salespersonId: r.salespersonId,
    salespersonName: r.salesperson?.name ?? null,
    customerName: r.customer?.customerName ?? null,
    customerType: r.customer?.customerType ?? null,
  }))

  const payload = buildCollectionsCash(projects)
  payload.salespersonId = role === UserRole.SALES ? userId : requestedSalesperson || null

  let sellerLabel = 'All sellers'
  if (payload.salespersonId) {
    const seller = await prisma.user.findUnique({
      where: { id: payload.salespersonId },
      select: { name: true, email: true },
    })
    sellerLabel = seller?.name?.trim() || seller?.email || 'Seller'
  }

  return { payload, sellerLabel, exportedBy: req.user!.email }
}

router.get(
  '/collections-cash',
  authenticate,
  authorize(...COLLECTIONS_CASH_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadCollectionsCash(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Collections & Cash'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/collections-cash/export/:format',
  authenticate,
  authorize(...COLLECTIONS_CASH_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadCollectionsCash(req)
      const meta = { sellerLabel, exportedBy }
      const basename = collectionsCashExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildCollectionsCashExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildCollectionsCashPdfBuffer(payload, meta)
      else buffer = await buildCollectionsCashPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Collections & Cash'
      console.error('Collections & Cash export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

async function loadFunnelVelocity(req: Request): Promise<{
  payload: FunnelVelocityPayload
  sellerLabel: string
  exportedBy: string
}> {
  const role = req.user!.role as UserRole
  const userId = req.user!.id
  const requestedSalesperson =
    typeof req.query.salespersonId === 'string' ? req.query.salespersonId.trim() : ''

  const where: Prisma.ProjectWhereInput = {}
  if (role === UserRole.SALES) {
    where.salespersonId = userId
  } else if (requestedSalesperson) {
    where.salespersonId = requestedSalesperson
  }

  const rows = await prisma.project.findMany({
    where,
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      year: true,
      projectCost: true,
      salesProbability: true,
      systemCapacity: true,
      systemType: true,
      type: true,
      confirmationDate: true,
      expectedCommissioningDate: true,
      stageEnteredAt: true,
      createdAt: true,
      lostDate: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
      customer: { select: { customerName: true, customerType: true } },
    },
  })

  const projects: FunnelVelocityProjectInput[] = rows.map((r) => ({
    id: r.id,
    slNo: r.slNo,
    projectStatus: r.projectStatus,
    year: r.year,
    projectCost: r.projectCost,
    salesProbability: r.salesProbability,
    systemCapacity: r.systemCapacity,
    systemType: r.systemType,
    type: r.type,
    confirmationDate: r.confirmationDate,
    expectedCommissioningDate: r.expectedCommissioningDate,
    stageEnteredAt: r.stageEnteredAt,
    createdAt: r.createdAt,
    lostDate: r.lostDate,
    salespersonId: r.salespersonId,
    salespersonName: r.salesperson?.name ?? null,
    customerName: r.customer?.customerName ?? null,
    customerType: r.customer?.customerType ?? null,
  }))

  const payload = buildFunnelVelocity(projects)
  payload.salespersonId = role === UserRole.SALES ? userId : requestedSalesperson || null

  let sellerLabel = 'All sellers'
  if (payload.salespersonId) {
    const seller = await prisma.user.findUnique({
      where: { id: payload.salespersonId },
      select: { name: true, email: true },
    })
    sellerLabel = seller?.name?.trim() || seller?.email || 'Seller'
  }

  return { payload, sellerLabel, exportedBy: req.user!.email }
}

router.get(
  '/funnel-velocity',
  authenticate,
  authorize(...FUNNEL_VELOCITY_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadFunnelVelocity(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Funnel Velocity'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/funnel-velocity/export/:format',
  authenticate,
  authorize(...FUNNEL_VELOCITY_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadFunnelVelocity(req)
      const meta = { sellerLabel, exportedBy }
      const basename = funnelVelocityExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildFunnelVelocityExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildFunnelVelocityPdfBuffer(payload, meta)
      else buffer = await buildFunnelVelocityPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Funnel Velocity'
      console.error('Funnel Velocity export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

async function loadMarginMix(req: Request): Promise<{
  payload: MarginMixPayload
  sellerLabel: string
  exportedBy: string
}> {
  const role = req.user!.role as UserRole
  const userId = req.user!.id
  const requestedSalesperson =
    typeof req.query.salespersonId === 'string' ? req.query.salespersonId.trim() : ''

  const where: Prisma.ProjectWhereInput = {
    projectStatus: { in: MARGIN_MIX_STATUSES as unknown as ProjectStatus[] },
  }
  if (role === UserRole.SALES) {
    where.salespersonId = userId
  } else if (requestedSalesperson) {
    where.salespersonId = requestedSalesperson
  }

  const rows = await prisma.project.findMany({
    where,
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      year: true,
      projectCost: true,
      totalProjectCost: true,
      grossProfit: true,
      expectedProfit: true,
      profitability: true,
      systemCapacity: true,
      systemType: true,
      type: true,
      confirmationDate: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
      customer: { select: { customerName: true, customerType: true } },
      peCostingSheets: {
        orderBy: { savedAt: 'desc' },
        take: 1,
        select: { grandTotal: true },
      },
    },
  })

  const projects: MarginMixProjectInput[] = rows.map((r) => ({
    id: r.id,
    slNo: r.slNo,
    projectStatus: r.projectStatus,
    year: r.year,
    projectCost: r.projectCost,
    totalProjectCost: r.totalProjectCost,
    grossProfit: r.grossProfit,
    expectedProfit: r.expectedProfit,
    profitability: r.profitability,
    systemCapacity: r.systemCapacity,
    systemType: r.systemType,
    type: r.type,
    confirmationDate: r.confirmationDate,
    peCostingTotal: r.peCostingSheets[0]?.grandTotal ?? null,
    salespersonId: r.salespersonId,
    salespersonName: r.salesperson?.name ?? null,
    customerName: r.customer?.customerName ?? null,
    customerType: r.customer?.customerType ?? null,
  }))

  const requestedFy = typeof req.query.fy === 'string' ? req.query.fy.trim() : ''
  const requestedQuarter = typeof req.query.quarter === 'string' ? req.query.quarter.trim() : ''
  const payload = buildMarginMix(projects, new Date(), {
    fy: requestedFy || null,
    quarter: requestedQuarter || null,
  })
  payload.salespersonId = role === UserRole.SALES ? userId : requestedSalesperson || null

  let sellerLabel = 'All sellers'
  if (payload.salespersonId) {
    const seller = await prisma.user.findUnique({
      where: { id: payload.salespersonId },
      select: { name: true, email: true },
    })
    sellerLabel = seller?.name?.trim() || seller?.email || 'Seller'
  }

  return { payload, sellerLabel, exportedBy: req.user!.email }
}

router.get(
  '/margin-mix',
  authenticate,
  authorize(...MARGIN_MIX_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { payload } = await loadMarginMix(req)
      res.json(payload)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load Margin & Mix'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/margin-mix/export/:format',
  authenticate,
  authorize(...MARGIN_MIX_ROLES),
  async (req: Request, res: Response) => {
    const format = String(req.params.format || '').toLowerCase()
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'pptx') {
      return res.status(400).json({ error: 'Format must be xlsx, pdf, or pptx' })
    }
    try {
      const { payload, sellerLabel, exportedBy } = await loadMarginMix(req)
      const meta = { sellerLabel, exportedBy }
      const basename = marginMixExportBasename(payload, sellerLabel)
      let buffer: Buffer
      if (format === 'xlsx') buffer = buildMarginMixExcelBuffer(payload, meta)
      else if (format === 'pdf') buffer = await buildMarginMixPdfBuffer(payload, meta)
      else buffer = await buildMarginMixPptxBuffer(payload, meta)

      res.setHeader('Content-Type', EXPORT_MIME[format])
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.${format}"`)
      res.send(buffer)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to export Margin & Mix'
      console.error('Margin & Mix export failed:', error)
      res.status(500).json({ error: message })
    }
  },
)

export default router

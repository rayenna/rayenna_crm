/**
 * Shared loaders for weekly Reports packs. Used by /api/reports and Ask Zenith
 * so both surfaces run the same Prisma selects + build* math.
 */
import { Prisma, ProjectStatus, ProjectType, UserRole } from '@prisma/client'
import prisma from '../prisma'
import { buildSalesReview, type SalesReviewPayload, type SalesReviewProjectInput } from './salesReview'
import {
  buildDeliveryControl,
  DELIVERY_CONTROL_STATUSES,
  type DeliveryControlPayload,
  type DeliveryControlProjectInput,
} from './deliveryControl'
import {
  buildCollectionsCash,
  COLLECTIONS_STATUSES,
  type CollectionsCashPayload,
  type CollectionsProjectInput,
} from './collectionsCash'
import { buildFunnelVelocity, type FunnelVelocityPayload, type FunnelVelocityProjectInput } from './funnelVelocity'
import {
  buildMarginMix,
  MARGIN_MIX_STATUSES,
  type MarginMixPayload,
  type MarginMixProjectInput,
} from './marginMix'

export type ReportPackScope = {
  role: UserRole
  userId: string
  /** Empty = all sellers (non-Sales). Sales always own book. */
  salespersonId?: string
  /** Delivery Control ops picker. `unassigned` is allowed. */
  opsPersonId?: string
  fy?: string
  quarter?: string
  exportedBy: string
}

const DELIVERY_STATUSES = DELIVERY_CONTROL_STATUSES as unknown as ProjectStatus[]

async function sellerLabelFor(id: string | null): Promise<string> {
  if (!id) return 'All sellers'
  const seller = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true },
  })
  return seller?.name?.trim() || seller?.email || 'Seller'
}

function salesWhere(scope: ReportPackScope): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {}
  if (scope.role === UserRole.SALES) where.salespersonId = scope.userId
  else if (scope.salespersonId) where.salespersonId = scope.salespersonId
  return where
}

export async function loadSalesReviewPack(scope: ReportPackScope): Promise<{
  payload: SalesReviewPayload
  sellerLabel: string
  exportedBy: string
}> {
  const rows = await prisma.project.findMany({
    where: salesWhere(scope),
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
  payload.salespersonId = scope.role === UserRole.SALES ? scope.userId : scope.salespersonId || null
  return {
    payload,
    sellerLabel: await sellerLabelFor(payload.salespersonId),
    exportedBy: scope.exportedBy,
  }
}

export async function loadDeliveryControlPack(scope: ReportPackScope): Promise<{
  payload: DeliveryControlPayload
  opsLabel: string
  exportedBy: string
}> {
  const requestedOps = scope.opsPersonId?.trim() || ''
  const book: Prisma.ProjectWhereInput = {}
  if (scope.role === UserRole.SALES) book.salespersonId = scope.userId
  else if (requestedOps === 'unassigned') book.assignedOpsId = null
  else if (requestedOps) book.assignedOpsId = requestedOps

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
      book,
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
  payload.opsPersonId = scope.role === UserRole.SALES ? null : requestedOps || null

  let opsLabel = 'All ops'
  if (payload.opsPersonId === 'unassigned') opsLabel = 'Unassigned'
  else if (payload.opsPersonId) {
    const ops = await prisma.user.findUnique({
      where: { id: payload.opsPersonId },
      select: { name: true, email: true },
    })
    opsLabel = ops?.name?.trim() || ops?.email || 'Ops'
  }
  if (scope.role === UserRole.SALES) opsLabel = 'My jobs'

  return { payload, opsLabel, exportedBy: scope.exportedBy }
}

export async function loadCollectionsCashPack(scope: ReportPackScope): Promise<{
  payload: CollectionsCashPayload
  sellerLabel: string
  exportedBy: string
}> {
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
  if (scope.role === UserRole.SALES) where.salespersonId = scope.userId
  else if (scope.salespersonId) where.salespersonId = scope.salespersonId

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
  payload.salespersonId = scope.role === UserRole.SALES ? scope.userId : scope.salespersonId || null
  return {
    payload,
    sellerLabel: await sellerLabelFor(payload.salespersonId),
    exportedBy: scope.exportedBy,
  }
}

export async function loadFunnelVelocityPack(scope: ReportPackScope): Promise<{
  payload: FunnelVelocityPayload
  sellerLabel: string
  exportedBy: string
}> {
  const rows = await prisma.project.findMany({
    where: salesWhere(scope),
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
  payload.salespersonId = scope.role === UserRole.SALES ? scope.userId : scope.salespersonId || null
  return {
    payload,
    sellerLabel: await sellerLabelFor(payload.salespersonId),
    exportedBy: scope.exportedBy,
  }
}

export async function loadMarginMixPack(scope: ReportPackScope): Promise<{
  payload: MarginMixPayload
  sellerLabel: string
  exportedBy: string
}> {
  const where: Prisma.ProjectWhereInput = {
    projectStatus: { in: MARGIN_MIX_STATUSES as unknown as ProjectStatus[] },
  }
  if (scope.role === UserRole.SALES) where.salespersonId = scope.userId
  else if (scope.salespersonId) where.salespersonId = scope.salespersonId

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

  const payload = buildMarginMix(projects, new Date(), {
    fy: scope.fy || null,
    quarter: scope.quarter || null,
  })
  payload.salespersonId = scope.role === UserRole.SALES ? scope.userId : scope.salespersonId || null
  return {
    payload,
    sellerLabel: await sellerLabelFor(payload.salespersonId),
    exportedBy: scope.exportedBy,
  }
}

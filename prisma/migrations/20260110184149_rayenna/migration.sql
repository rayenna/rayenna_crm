-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES', 'OPERATIONS', 'FINANCE', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('RESIDENTIAL_SUBSIDY', 'RESIDENTIAL_NON_SUBSIDY', 'COMMERCIAL_INDUSTRIAL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('LEAD', 'CONFIRMED', 'UNDER_INSTALLATION', 'SUBMITTED_FOR_SUBSIDY', 'COMPLETED', 'COMPLETED_SUBSIDY_CREDITED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'FULLY_PAID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slNo" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT,
    "contactNumbers" TEXT,
    "consumerNumber" TEXT,
    "type" "ProjectType" NOT NULL,
    "leadSource" TEXT,
    "leadBroughtBy" TEXT,
    "salespersonId" TEXT,
    "year" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "systemCapacity" DOUBLE PRECISION,
    "projectCost" DOUBLE PRECISION,
    "confirmationDate" TIMESTAMP(3),
    "loanDetails" TEXT,
    "incentiveEligible" BOOLEAN NOT NULL DEFAULT false,
    "expectedProfit" DOUBLE PRECISION,
    "finalProfit" DOUBLE PRECISION,
    "mnrePortalRegistrationDate" TIMESTAMP(3),
    "feasibilityDate" TIMESTAMP(3),
    "registrationDate" TIMESTAMP(3),
    "installationCompletionDate" TIMESTAMP(3),
    "mnreInstallationDetails" TEXT,
    "subsidyRequestDate" TIMESTAMP(3),
    "subsidyCreditedDate" TIMESTAMP(3),
    "projectStatus" "ProjectStatus" NOT NULL DEFAULT 'LEAD',
    "advanceReceived" DOUBLE PRECISION DEFAULT 0,
    "advanceReceivedDate" TIMESTAMP(3),
    "payment1" DOUBLE PRECISION DEFAULT 0,
    "payment1Date" TIMESTAMP(3),
    "payment2" DOUBLE PRECISION DEFAULT 0,
    "payment2Date" TIMESTAMP(3),
    "payment3" DOUBLE PRECISION DEFAULT 0,
    "payment3Date" TIMESTAMP(3),
    "lastPayment" DOUBLE PRECISION DEFAULT 0,
    "lastPaymentDate" TIMESTAMP(3),
    "totalAmountReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slNo_key" ON "projects"("slNo");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rayenna Solar Hub — additive consumer tables only (no changes to existing CRM tables)

-- CreateEnum
CREATE TYPE "ConsumerMemberTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "ConsumerAchievementType" AS ENUM ('EARLY_ADOPTER', 'ONE_YEAR_SOLAR', 'REFERRAL_CHAMPION');

-- CreateEnum
CREATE TYPE "ConsumerMaintenanceRequestType" AS ENUM ('SCHEDULE_SERVICE', 'REPORT_ISSUE');

-- CreateEnum
CREATE TYPE "ConsumerMaintenanceRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceScheduleStatus" AS ENUM ('DUE', 'COMPLETED', 'OVERDUE');

-- CreateTable
CREATE TABLE "consumer_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "projectId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "memberTier" "ConsumerMemberTier" NOT NULL DEFAULT 'BRONZE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_energy_readings" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConsumed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gridExport" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyReadings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_energy_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_notifications" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_maintenance_requests" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "requestType" "ConsumerMaintenanceRequestType" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "preferredDate" DATE,
    "status" "ConsumerMaintenanceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_achievements" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "type" "ConsumerAchievementType" NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_warranty_items" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "componentKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specification" TEXT,
    "totalYears" DOUBLE PRECISION NOT NULL,
    "yearsRemaining" DOUBLE PRECISION NOT NULL,
    "expiryDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_warranty_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_maintenance_schedule_items" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "MaintenanceScheduleStatus" NOT NULL DEFAULT 'DUE',
    "dueDate" DATE,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_maintenance_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consumer_users_email_key" ON "consumer_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_users_projectId_key" ON "consumer_users"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_users_referralCode_key" ON "consumer_users"("referralCode");

-- CreateIndex
CREATE INDEX "consumer_users_projectId_idx" ON "consumer_users"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_energy_readings_consumerUserId_year_month_key" ON "consumer_energy_readings"("consumerUserId", "year", "month");

-- CreateIndex
CREATE INDEX "consumer_energy_readings_consumerUserId_year_idx" ON "consumer_energy_readings"("consumerUserId", "year");

-- CreateIndex
CREATE INDEX "consumer_notifications_consumerUserId_isRead_idx" ON "consumer_notifications"("consumerUserId", "isRead");

-- CreateIndex
CREATE INDEX "consumer_notifications_consumerUserId_createdAt_idx" ON "consumer_notifications"("consumerUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "consumer_maintenance_requests_consumerUserId_idx" ON "consumer_maintenance_requests"("consumerUserId");

-- CreateIndex
CREATE INDEX "consumer_maintenance_requests_status_idx" ON "consumer_maintenance_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_achievements_consumerUserId_type_key" ON "consumer_achievements"("consumerUserId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_warranty_items_consumerUserId_componentKey_key" ON "consumer_warranty_items"("consumerUserId", "componentKey");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_maintenance_schedule_items_consumerUserId_taskKey_key" ON "consumer_maintenance_schedule_items"("consumerUserId", "taskKey");

-- AddForeignKey
ALTER TABLE "consumer_users" ADD CONSTRAINT "consumer_users_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_energy_readings" ADD CONSTRAINT "consumer_energy_readings_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_notifications" ADD CONSTRAINT "consumer_notifications_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_maintenance_requests" ADD CONSTRAINT "consumer_maintenance_requests_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_achievements" ADD CONSTRAINT "consumer_achievements_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_warranty_items" ADD CONSTRAINT "consumer_warranty_items_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_maintenance_schedule_items" ADD CONSTRAINT "consumer_maintenance_schedule_items_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

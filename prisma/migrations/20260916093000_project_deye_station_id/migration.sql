-- AlterTable
ALTER TABLE "projects" ADD COLUMN "deyeStationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_deyeStationId_key" ON "projects"("deyeStationId");

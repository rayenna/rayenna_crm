-- AlterTable
ALTER TABLE "projects" ADD COLUMN "solisStationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_solisStationId_key" ON "projects"("solisStationId");

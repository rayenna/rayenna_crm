-- AlterTable
ALTER TABLE "projects" ADD COLUMN "sunwaysStationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_sunwaysStationId_key" ON "projects"("sunwaysStationId");

-- CreateTable
CREATE TABLE "pe_removed_projects" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedById" TEXT NOT NULL,

    CONSTRAINT "pe_removed_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pe_removed_projects_projectId_key" ON "pe_removed_projects"("projectId");

-- AddForeignKey
ALTER TABLE "pe_removed_projects" ADD CONSTRAINT "pe_removed_projects_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

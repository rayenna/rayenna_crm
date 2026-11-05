-- Chart Builder shared library (Admin / Management)
CREATE TABLE IF NOT EXISTS "chart_builder_charts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "spec" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_builder_charts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chart_builder_charts_updatedAt_idx" ON "chart_builder_charts"("updatedAt");

ALTER TABLE "chart_builder_charts"
  ADD CONSTRAINT "chart_builder_charts_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chart_builder_charts"
  ADD CONSTRAINT "chart_builder_charts_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

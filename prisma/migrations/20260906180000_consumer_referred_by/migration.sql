-- AlterTable
ALTER TABLE "consumer_users" ADD COLUMN "referredById" TEXT;

-- CreateIndex
CREATE INDEX "consumer_users_referredById_idx" ON "consumer_users"("referredById");

-- AddForeignKey
ALTER TABLE "consumer_users" ADD CONSTRAINT "consumer_users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "consumer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

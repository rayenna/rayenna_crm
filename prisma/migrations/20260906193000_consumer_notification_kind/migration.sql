-- AlterTable
ALTER TABLE "consumer_notifications" ADD COLUMN "kind" VARCHAR(64);
ALTER TABLE "consumer_notifications" ADD COLUMN "refKey" VARCHAR(128);

-- CreateIndex
CREATE INDEX "consumer_notifications_consumerUserId_kind_refKey_idx" ON "consumer_notifications"("consumerUserId", "kind", "refKey");

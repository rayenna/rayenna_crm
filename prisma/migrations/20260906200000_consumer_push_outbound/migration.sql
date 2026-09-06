-- CreateTable
CREATE TABLE "consumer_push_subscriptions" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "endpoint" VARCHAR(2048) NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_outbound_messages" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "templateId" VARCHAR(64) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "detail" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consumer_push_subscriptions_endpoint_key" ON "consumer_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "consumer_push_subscriptions_consumerUserId_idx" ON "consumer_push_subscriptions"("consumerUserId");

-- CreateIndex
CREATE INDEX "consumer_outbound_messages_consumerUserId_createdAt_idx" ON "consumer_outbound_messages"("consumerUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "consumer_push_subscriptions" ADD CONSTRAINT "consumer_push_subscriptions_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_outbound_messages" ADD CONSTRAINT "consumer_outbound_messages_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

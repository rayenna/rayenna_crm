-- CreateTable
CREATE TABLE "consumer_chat_sessions" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "escalate" VARCHAR(32),
    "articleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumer_chat_sessions_consumerUserId_updatedAt_idx" ON "consumer_chat_sessions"("consumerUserId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "consumer_chat_messages_sessionId_createdAt_idx" ON "consumer_chat_messages"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "consumer_chat_sessions" ADD CONSTRAINT "consumer_chat_sessions_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_chat_messages" ADD CONSTRAINT "consumer_chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "consumer_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

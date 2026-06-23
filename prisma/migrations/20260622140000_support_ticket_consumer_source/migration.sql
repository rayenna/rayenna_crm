-- Support tickets raised from Rayenna Solar Hub consumer app
CREATE TYPE "SupportTicketSource" AS ENUM ('CRM', 'CONSUMER_APP');

ALTER TABLE "support_tickets" ADD COLUMN "source" "SupportTicketSource" NOT NULL DEFAULT 'CRM';
ALTER TABLE "support_tickets" ADD COLUMN "consumerUserId" TEXT;

CREATE INDEX "support_tickets_source_idx" ON "support_tickets"("source");

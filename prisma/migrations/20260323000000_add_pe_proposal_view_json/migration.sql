-- Persist Proposal Engine proposal view JSON so sales can reopen the same generated proposal on any device.
ALTER TABLE "pe_proposals" ADD COLUMN IF NOT EXISTS "proposalView" JSONB;

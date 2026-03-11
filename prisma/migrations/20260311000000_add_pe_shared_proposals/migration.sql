-- Shareable proposal links (read-only view via /view/:token).
-- Optional password and expiry; no auth required to view.

CREATE TABLE IF NOT EXISTS "pe_shared_proposals" (
  "id"           TEXT        NOT NULL,
  "token"        TEXT        NOT NULL,
  "projectId"    TEXT        NOT NULL,
  "proposalHtml" TEXT        NOT NULL,
  "refNumber"    TEXT,
  "passwordHash" TEXT,
  "expiresAt"    TIMESTAMP(3) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pe_shared_proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pe_shared_proposals_token_key"
  ON "pe_shared_proposals"("token");

CREATE INDEX IF NOT EXISTS "pe_shared_proposals_token_idx"
  ON "pe_shared_proposals"("token");

CREATE INDEX IF NOT EXISTS "pe_shared_proposals_expiresAt_idx"
  ON "pe_shared_proposals"("expiresAt");

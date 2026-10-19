-- Consumer Hub: invalidate sessions on password change
ALTER TABLE "consumer_users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Shared rate-limit buckets (Neon) for login / reset across API instances
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- Invalidate any outstanding staff password-reset tokens (were stored plaintext;
-- new flow stores SHA-256 only). Admins must re-issue links after deploy.
UPDATE "users"
SET "resetToken" = NULL,
    "resetTokenExpiry" = NULL
WHERE "resetToken" IS NOT NULL;

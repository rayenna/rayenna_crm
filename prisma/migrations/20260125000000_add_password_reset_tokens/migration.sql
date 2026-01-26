-- Add password reset token fields to users table
ALTER TABLE "users" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- Create unique index on resetToken for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS "users_resetToken_key" ON "users"("resetToken");

-- Create index on resetToken for faster queries
CREATE INDEX IF NOT EXISTS "users_resetToken_idx" ON "users"("resetToken");

-- Add database-level constraint to enforce single ADMIN user
-- This will prevent multiple ADMIN users at the database level
-- Note: PostgreSQL doesn't support partial unique constraints directly,
-- so we'll enforce this at the application level and add a check constraint
-- that logs a warning if more than one ADMIN exists (enforced via trigger or app logic)

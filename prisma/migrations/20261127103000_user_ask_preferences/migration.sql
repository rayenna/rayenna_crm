-- Zenith Ask preferences (default period + favorite chips) — cross-device on users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "askPreferences" JSONB;

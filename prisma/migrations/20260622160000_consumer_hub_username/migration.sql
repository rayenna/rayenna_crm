-- Solar Hub: username login + optional email

ALTER TABLE "consumer_users" ADD COLUMN "username" TEXT;

-- Backfill from email local-part for any existing rows
UPDATE "consumer_users"
SET "username" = LOWER(REGEXP_REPLACE(SPLIT_PART("email", '@', 1), '[^a-zA-Z0-9.]', '', 'g'))
WHERE "username" IS NULL;

-- Fallback for empty usernames
UPDATE "consumer_users"
SET "username" = 'hubuser' || SUBSTRING("id", 1, 8)
WHERE "username" IS NULL OR "username" = '';

ALTER TABLE "consumer_users" ALTER COLUMN "username" SET NOT NULL;

ALTER TABLE "consumer_users" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "consumer_users_username_key" ON "consumer_users"("username");

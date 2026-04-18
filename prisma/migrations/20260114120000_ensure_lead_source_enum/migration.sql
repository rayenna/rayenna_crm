-- LeadSource enum is required before migrations that ALTER TYPE "LeadSource".
-- The baseline migration stored lead data as TEXT; later migrations add enum values
-- but never created the type. Shadow DB replay (prisma migrate dev) fails without this.
-- Use to_regtype so we match the actual catalog name (typname alone can be lowercased).
DO $$
BEGIN
    IF to_regtype('public."LeadSource"') IS NULL THEN
        CREATE TYPE "LeadSource" AS ENUM (
            'WEBSITE',
            'REFERRAL',
            'GOOGLE',
            'CHANNEL_PARTNER'
        );
    END IF;
END $$;

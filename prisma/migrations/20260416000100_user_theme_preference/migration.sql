DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThemePreference') THEN
    CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK');
  END IF;
END$$;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "themePreference" "ThemePreference" NOT NULL DEFAULT 'DARK';
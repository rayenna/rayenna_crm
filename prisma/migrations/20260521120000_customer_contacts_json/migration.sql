-- Commercial / apartment customers: structured contacts (name + phones + emails per person)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contacts" JSONB;

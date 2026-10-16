-- Zenith Ask history (cross-device, last N per user)
CREATE TABLE IF NOT EXISTS "user_ask_history" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    TEXT NOT NULL,
  "question"   TEXT NOT NULL,
  "insight"    TEXT NOT NULL,
  "metric"     TEXT NOT NULL,
  "asked_at"   TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_ask_history_user_asked_at_idx"
  ON "user_ask_history" ("user_id", "asked_at" DESC);

-- My Day: personal productivity tables
-- User tasks (checklist + reminders)
CREATE TABLE IF NOT EXISTS user_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  content       TEXT NOT NULL,
  is_done       BOOLEAN NOT NULL DEFAULT false,
  due_date      DATE,
  is_reminder   BOOLEAN NOT NULL DEFAULT false,
  project_id    TEXT,
  project_label TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS user_tasks_user_due ON user_tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS user_tasks_user_reminder ON user_tasks (user_id, is_reminder, due_date);

-- User journal entries (one per user per day)
CREATE TABLE IF NOT EXISTS user_journal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  entry_date    DATE NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  project_id    TEXT,
  project_label TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS user_journal_user_date ON user_journal (user_id, entry_date DESC);

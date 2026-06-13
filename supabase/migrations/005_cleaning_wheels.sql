-- ─── Cleaning Wheels ─────────────────────────────────────────────────────────
-- Named spin-wheel presets for the cleaning system.
-- Each wheel stores a list of cleaning_task IDs the user wants to include.
CREATE TABLE IF NOT EXISTS cleaning_wheels (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text        NOT NULL,
  task_ids   text[]      NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cleaning_wheels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cleaning_wheels"
  ON cleaning_wheels FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cleaning_wheels_user
  ON cleaning_wheels(user_id);

-- ─── Finance Module ──────────────────────────────────────────────────────────
-- Monthly budget settings (one row per user per calendar month)
CREATE TABLE IF NOT EXISTS budget_months (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month        date          NOT NULL, -- first day of month e.g. 2026-06-01
  income       numeric(12,2) NOT NULL DEFAULT 0,
  savings_goal numeric(12,2) NOT NULL DEFAULT 0,
  created_at   timestamptz   DEFAULT now(),
  updated_at   timestamptz   DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget_months"
  ON budget_months FOR ALL USING (auth.uid() = user_id);

-- Recurring monthly fees / bills / subscriptions
CREATE TABLE IF NOT EXISTS recurring_fees (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text          NOT NULL,
  amount     numeric(12,2) NOT NULL DEFAULT 0,
  category   text          NOT NULL DEFAULT 'other',
  active     boolean       NOT NULL DEFAULT true,
  created_at timestamptz   DEFAULT now()
);

ALTER TABLE recurring_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recurring_fees"
  ON recurring_fees FOR ALL USING (auth.uid() = user_id);

-- Skipped purchases: impulse buys you chose not to make
CREATE TABLE IF NOT EXISTS skipped_purchases (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name      text          NOT NULL,
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  reward_message text,
  month          date          NOT NULL, -- first day of month this skip belongs to
  skipped_at     timestamptz   DEFAULT now()
);

ALTER TABLE skipped_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own skipped_purchases"
  ON skipped_purchases FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS budget_months_user_month
  ON budget_months(user_id, month DESC);
CREATE INDEX IF NOT EXISTS recurring_fees_user
  ON recurring_fees(user_id);
CREATE INDEX IF NOT EXISTS skipped_purchases_user_month
  ON skipped_purchases(user_id, month DESC);

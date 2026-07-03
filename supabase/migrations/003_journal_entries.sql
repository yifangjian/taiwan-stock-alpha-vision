-- Task Sprint: 投資手札資料表
-- 在 Supabase SQL Editor 執行

CREATE TABLE IF NOT EXISTS journal_entries (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_symbol TEXT        NOT NULL,
  action       TEXT        NOT NULL DEFAULT '買入' CHECK (action IN ('買入', '賣出', '觀察')),
  note         TEXT,
  tags         TEXT[]      DEFAULT '{}',
  ai_feedback  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_journal_entries" ON journal_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

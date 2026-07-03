-- Task-022：交易覆盤日記資料表
-- 在 Supabase SQL Editor 執行

CREATE TABLE IF NOT EXISTS trade_journals (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_id   TEXT NOT NULL,
  buy_date   DATE NOT NULL,
  sell_date  DATE,
  buy_price  DECIMAL(10, 2) NOT NULL,
  sell_price DECIMAL(10, 2),
  quantity   INTEGER DEFAULT 1,
  pnl_pct    DECIMAL(8, 2),
  notes      TEXT,
  ai_review  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trade_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_journals" ON trade_journals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 建立使用者自選股資料表
-- 在 Supabase 專案 → SQL Editor 中執行此檔案

CREATE TABLE IF NOT EXISTS user_portfolios (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_id   TEXT NOT NULL CHECK (stock_id ~ '^\d{4,6}$'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stock_id)
);

-- Row Level Security：每位使用者只能存取自己的自選股
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_portfolio" ON user_portfolios
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

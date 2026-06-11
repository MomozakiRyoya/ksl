-- タイムライン投稿
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_posts" ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_posts" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_own_posts" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 匿名意見箱
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_feedback" ON feedback FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- KSL Full Schema
-- Supabase SQL Editor で上から順に実行してください
-- ============================================================

-- ===== leagues =====
CREATE TABLE IF NOT EXISTS leagues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL DEFAULT '',
  order_num   int  NOT NULL DEFAULT 0,
  color       text NOT NULL DEFAULT '#ec4899',
  description text NOT NULL DEFAULT '',
  max_teams   int  NOT NULL DEFAULT 8,
  created_at  timestamptz DEFAULT now()
);

-- ===== teams =====
CREATE TABLE IF NOT EXISTS teams (
  team_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL DEFAULT '',
  league_id     uuid REFERENCES leagues(id) ON DELETE SET NULL,
  league_name   text NOT NULL DEFAULT '',
  logo_url      text,
  home_color    text NOT NULL DEFAULT '#ec4899',
  captain       text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  twitter_url   text,
  instagram_url text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ===== players =====
CREATE TABLE IF NOT EXISTS players (
  player_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  team_id    uuid REFERENCES teams(team_id) ON DELETE SET NULL,
  league_id  uuid REFERENCES leagues(id) ON DELETE SET NULL,
  position   text,
  number     int  NOT NULL DEFAULT 0,
  photo_url  text,
  image_url  text,
  is_captain boolean NOT NULL DEFAULT false,
  user_email text,
  created_at timestamptz DEFAULT now()
);

-- ===== structures =====
CREATE TABLE IF NOT EXISTS structures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  starting_stack int  NOT NULL DEFAULT 10000,
  max_players    int  NOT NULL DEFAULT 9,
  format         text NOT NULL DEFAULT '',
  levels         jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz DEFAULT now()
);

-- ===== point_templates =====
CREATE TABLE IF NOT EXISTS point_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  points        jsonb NOT NULL DEFAULT '[]',
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE structures
  ADD COLUMN IF NOT EXISTS point_template_id uuid REFERENCES point_templates(id) ON DELETE SET NULL;

-- ===== rounds =====
CREATE TABLE IF NOT EXISTS rounds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id    uuid REFERENCES leagues(id) ON DELETE SET NULL,
  league_name  text NOT NULL DEFAULT '',
  round_number int  NOT NULL DEFAULT 1,
  name         text NOT NULL DEFAULT '',
  date         date,
  start_time   text,
  venue        text NOT NULL DEFAULT '',
  venue_url    text,
  status       text NOT NULL DEFAULT 'scheduled',
  is_playoff   boolean NOT NULL DEFAULT false,
  format       text,
  structure_id uuid REFERENCES structures(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- ===== matches =====
CREATE TABLE IF NOT EXISTS matches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id       uuid REFERENCES rounds(id) ON DELETE CASCADE,
  home_team_id   uuid REFERENCES teams(team_id) ON DELETE SET NULL,
  home_team_name text NOT NULL DEFAULT '',
  away_team_id   uuid REFERENCES teams(team_id) ON DELETE SET NULL,
  away_team_name text NOT NULL DEFAULT '',
  home_score     int,
  away_score     int,
  home_round_pt  int,
  away_round_pt  int,
  status         text NOT NULL DEFAULT 'scheduled',
  created_at     timestamptz DEFAULT now()
);

-- ===== news =====
CREATE TABLE IF NOT EXISTS news (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  slug          text NOT NULL DEFAULT '',
  category      text NOT NULL DEFAULT 'お知らせ',
  published_at  timestamptz DEFAULT now(),
  thumbnail_url text,
  body          text NOT NULL DEFAULT '',
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- ===== posts (タイムライン) =====
CREATE TABLE IF NOT EXISTS posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ===== feedback (意見箱) =====
CREATE TABLE IF NOT EXISTS feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ===== player_results =====
CREATE TABLE IF NOT EXISTS player_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    text NOT NULL,
  player_id   text NOT NULL,
  player_name text NOT NULL DEFAULT '',
  team_id     text NOT NULL DEFAULT '',
  team_name   text NOT NULL DEFAULT '',
  rank        int,
  points      int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ===== featured_players (注目選手) =====
CREATE TABLE IF NOT EXISTS featured_players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   text NOT NULL,
  player_name text NOT NULL DEFAULT '',
  team_name   text NOT NULL DEFAULT '',
  order_num   int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ===== rosters =====
CREATE TABLE IF NOT EXISTS rosters (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    text NOT NULL,
  league_id  text NOT NULL,
  round_id   text NOT NULL,
  players    jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (team_id, round_id)
);

-- ===== push_subscriptions =====
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  keys       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS ポリシー
-- ============================================================

ALTER TABLE leagues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE news             ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 公開テーブルは全員読み取り可
CREATE POLICY "public_read_leagues"          ON leagues          FOR SELECT USING (true);
CREATE POLICY "public_read_teams"            ON teams            FOR SELECT USING (true);
CREATE POLICY "public_read_players"          ON players          FOR SELECT USING (true);
CREATE POLICY "public_read_rounds"           ON rounds           FOR SELECT USING (true);
CREATE POLICY "public_read_matches"          ON matches          FOR SELECT USING (true);
CREATE POLICY "public_read_news"             ON news             FOR SELECT USING (true);
CREATE POLICY "public_read_player_results"   ON player_results   FOR SELECT USING (true);
CREATE POLICY "public_read_featured_players" ON featured_players FOR SELECT USING (true);
CREATE POLICY "public_read_rosters"          ON rosters          FOR SELECT USING (true);

-- posts
CREATE POLICY "auth_read_posts"        ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_posts"      ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_own_posts"  ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- feedback
CREATE POLICY "anyone_insert_feedback" ON feedback FOR INSERT TO anon, authenticated WITH CHECK (true);

-- push_subscriptions
CREATE POLICY "auth_manage_push" ON push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

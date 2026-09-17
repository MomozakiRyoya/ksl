-- ============================================================
-- matches.home_team_id / away_team_id を text に揃える
--
-- 20260612_ksl_full_schema.sql は両列を uuid（teams(team_id) への外部キー）で
-- 定義しているが、実DBの teams.team_id は text（"kagoshima-poker-wolf" 等のスラッグ）。
-- 管理画面はスラッグと空文字（away_team_id）を保存するため、uuid のままだと
-- 試合結果の INSERT が必ず失敗する。player_results.team_id と同じく text・外部キー無しにする。
--
-- 本番の matches は 0 件（2026-09-17 確認）なので型変換で失うデータは無い。
-- Supabase SQL Editor で実行する。何度流しても結果は同じ。
-- ============================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND contype = 'f'
      AND confrelid = 'public.teams'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.matches
  ALTER COLUMN home_team_id TYPE text USING home_team_id::text,
  ALTER COLUMN away_team_id TYPE text USING away_team_id::text;

-- 確認: 2行とも type が text、fk が空なら完了
SELECT a.attname AS column_name,
       format_type(a.atttypid, a.atttypmod) AS type,
       (SELECT string_agg(pg_get_constraintdef(c.oid), '; ')
          FROM pg_constraint c
         WHERE c.conrelid = a.attrelid
           AND c.contype = 'f'
           AND a.attnum = ANY (c.conkey)) AS fk
FROM pg_attribute a
WHERE a.attrelid = 'public.matches'::regclass
  AND a.attname IN ('home_team_id', 'away_team_id');

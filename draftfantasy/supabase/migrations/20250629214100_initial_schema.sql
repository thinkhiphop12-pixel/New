-- Perfect Cup 8-0 — initial schema
-- Run this in the Supabase SQL Editor, or apply via the Supabase CLI.

CREATE TABLE IF NOT EXISTS squads (
  id TEXT PRIMARY KEY,
  tournament_year INT,
  country_name TEXT,
  country_family_id TEXT,
  display_name TEXT,
  weight FLOAT,
  strength FLOAT,
  strength_pct FLOAT,
  tier TEXT,
  memorable BOOLEAN,
  roles JSONB,
  result TEXT,
  eligible BOOLEAN,
  flag TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  person_key TEXT,
  squad_id TEXT REFERENCES squads(id),
  name TEXT,
  position TEXT,
  rating INT
);

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  anonymous_id TEXT,
  share_code TEXT UNIQUE NOT NULL,
  squad_ids TEXT[],
  player_ids TEXT[],
  match_results JSONB,
  goals_for INT,
  goals_against INT,
  perfect_run BOOLEAN,
  is_champion BOOLEAN,
  success BOOLEAN,
  pool TEXT,
  objective TEXT,
  final_score TEXT,
  team_strength FLOAT,
  played_at TIMESTAMPTZ DEFAULT now(),
  replay_code TEXT
);

-- Speeds up GET /api/runs?anonymousId=... (filter by anonymous_id, newest first).
CREATE INDEX IF NOT EXISTS runs_anonymous_id_played_at_idx
  ON runs (anonymous_id, played_at DESC);

ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read squads" ON squads;
DROP POLICY IF EXISTS "Allow public read players" ON players;
DROP POLICY IF EXISTS "Allow insert runs with anonymous_id" ON runs;
DROP POLICY IF EXISTS "Allow select runs by anonymous_id" ON runs;
DROP POLICY IF EXISTS "Allow delete runs by anonymous_id" ON runs;

CREATE POLICY "Allow public read squads" ON squads FOR SELECT USING (true);
CREATE POLICY "Allow public read players" ON players FOR SELECT USING (true);

-- NOTE: this game has no user accounts — runs are keyed by a client-generated
-- anonymous_id that can't be cryptographically verified, so these policies are
-- intentionally open (any visitor can read/insert/delete runs). That is the
-- accepted trade-off for an anonymous, no-login casual game. To lock the table
-- down later, add real auth (e.g. Supabase Anonymous Auth) and scope the
-- policies to auth.uid(), or revoke anon access and route all writes through a
-- server using the service-role key.
CREATE POLICY "Allow insert runs with anonymous_id" ON runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select runs by anonymous_id" ON runs FOR SELECT USING (true);
CREATE POLICY "Allow delete runs by anonymous_id" ON runs FOR DELETE USING (true);

-- Create user_events table for behavior tracking and analytics
-- Run: supabase db push (or apply manually in Supabase dashboard)

CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  game VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON user_events(user_id);
CREATE INDEX IF NOT EXISTS user_events_game_idx ON user_events(game);
CREATE INDEX IF NOT EXISTS user_events_event_type_idx ON user_events(event_type);
CREATE INDEX IF NOT EXISTS user_events_created_at_idx ON user_events(created_at);
CREATE INDEX IF NOT EXISTS user_events_game_user_idx ON user_events(game, user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Allow inserts from app (anonymous)
CREATE POLICY "Allow inserts" ON user_events
  FOR INSERT
  WITH CHECK (true);

-- Allow reads from app (for dashboard)
CREATE POLICY "Allow selects" ON user_events
  FOR SELECT
  USING (true);

-- COMMENT on table
COMMENT ON TABLE user_events IS 'Tracks user behavior and analytics events';
COMMENT ON COLUMN user_events.event_type IS 'Type of event (game_play, game_complete, streak_achieved, etc.)';
COMMENT ON COLUMN user_events.game IS 'Which game (scout, gaffer, etc.)';
COMMENT ON COLUMN user_events.user_id IS 'Device/session ID (anonymous, no PII)';
COMMENT ON COLUMN user_events.metadata IS 'Additional data (score, streak, duration, theme, etc.)';
COMMENT ON COLUMN user_events.created_at IS 'When event occurred';

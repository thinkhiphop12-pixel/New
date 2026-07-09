-- Create emails table for marketing campaigns
-- Run: supabase db push (or apply manually in Supabase dashboard)

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) UNIQUE NOT NULL,
  games TEXT[] DEFAULT '{}',
  last_game VARCHAR(50),
  initial_score INTEGER,
  initial_streak INTEGER,
  consent_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed BOOLEAN DEFAULT FALSE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS emails_email_idx ON emails(email);
CREATE INDEX IF NOT EXISTS emails_created_at_idx ON emails(created_at);
CREATE INDEX IF NOT EXISTS emails_unsubscribed_idx ON emails(unsubscribed);

-- Add RLS (Row Level Security) policies
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Allow inserting new emails (from app)
CREATE POLICY "Allow inserts" ON emails
  FOR INSERT
  WITH CHECK (true);

-- Allow updating own records (for unsubscribe)
CREATE POLICY "Allow updates" ON emails
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- COMMENT on table
COMMENT ON TABLE emails IS 'Stores user email subscriptions for marketing campaigns';
COMMENT ON COLUMN emails.email IS 'User email address (unique)';
COMMENT ON COLUMN emails.games IS 'Array of games they have played (scout, gaffer, etc.)';
COMMENT ON COLUMN emails.last_game IS 'Last game they played';
COMMENT ON COLUMN emails.initial_score IS 'First score when they opted in';
COMMENT ON COLUMN emails.initial_streak IS 'First streak when they opted in';
COMMENT ON COLUMN emails.consent_date IS 'Date they gave consent';
COMMENT ON COLUMN emails.unsubscribed IS 'Whether they have unsubscribed';

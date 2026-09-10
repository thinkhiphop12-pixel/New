-- BALLKNW: newsletter subscribers.
--
-- Apply with the Supabase SQL editor or `supabase db push`. Additive and safe
-- to re-run.
--
-- Backs POST /api/subscribe. The table is deliberately four columns wide: an
-- address, where it was typed, a visitor hash for rate limiting, and when
-- consent was given. A newsletter needs a mailbox and a lawful basis for using
-- it; everything past that is data this site has said it does not collect.

create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  -- Normalised by the API before it arrives (lowercased, gmail dots and +tags
  -- stripped) so one mailbox cannot appear as several rows.
  email         text        not null unique,
  -- Which page earned the signup: 'home', 'guides', 'game', 'free-games'.
  -- Validated against an allowlist in the handler, never stored raw.
  source        text        not null default 'unknown',
  -- Salted hash of the submitter's IP, never the address itself. Enough to
  -- rate limit someone walking a list of other people's emails through the
  -- form, and useless to anyone who obtains the table without the salt.
  visitor_hash  text,
  -- When the box was ticked. The record of consent has to be as durable as the
  -- address it justifies holding, so it lives in the same row.
  consent_at    timestamptz not null default now(),
  -- Set when someone unsubscribes. The row is kept rather than deleted, so a
  -- later import cannot quietly resurrect an address that asked to be left
  -- alone; every send must filter on this being null.
  unsubscribed_at timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists newsletter_subscribers_source_idx
  on public.newsletter_subscribers (source);
create index if not exists newsletter_subscribers_visitor_idx
  on public.newsletter_subscribers (visitor_hash, created_at desc);

-- RLS on with no policies: the table is reachable only through the service
-- role key held by the serverless function. The anon key the browser carries
-- can neither read the list nor add to it, so the subscriber list cannot be
-- enumerated from a devtools console the way an unprotected table can.
alter table public.newsletter_subscribers enable row level security;

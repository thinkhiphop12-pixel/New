-- BALLKNW: prize draw + optional accounts.
--
-- Apply with the Supabase SQL editor or `supabase db push`. Everything here is
-- additive and safe to re-run.
--
-- Two features share this file because they share one principle: the browser is
-- never trusted. Entry counts and save ownership are decided by the database,
-- because anything the client asserts can be forged from devtools.

-- ─────────────────────────────────────────────────────────────────────────────
-- PRIZE DRAW
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.comp_entrants (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null,
  -- Lowercased, and for gmail-style addresses the dots and +tag are stripped.
  -- Written by the API, not by the client, and uniquely indexed: this is what
  -- stops one mailbox registering as fifty entrants.
  email_norm    text        not null,
  code          text        not null unique,
  age_confirmed boolean     not null default false,
  -- Entries from an unverified address must never be counted in a draw. The
  -- confirmation email is not wired up yet, so this stays false and the draw
  -- query below filters on it.
  verified      boolean     not null default false,
  verify_token  uuid        not null default gen_random_uuid(),
  ip_hash       text,
  created_at    timestamptz not null default now(),
  constraint comp_entrants_email_check check (position('@' in email) > 1)
);

create unique index if not exists comp_entrants_email_norm_idx on public.comp_entrants (email_norm);
create index if not exists comp_entrants_created_idx on public.comp_entrants (created_at);

create table if not exists public.comp_referrals (
  id           uuid primary key default gen_random_uuid(),
  -- The entrant who gets the credit.
  entrant_id   uuid        not null references public.comp_entrants (id) on delete cascade,
  -- Salted hash of the referred visitor's IP. Raw addresses are personal data
  -- and there is no reason to keep them: a hash is enough to spot the same
  -- person converting twice, which is all this column is for.
  visitor_hash text        not null,
  created_at   timestamptz not null default now()
);

-- One credit per referred visitor per entrant. Refreshing the season-end screen
-- must not mint entries.
create unique index if not exists comp_referrals_unique_idx
  on public.comp_referrals (entrant_id, visitor_hash);
create index if not exists comp_referrals_entrant_idx on public.comp_referrals (entrant_id);

-- Live entry counts. Unverified entrants are excluded, so switching on email
-- confirmation later changes nothing about how the draw is run.
create or replace view public.comp_entry_counts as
  select e.id      as entrant_id,
         e.code    as code,
         e.verified,
         count(r.id) as entries
    from public.comp_entrants e
    left join public.comp_referrals r on r.entrant_id = e.id
   group by e.id, e.code, e.verified;

-- ─────────────────────────────────────────────────────────────────────────────
-- ACCOUNTS / CLOUD SAVES
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Accounts are optional by design. Guest play stays the default and a guest's
-- save continues to live in their own browser; signing in adds cross-device
-- sync and more than one slot. Nothing here deletes a local save, and no code
-- path expires one.

create table if not exists public.game_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  slot        smallint    not null default 1,
  -- The serialised GameState. Kept opaque on purpose: the shape belongs to the
  -- game engine and will change, and the database has no business knowing it.
  payload     jsonb       not null,
  -- Denormalised for the save-slot picker, so listing slots does not mean
  -- pulling every full save payload down the wire.
  club_name   text,
  season_year integer,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint game_saves_slot_check check (slot between 1 and 5)
);

create unique index if not exists game_saves_user_slot_idx on public.game_saves (user_id, slot);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists game_saves_touch on public.game_saves;
create trigger game_saves_touch before update on public.game_saves
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.comp_entrants  enable row level security;
alter table public.comp_referrals enable row level security;
alter table public.game_saves     enable row level security;

-- No policies on the competition tables, deliberately. RLS with zero policies
-- denies everything to the anon and authenticated roles, which is exactly the
-- intent: entrants and referrals are reachable only through the server-side API
-- using the service role key, which bypasses RLS. Nobody gets to read the
-- entrant list or write their own entry count from a browser.

-- Saves are the opposite: the browser talks to them directly, so each row is
-- fenced to its owner.
drop policy if exists "own saves: select" on public.game_saves;
create policy "own saves: select" on public.game_saves
  for select using (auth.uid() = user_id);

drop policy if exists "own saves: insert" on public.game_saves;
create policy "own saves: insert" on public.game_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "own saves: update" on public.game_saves;
create policy "own saves: update" on public.game_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own saves: delete" on public.game_saves;
create policy "own saves: delete" on public.game_saves
  for delete using (auth.uid() = user_id);

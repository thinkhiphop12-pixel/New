-- Tie prize-draw entries to a signed-in account.
--
-- Why: entry was keyed on a self-asserted email address, which meant the draw's
-- integrity rested on an email confirmation step that does not exist yet. A
-- £1,000 prize is worth more than the effort of registering a hundred throwaway
-- addresses, so "we'll add verification later" is not a safe position to launch
-- from.
--
-- Requiring an account moves that problem onto an identity provider that has
-- already done the verification: a Google sign-in carries a real, confirmed
-- mailbox, and Supabase's magic link proves control of the address before a
-- session exists. Neither costs anything to run.
--
-- Note what this does NOT change: playing stays account-free. The gate is on
-- entering a prize draw, not on the game, so "no sign up to play" remains true.

alter table public.comp_entrants
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- One entry per account. Partial, so rows predating this migration (which have
-- no user_id) do not all collide on null.
create unique index if not exists comp_entrants_user_idx
  on public.comp_entrants (user_id)
  where user_id is not null;

-- An account-backed entrant is verified by construction: the identity provider
-- confirmed the address before Supabase would issue a session for it.
comment on column public.comp_entrants.verified is
  'True when the address is confirmed. Account-backed entries are verified on '
  'creation because the identity provider confirmed the mailbox; email-only '
  'entries stay false until a confirmation link is followed.';

-- The draw view already filters on verified, so nothing about how a winner is
-- chosen changes — the set it draws from simply becomes trustworthy.

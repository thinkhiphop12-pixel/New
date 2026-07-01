# GAFFA — Name Your Side

The merged football draft game: **App A's UI** (era window, season challenges,
rating basis, 11-a-side formations) with **App B's draft logic** (spin a
club-season, draft the full squad in position order, strategic re-rolls).

This is a Next.js 16 app (App Router, Tailwind v4).

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build (verified passing)
```

## What was changed in the merge

The base app (App A) had a beautiful setup screen but a thin draft step. These
changes port App B's squad logic onto it:

- **Full squad on every spin** (`components/game/draft-screen.tsx`)
  Spinning a club-season now shows the **entire squad**, not just the players
  matching the open slot. Players whose position does not match the slot being
  drafted are **greyed out / disabled** (e.g. once your GK slot is filled,
  keepers appear disabled on later spins). Each card shows a position badge.

- **Strategic re-roll dropdown** (`components/game/draft-screen.tsx`,
  `components/game/use-gaffa-game.ts`)
  The single re-roll button is now a dropdown (default = none) with three
  options, inspired by App B:
  - *New random squad* — a fresh spin.
  - *Same year · new club* — keep the season, swap the club (`rerollTeam`).
  - *Same club · new year* — keep the club, shift the season (`rerollYear`).
  Options disable themselves when no valid alternative exists. All re-rolls draw
  from the shared re-roll pool set by the chosen difficulty.

- **Six extra formations** (`lib/draft-data.ts`)
  Added `5-3-2`, `5-4-1`, `4-2-3-1`, `3-4-3`, `4-5-1`, and `3-5-2 Wingbacks`
  alongside the original `4-4-2`, `4-3-3`, `3-5-2`.

- **Hand-curated DBC dataset with specific positions**
  (`scripts/build-squads.mjs` → `public/data/squads.json`)
  The draft runs on the DBC dataset (`../data/dbc-squads.js`): 133 curated
  starting XIs across all 23 World Cups (1930–2026), tournament-specific
  ratings (68–98, "Immortal" 97+ reserved for Pelé '70 / Maradona '86 /
  Messi '22), kit colours, flags, squad notes/finishes and per-player stats.
  Each player gets a **specific** position (`GK, CB, RB, LB, RM, LM, LW, RW,
  CM, CDM, CAM, ST, CF`) plus alternates, assigned in priority order:
  1. `scripts/spec-overrides.mjs` — ~400 hand-curated legends and stars.
  2. The legacy dataset (`../data/players.json`), 2002+ rows only, gated so
     the position must agree with the player's DBC line (pre-2000 rows in the
     legacy data are unreliable — nearly everything is tagged CM).
  3. Line defaults (DEF→CB, MID→CM, …), then a per-squad coverage pass that
     widens the lowest-rated defaults so every squad can fill every slot type.
  A formation slot only enables players whose position fits it
  (`SLOT_ACCEPTS` / `playerFillsSlot` in `lib/draft-data.ts`). `app/page.tsx`
  loads the JSON at runtime. The game is **World Cup only**.

  Regenerate the data after editing the source dataset or overrides:
  ```bash
  pnpm build:squads
  ```

## Known follow-ups

- No real **club** dataset exists yet, so only World Cup XI is offered. A club
  dataset in the same shape would restore the other modes.
- ~330 lesser-known players (mostly pre-2002 squad role-players) carry
  line-default positions (CB/CM/ST); refine via `scripts/spec-overrides.mjs`.

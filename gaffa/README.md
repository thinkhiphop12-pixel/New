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

## Known follow-ups

- **Player data is placeholder** (`lib/draft-data.ts` → `CLUB_SEASONS`).
  Positions are generic (`GK`/`DEF`/`MID`/`FWD`), so greying-out works at the
  generic level. Granular historical accuracy (e.g. distinguishing `RB` from
  `RWB`, or a player who was `RW` one season and `ST` the next) needs a richer
  dataset with per-season, per-player specific positions. The real World Cup
  dataset lives at `../data/players.json`.
- Promoting this app to replace `../perfect-cup/` and wiring the Vercel/Netlify
  deploy is a deliberate follow-up, not done here.

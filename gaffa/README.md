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

- **Real World Cup player data with specific positions**
  (`scripts/build-squads.mjs` → `public/data/squads.json`)
  The draft now runs on the repo's real dataset (`../data/players.json`, 344
  national squads, 1930–2026). Each player carries their **specific** position
  (`GK, CB, RB, LB, RM, LM, LW, RW, CM, CDM, CAM, ST`) plus any alternates, taken
  straight from the dataset — so a formation slot only enables players whose
  closest actual position fits it (`SLOT_ACCEPTS` / `playerFillsSlot` in
  `lib/draft-data.ts`). `app/page.tsx` loads the JSON at runtime and passes it to
  `useGaffaGame`. The game is **World Cup only**; the placeholder Premier League /
  Club XI modes and the form/peak rating toggle were removed.

  Regenerate the data after editing the source dataset:
  ```bash
  pnpm build:squads
  ```

## Known follow-ups

- No real **club** dataset exists yet, so only World Cup XI is offered. A club
  dataset in the same shape would restore the other modes.
- A handful of older squads (pre-1970) have sparse position tagging; they simply
  aren't offered for slots they can't fill.
- Promoting this app to replace `../perfect-cup/` and wiring the Vercel/Netlify
  deploy is a deliberate follow-up, not done here.

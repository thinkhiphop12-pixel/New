# Draft Fantasy — Perfect Cup 8-0

A full-stack [Next.js 16](https://nextjs.org) + [Supabase](https://supabase.com) clone of
`draftfantasy.com/perfect/8-0`.

Spin for random World Cup squads and draft five legends (1 GK, 1 DEF, 2 MID, 1 FWD), then
simulate a 2026-format tournament — three group games plus five knockout rounds. Win all eight
matches for a perfect **8-0**, or just lift the trophy. Runs are persisted to Supabase against an
anonymous browser id.

Mirrors the real game at draftfantasy.com/perfect/8-0: three squad pools (Classic Legends, Full
History, England), two objectives (Go 8-0 / Win the Cup), two rerolls per game (lineage = same
country, year = same year), and watch/instant reveal modes.

## Stack

- **Next.js 16.2.7** (App Router) + **React 19**
- **Supabase** (Postgres + RLS) for run persistence
- **Tailwind CSS v4** for the homepage; custom CSS for the game
- TypeScript

## Routes

| Path           | What                                                        |
| -------------- | ---------------------------------------------------------- |
| `/`            | Homepage with a link to the game                           |
| `/perfect/8-0` | The Perfect Cup draft + simulation game                    |
| `/api/runs`    | `GET` runs by `anonymousId`, `POST` to save a run          |
| `/api/feature-flags` | Static mock of the original site's flag endpoint     |

## Getting started

```bash
npm install
cp .env.example .env.local   # values are pre-filled with the project's publishable key
npm run dev                  # http://localhost:3000
```

The game is fully playable immediately. Squad/player data is read from
`public/data/players.json` (≈8k players grouped into squads client-side), so the game does not
depend on the database to run.

## Supabase setup

Run persistence (`/api/runs`) needs the `runs` table. Until it exists, the app transparently
falls back to `localStorage` so history still works.

1. **Schema** — open the Supabase SQL Editor and run
   [`supabase/migrations/20250629214100_initial_schema.sql`](supabase/migrations/20250629214100_initial_schema.sql).
   It creates `squads`, `players`, `runs`, RLS policies (public read for squads/players; open
   insert/select for runs), and an index for the runs query.

2. **Import squad/player data** *(optional — the game reads the bundled JSON at runtime)*:

   ```bash
   # add SUPABASE_SERVICE_ROLE_KEY to .env.local first (Dashboard → Project Settings → API)
   npm run import-data
   ```

## Environment variables

| Variable                          | Where    | Notes                                          |
| --------------------------------- | -------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | browser  | Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | browser  | Publishable key — safe to expose; RLS protects |
| `SUPABASE_SERVICE_ROLE_KEY`       | server   | Only for `import-data`. Never expose/commit.   |

## Deploy (Vercel)

1. Import the repo, set **Root Directory** to `draftfantasy`.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Project → Settings →
   Environment Variables.
3. Deploy. (Run the SQL migration once in Supabase as above.)

## How it works

- **Pools** (`engine/squads.ts`) — Classic Legends (34 strongest squads), Full History (every
  squad in the dataset), or England (every England edition).
- **Draft** (`engine/draft.ts`) — each spin offers one squad from the pool; draft one player per
  slot toward a five-a-side (1 GK · 1 DEF · 2 MID · 1 FWD). Two rerolls: lineage (same country,
  new year) and year (same year, new country), one of each per game. Spins only ever offer a squad
  that can still fill an open slot, so a draft can never get stuck.
- **Simulation** (`engine/simulate.ts`) — eight matches (3 group + Round of 32/16, QF, SF, Final);
  opponents are real squads scaled to the round; goals are sampled from a Poisson distribution off
  an expected-goals model, so favorites usually win but upsets happen. `Go 8-0` needs all eight
  wins; `Win the Cup` needs every knockout won (a group slip is survivable).
- **Persistence** (`hooks/useRunHistory.ts`) — on finish, the run is `POST`ed to `/api/runs`
  (Supabase) and cached locally. History is loaded via `GET /api/runs?anonymousId=...`, with picks
  for remote runs reconstructed from the loaded squad data. Falls back to `localStorage` if the
  database is unavailable.

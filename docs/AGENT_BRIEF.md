# Agent Brief — Pro Football Manager 26 feature parity

You are implementing a large, already-designed body of work. The design is done.
Your job is execution. Read this whole file before your first tool call.

## 1. Where everything is

- **Repo**: `thinkhiphop12-pixel/new`. Next.js 16 / React 19 / TypeScript /
  Tailwind 3.4 monorepo. The game is the npm workspace at
  `src/games/football-manager/`.
- **Branch**: do all work on `claude/pfm-comparison-analysis-jldpi6`. Create it
  from the default branch if your clone doesn't have it. Push with
  `git push -u origin claude/pfm-comparison-analysis-jldpi6`. **Do not open a
  pull request unless asked.**
- **The master plan**: `docs/PFM26_COMPARISON_AND_HANDOVER.md` (850 lines) is the
  source of truth. It contains a 99-item gap list, 16 phases, and a per-phase
  execution guide with type shapes and step orders. This brief tells you how to
  run; that doc tells you what to build. Read the phase you're on before starting
  it, not all 16 up front.
- **The standing goal**: `goal.md` holds the definition of done. `.checkpoint.md`
  is the resume log — read it first, write it last, every session.

## 2. The reference implementation — you must obtain this

The work is a port of a competitor game. **Its source is not in the repo.** Get
it before starting any engine phase:

```
https://pro-football-manager-26.vercel.app
```

Fetch the page and its `/js/*.js` modules: `core, data, engine, players, match,
season, transfers, finances, views, news, saves, odds, scenarios, start,
menu3d`, plus the stylesheet. Save them to a scratchpad directory. Every function
name cited in the plan is greppable in those files.

For Phase 15 only: `https://avatar-maker-seven.vercel.app`.

**Their comments carry tuned constants** — "measured over 300 matches",
Dixon-Coles rho = -0.28, lambda scale 0.97, 5.2% overround, contact multipliers
header 0.56 / volley 0.82 / foot 1.0. Copy the numbers. Do not re-derive them.

Their code is vanilla JS globals; ours is React. **Port the model and the
numbers, not the architecture.**

## 3. Order of work

Phases are dependency-ordered. Do not reorder them. Within Phase 0, do 0a → 0b →
0c → 0d in that order.

If you cannot complete everything, this is the value order — it degrades
gracefully if you stop:

| Priority | Phase | Why |
|---|---|---|
| 1 | 0a, 0d | Mechanical. Dead code + design tokens. Unblocks all UI work. |
| 2 | 3 | Player modal. The single most visible change in the plan. |
| 3 | 0b, 0c | Storage + state. Load-bearing but invisible. **Never leave half-done.** |
| 4 | 7 | Transfer negotiations. Biggest gameplay gap. |
| 5 | 6 | Penalties, extra time, shootouts. |
| 6 | everything else in phase order | |

**0b and 0c are atomic.** The storage rewrite and the reducer refactor either
land complete and passing, or get reverted. A half-migrated save layer is worse
than the current one.

## 4. Method — follow this for every phase

1. **Read the reference module first.** Open the competitor's corresponding
   `js__<module>.js` and read the functions the plan names, before designing ours.
2. **Engine before UI.** Types in `engine/types.ts` → pure logic in a new
   `engine/*.ts` → then screens. Engine modules must stay free of React imports
   so the `scripts/*.ts` harnesses can run under `tsx`.
3. **Migration in the same commit as the model change.** Any new `Player` /
   `Club` / `GameState` field gets a back-fill in `migrate()` in
   `src/games/football-manager/lib/storage.ts` plus a version bump, same commit.
   A save that loaded before your commit must load after it.
4. **Add the phase's smoke-test assertion in the same commit.** The plan names
   one per phase. There is no unit test suite — this is the entire regression net.
5. **Verify before committing** (all four must pass):
   ```
   npm run build
   npm run build:game
   npx tsx src/games/football-manager/scripts/smoke-test-season.ts
   npx tsx src/games/football-manager/scripts/sim-test.ts
   ```
6. **Commit and push**, message `feat(fm): <phase name>`.
7. **Update `.checkpoint.md`** with what landed, what's next, and any blocker.

## 5. Delegation

`CLAUDE.md` at the repo root defines a 10-80-10 routing system. Use it — running
a large model over boilerplate wastes budget and produces worse output.

- `medium-executor` (Opus 4.8) — Phases 0b, 0c, 2, 4, 5, 8, 9, 12. Real reasoning.
- `fast-worker` (Sonnet 5) — Phases 3, 6, 7, 10, 11, 13, 15. Screens and standard features.
- `low-executor` (Haiku 4.5) — Phase 0a, 0d, 14. Deletion, tokens, renames, icons.

Effort **Medium** by default. **High** only for Phases 4 and 9. Never xhigh/max —
it costs more and produces worse output.

## 6. The four things that go wrong

These are the known traps. Losing any of them means silently broken behaviour
that still compiles.

1. **Don't drop the gating in their xG chain (Phase 4).** Build-up and run
   instructions only pay off when the squad's stats fit *and* the opponent's
   setup allows it. That conditionality is the entire reason their tactics screen
   matters. Without it you get free bonuses and meaningless tactics.
2. **`sim-test.ts` must report 2.4–3.2 goals per game after every engine change.**
   Phase 4 is a seven-step port; re-run this after *each step*, not at the end.
   Outside that band, the match engine is broken regardless of what the UI shows.
3. **`--brand` club theming is UI chrome only** — sidebar active state, primary
   buttons, active tab pills. Win/loss, finance direction and
   promotion/relegation zone colours stay on fixed tokens, so their meaning never
   depends on which club is being managed.
4. **Phase 2 is the widest refactor in the plan.** Everything branching on the
   `Division` 1–10 union has to key off a `LeagueDef` instead —
   `seasonProgression.ts`, `gameRules.ts`, `TableScreen.tsx`, `FixturesScreen.tsx`
   move together or not at all.

## 7. Scale — set your expectations

The competitor is ~19,000 lines of hand-tuned game logic. Ours is ~10,780. This
is a multi-session build, not a single sitting. The repo is set up for that:
`goal.md` holds the target, `.checkpoint.md` holds your position, and the hourly
build bot described in `CLAUDE.md` resumes from disk rather than conversation
history.

**Write `.checkpoint.md` before you run out of context.** It is the only state
that survives. A session that ends without it forces the next one to re-derive
where you got to.

## 8. Reporting

Check in at the end of each phase rather than running straight through. When you
report, say plainly what passed, what you skipped, and what you're unsure about.
If a smoke test fails, show the output — do not describe a phase as complete
unless all four checks in §4.5 passed.

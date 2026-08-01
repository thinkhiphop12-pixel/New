# Goal

Implement the phases in `docs/PFM26_COMPARISON_AND_HANDOVER.md` in order,
starting at Phase 0, until every phase 0–15 is complete and committed, without
opening pull requests, without changing the phase order, and without skipping a
phase's migration or smoke-test assertion.

## Definition of done

A phase counts as complete only when all of the following hold:

1. Its section in `docs/PFM26_COMPARISON_AND_HANDOVER.md` is fully implemented.
2. `npm run build` and `npm run build:game` both pass.
3. `npx tsx src/games/football-manager/scripts/smoke-test-season.ts` completes a
   full season without throwing.
4. `npx tsx src/games/football-manager/scripts/sim-test.ts` reports goals per
   game between 2.4 and 3.2.
5. The phase's own smoke-test assertion (named in the execution guide) has been
   added and passes.
6. Any new `Player` / `Club` / `GameState` field has a back-fill in `migrate()`
   in `src/games/football-manager/lib/storage.ts`, and a save written before the
   change still loads after it.
7. The work is committed to `claude/pfm-comparison-analysis-jldpi6` and pushed.

The overall goal is met when Phase 15 satisfies the above. At that point report
completion and stop making changes until this file is updated.

## Standing constraints

- Read the relevant `pro-football-manager-26_vercel_app__js__<module>.js`
  reference before designing each subsystem. Keep their tuned constants
  (Dixon-Coles rho -0.28, 5.2% overround, contact multipliers, etc.).
- Do not drop the gating in their xG chain: build-up and run instructions only
  pay off when squad stats fit and the opponent's setup allows it.
- `--brand` club theming applies to UI chrome only, never to colours that carry
  meaning (win/loss, finance direction, promotion/relegation zones).
- Engine modules under `engine/` stay free of React imports so the `scripts/*.ts`
  harnesses can run under `tsx`.
- Delegate per the 10-80-10 routing table in `CLAUDE.md`. Effort Medium by
  default; High only for Phases 4 and 9. Never xhigh/max.

## Reference archives

The competitor source (`records.zip`) and the avatar-maker zip are NOT in this
repo. If a firing needs them and they are absent, re-fetch:

- https://pro-football-manager-26.vercel.app  (all phases)
- https://avatar-maker-seven.vercel.app  (Phase 15 only)

If neither is reachable, implement from the descriptions in the handover doc and
note the degraded fidelity in `.checkpoint.md`.

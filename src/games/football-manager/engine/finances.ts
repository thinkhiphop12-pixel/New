/**
 * Phase 8 — club budgets.
 *
 * Money reaches the manager the way FIFA career mode does it, as two
 * allowances set by the board rather than a simulated cash flow:
 *
 *   `state.budget`      — the transfer budget. Fees come out of it, player
 *                         sales go back into it. Nothing else touches it: no
 *                         gate receipts, no TV money, no weekly wage drain.
 *   `state.wageBudget`  — the wage budget. A weekly *capacity*, not cash: the
 *                         squad's committed wages must fit inside it, and a
 *                         signing is blocked when it would not.
 *
 * Both are re-set at each season rollover — see `rolloverSeason` and
 * `seasonAllocation` — so budgets grow with a good finish and with promotion,
 * and shrink on the way back down.
 *
 * ── What used to be here ──────────────────────────────────────────────────
 * An entire revenue model: TV equal share, a per-fixture matchday income
 * model, merchandising, commercial income, parachute payments, transfer-fee
 * amortization, a squad cost ratio with an embargo ladder, FFP on a rolling
 * three-year loss, ticket pricing, and a per-league `economyScale` deriving
 * all of it onto this game's wage scale.
 *
 * It was removed deliberately, not lost. Two reasons:
 *
 *  1. It did not balance. This dataset's wage economy is roughly a tenth of
 *     real football's while the revenue tables were real-sized, so a Premier
 *     League club booked ~£41m of income against a ~£3.7m wage bill and banked
 *     a large surplus every season regardless of how it was run. The surplus
 *     was a property of the calibration, not of any decision the manager made.
 *  2. None of it was a decision. Once sponsors and stadium expansion went, the
 *     player had no lever over any of those streams — they were an elaborate
 *     way to compute a number that then mostly did not matter.
 *
 * The board's season allocation replaces all of it. Prize money still exists
 * and is paid straight into `budget` by seasonProgression, which is the one
 * place performance turns into cash mid-season.
 */
import type { Club, GameState, FinanceState } from './types';
import { getLeague, startingBudget } from './gameRules';
import { clubWageBill, wageCeiling, WAGE_BUDGET_HEADROOM } from './teamManagement';
import { clamp, formatMoney } from './utils';
import { pushInbox } from './inbox';

/* =========================================================================
   The season allocation
   ========================================================================= */

/** Fraction of an unspent transfer budget the board lets the manager keep at
 *  the season rollover. Below 1 so thrift is rewarded without letting a club
 *  hoard several seasons of allocation into one unanswerable war chest. */
const BUDGET_CARRYOVER = 0.5;

/** Season-allocation multiplier by where the club finished, as a fraction of
 *  the division. A title win lifts the following summer's budget by half; the
 *  relegation places have it cut hard. */
function finishMultiplier(position: number, clubCount: number): number {
  if (position <= 0 || clubCount <= 0) return 1;
  if (position === 1) return 1.45;
  const frac = position / clubCount;
  if (frac <= 0.15) return 1.25;
  if (frac <= 0.35) return 1.12;
  if (frac <= 0.65) return 1.0;
  if (frac <= 0.85) return 0.9;
  return 0.78;
}

/** Board-confidence multiplier on the season allocation. */
function confidenceMultiplier(confidence: number): number {
  const h = clamp(confidence, 0, 100);
  return h >= 85 ? 1.2 : h >= 65 ? 1.1 : h >= 40 ? 1.0 : h >= 20 ? 0.88 : 0.75;
}

function userClub(state: GameState): Club {
  return state.clubs.find((c) => c.id === state.userClubId)!;
}

/**
 * The club's baseline transfer budget in its current division.
 *
 * `LeagueDef.startingBudget` sets the division's level and `Club.budgetMultiplier`
 * splits it between clubs. The multiplier comes from scripts/build-gamedata.mjs:
 * a club's real FC 26 career-mode budget over its division's median where one is
 * published, and a squad-value-derived stand-in where it is not. It is
 * league-relative and centred on 1.0, so the division's total spending power is
 * exactly what it was before per-club budgets existed — only the split changed.
 */
export function baseTransferBudget(state: GameState, club: Club): number {
  return Math.round(startingBudget(club.leagueId) * (club.budgetMultiplier ?? 1));
}

/**
 * Wage budget headroom: what is committed, what the board allows, what is left.
 *
 * A read-only view over the cap `engine/teamManagement.wageCeiling` already
 * owns and `engine/transferMarket.canBuy` already enforces — this module sets
 * the ceiling at each rollover but does not re-implement the check, so there is
 * exactly one definition of "over the wage budget" in the codebase.
 */
export function wageBudgetStatus(state: GameState): {
  committed: number; budget: number; free: number; pct: number;
} {
  const committed = clubWageBill(state, state.userClubId);
  const budget = wageCeiling(state);
  return {
    committed,
    budget,
    free: budget - committed,
    pct: budget > 0 ? committed / budget : committed > 0 ? 2 : 0,
  };
}

/**
 * What the board puts up for the coming season, before carryover: the club's
 * baseline in whatever division it is now in, bent by last season's finish and
 * by how much faith the board has. Promotion therefore raises the budget by
 * moving `baseTransferBudget` onto the higher division's `startingBudget`, and
 * relegation cuts it the same way.
 */
export function seasonAllocation(
  state: GameState,
  fin: FinanceState,
  position: number,
  clubCount: number
): { transfer: number; wage: number } {
  const club = userClub(state);
  const mult = finishMultiplier(position, clubCount) * confidenceMultiplier(fin.boardConfidence);
  // The wage budget tracks the squad the club actually has, so a season of
  // signings raises the following season's ceiling rather than stranding the
  // squad above it. The same finish/confidence bend applies on top.
  const committed = clubWageBill(state, club.id);
  const baseWage = Math.max(club.wageBudget ?? 0, Math.round(committed * WAGE_BUDGET_HEADROOM));
  return {
    transfer: Math.round((baseTransferBudget(state, club) * mult) / 100_000) * 100_000,
    wage: Math.round((baseWage * clamp(mult, 0.9, 1.35)) / 100) * 100,
  };
}

/* =========================================================================
   Lazy state
   ========================================================================= */

/** Fresh finance state for a club. */
export function initFinances(state: GameState): FinanceState {
  const club = userClub(state);
  return {
    seasonYear: state.seasonYear,
    leagueId: club.leagueId,
    boardConfidence: clamp(state.board?.confidence ?? 50, 0, 100),
    history: [],
    pointsDeduction: 0,
  };
}

/**
 * The migration. Additive and version-agnostic on purpose: rather than editing
 * `lib/storage.ts` (contended) and bumping the save version, every entry point
 * calls this, so an old save gains `finances` the first time the engine or the
 * Finances screen touches it.
 */
export function ensureFinances(state: GameState): FinanceState {
  state.finances = state.finances ?? initFinances(state);
  return state.finances;
}

/** Read-only view for React, which must not mutate the state it renders.
 *  Returns the live object if there is one, otherwise a throwaway. */
export function financesView(state: GameState): FinanceState {
  return state.finances ?? initFinances(state);
}

/* =========================================================================
   The weekly tick
   ========================================================================= */

/**
 * The one weekly hook, called from `seasonProgression.playRound`.
 *
 * There is no weekly cash flow left to settle — wages are a capacity check,
 * not a debit, and there is no income model. All this does is notice that a
 * new season has started and let the board set the new budgets.
 */
export function tickFinances(state: GameState): void {
  const fin = ensureFinances(state);
  if (fin.seasonYear !== state.seasonYear) rolloverSeason(state, fin);
  fin.boardConfidence = clamp(state.board.confidence, 0, 100);
}

/* =========================================================================
   Season rollover
   ========================================================================= */

function rolloverSeason(state: GameState, fin: FinanceState): void {
  const club = userClub(state);
  const last = state.history[state.history.length - 1];
  const oldLeague = getLeague(fin.leagueId);

  fin.history.push({
    year: fin.seasonYear,
    leagueId: fin.leagueId,
    position: last?.position ?? 0,
    budget: state.budget,
    wageBudget: wageCeiling(state),
    confidence: fin.boardConfidence,
  });
  if (fin.history.length > 20) fin.history.shift();

  const alloc = seasonAllocation(state, fin, last?.position ?? 0, oldLeague.clubCount);
  const carried = Math.round(Math.max(0, state.budget) * BUDGET_CARRYOVER);
  state.budget = alloc.transfer + carried;
  state.wageBudget = alloc.wage;

  pushInbox(state, {
    category: 'board',
    title: `Budgets set for ${state.seasonYear}/${(state.seasonYear + 1) % 100}`,
    body: `The board has set a transfer budget of ${formatMoney(alloc.transfer)}`
      + (carried > 0 ? `, plus ${formatMoney(carried)} carried over from last season's unspent funds` : '')
      + `, and a wage budget of ${formatMoney(alloc.wage)} per week.`,
  });

  fin.pointsDeduction = 0;
  fin.seasonYear = state.seasonYear;
  fin.leagueId = club.leagueId;
}

/* =========================================================================
   Points deductions on the table
   ========================================================================= */

/**
 * Apply this season's points deductions to a computed league table. Kept as a
 * pure view transform rather than a mutation so it can only ever be applied
 * once per render, and so `computeTable` (owned by another phase) is untouched.
 *
 * The only writer is the `points_deduction` scenario.
 */
export function applyPointsDeductions<T extends { clubId: number; pts: number; gd?: number; gf?: number }>(
  state: GameState,
  rows: T[]
): T[] {
  const deduction = state.finances?.pointsDeduction ?? 0;
  if (!deduction) return rows;
  const out = rows.map((r) => (r.clubId === state.userClubId ? { ...r, pts: r.pts - deduction } : r));
  out.sort((a, b) => b.pts - a.pts || (b.gd ?? 0) - (a.gd ?? 0) || (b.gf ?? 0) - (a.gf ?? 0));
  return out;
}

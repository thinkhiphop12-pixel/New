/**
 * Phase 8 — club finances.
 *
 * A matchday income model that replaces the flat `GATE_BASE` lookup, TV equal
 * share, passive commercial income, merchandising, parachute payments, and the
 * FIFA-style pair of budgets the manager actually spends against.
 *
 * ── Money units ──────────────────────────────────────────────────────────
 * The reference works in £m; this engine works in whole pounds everywhere
 * (`Player.wage`, `GameState.budget`, `LedgerEntry.amount`). Every reference
 * constant below is therefore stated in £m and multiplied by 1e6 at the point
 * of use, so the tables stay readable against their source.
 *
 * ── The two budgets ───────────────────────────────────────────────────────
 * Money reaches the manager the way FIFA career mode does it, as two separate
 * allowances rather than one pot:
 *
 *   `state.budget`      — the transfer budget. Cash. Fees come out of it,
 *                         player sales go into it, and the club's trading
 *                         surplus (TV, matchday, commercial, less wages) still
 *                         accrues to it week to week, so a well-run club
 *                         genuinely grows richer.
 *   `state.wageBudget`  — the wage budget. A weekly *capacity*, not cash: the
 *                         squad's committed wages must fit inside it, and a
 *                         signing is blocked when it would not. Wages are still
 *                         paid out of the balance as before; this caps what the
 *                         club may commit to, which is the constraint that
 *                         makes contract talks a real decision.
 *
 * Both are re-set by the board at each season rollover — see `rolloverSeason`
 * and `seasonAllocation` — so budgets grow with success and with promotion,
 * and shrink on the way back down.
 *
 * ── Economy calibration (read this before retuning) ───────────────────────
 * The reference's revenue tables are real-world sized (a Premier League club
 * earns £110m TV + £30-70m matchday + £40-150m commercial). This codebase's
 * *wage* economy is not: the median Premier League squad here costs £9.1m a
 * year and the most expensive £31m, roughly a tenth of the real figure, and
 * the compression is not uniform — League Two wages (£1.4m/yr) are close to
 * real while Premier League wages are ~10x too low.
 *
 * Dropping the reference's real revenues in unmodified would print money into
 * `budget` and break the transfer market — the exact "compiles clean but is
 * silently wrong" failure this project keeps hitting.
 *
 * So every revenue stream is multiplied by a per-league `economyScale`, which
 * is *derived*, not hand-tuned: it is the ratio between what this game's own
 * already-calibrated `LeagueDef.gateBase` says a season of income is worth in
 * that division and what the reference model would produce for the same set of
 * clubs. The relative shape of the reference model (division ladder, stature
 * curve, stream mix) is preserved exactly; only the absolute level is pulled
 * onto this game's scale.
 *
 * Consequence to be aware of: headline commercial figures here read low against
 * real football (a top Premier League side lands around £8-12m of commercial
 * income, not £100m). That is deliberate and reversible — raise the wage/fee
 * economy and set `REVENUE_UPLIFT` to 1 with `economyScale` forced to 1, and
 * the model produces real-world numbers unchanged.
 */
import type {
  Amortization, BalancePoint, Club, FinanceState, Fixture, GameState, LeagueDef,
} from './types';
import { getLeague, SEASON_ROUNDS, leagueAbove, startingBudget } from './gameRules';
import { clubWageBill, wageCeiling, WAGE_BUDGET_HEADROOM } from './teamManagement';
import { clamp, formatMoney } from './utils';
import { pushInbox } from './inbox';

/* =========================================================================
   Reference constants (£m unless noted). Kept at the reference's own values.
   ========================================================================= */

/** Weeks in a financial year — the basis for every "annual" figure. */
const YEAR_WEEKS = 52;

/** Upper bound on continuous club stature. The reference's tables stop at 5;
 *  this goes to 6 so a division's outliers have somewhere to go (see
 *  `FIN_STADIUM_MULT`). */
const MAX_STATURE = 6;

/** Shirt-front market rate by league level, before the stature multiplier.
 *  Retained as the shape of commercial income after the sponsor-negotiation
 *  system was removed: the club still has partners, the manager simply no
 *  longer picks them. */
const COMMERCIAL_BASE = [0, 4, 2, 0.5, 0.2, 0.08];
/** How hard club stature bends the commercial rate, by league level. */
const COMMERCIAL_REP_MULT = [0, 14, 1.8, 1.0, 0.8, 0.6];
/** Combined worth of the shirt, sleeve and stadium-naming slots as a multiple
 *  of the shirt-front rate. Preserved at the old `SPONSOR_SLOTS` total
 *  (1.00 + 0.22 + 0.60) so `economyScale` is unchanged by the removal. */
const COMMERCIAL_SLOT_SUM = 1.82;
/** Kit-income floor by league level: even a small club gets paid for its
 *  division's exposure. The reference floors this on absolute club reputation
 *  instead, which does not transfer — `clubStature` here is league-relative,
 *  so a mid-table League One side scores 3.8 and would have collected the
 *  reference's £10m "elite brand" kit deal. Caught in finance-preview.ts. */
const KIT_LEVEL_FLOOR = [0, 1.4, 0.7, 0.175, 0.07, 0.028];
/** Gate income per season at standard prices, by league level. */
const FIN_MATCHDAY_LEAGUE = [0, 32, 9, 2.8, 1.1, 0.35];
/** Fanbase/stadium-size multiplier by stature band. Index 6 extends the
 *  reference's 1–5 table: stature is continuous here and the biggest clubs
 *  saturate at 5.00, which left them no revenue headroom at all against a wage
 *  bill 20x the division's smallest. Verified in scripts/finance-preview.ts. */
const FIN_STADIUM_MULT = [0, 0.18, 0.45, 1.0, 1.60, 2.10, 4.20];
/** Merchandise as a fraction of matchday income. */
const MERCH_RATIO = 0.22;

/** Revenue target as a multiple of the league's existing season gate take.
 *  Slightly above 1 at the top (the extra streams should be worth having) and
 *  well above 1 at the bottom, where this game's gate income alone does not
 *  cover a League Two wage bill. Verified in scripts/finance-preview.ts. */
const REVENUE_UPLIFT = [0, 1.15, 1.20, 1.40, 2.20, 2.60];

/* =========================================================================
   Budget model
   ========================================================================= */

/** Fraction of an unspent transfer budget the board lets the manager keep at
 *  the season rollover. Below 1 so thrift is rewarded without letting a club
 *  hoard several seasons of allocation into one unanswerable war chest. */
const BUDGET_CARRYOVER = 0.5;

/**
 * Ceiling on carryover, as a multiple of the season's allocation.
 *
 * Needed because `budget` is both the transfer kitty and the cash balance, and
 * this game's wage economy is far lighter than its revenue model — a Premier
 * League side books around £41m of income against a £3.7m wage bill, so it
 * banks a large surplus every year no matter how it is run (see the economy
 * calibration note in the file header; the surplus is a property of that
 * calibration, not of the manager's decisions). Uncapped, half of that surplus
 * compounding into each new allocation settles at roughly 5x the division's
 * baseline. Capped here, a club that never spends still tops out at twice its
 * allocation, which is a war chest rather than an economy-breaker.
 */
const MAX_CARRYOVER_RATIO = 1.0;

/** Season-allocation multiplier by where the club finished, as a fraction of
 *  the division. A title win nearly doubles the following summer's budget; the
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

/**
 * The club's baseline transfer budget in its current division, before any
 * performance or carryover adjustment.
 *
 * `LeagueDef.startingBudget` sets the division's level and `Club.budgetMultiplier`
 * splits it between clubs. The multiplier comes from scripts/build-gamedata.mjs:
 * a club's real FC 26 career-mode budget over its division's median where one is
 * published, and a squad-value-derived stand-in where it is not. It is
 * league-relative and centred on 1.0, so the division's total spending power is
 * exactly what it was before per-club budgets existed — only the split changed.
 */
export function baseTransferBudget(state: GameState, club: Club): number {
  const mult = club.budgetMultiplier ?? 1;
  return Math.round(startingBudget(club.leagueId) * mult);
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

/* =========================================================================
   Lazy state
   ========================================================================= */

function emptyIncome() {
  return { tv: 0, matchday: 0, sponsorship: 0, merchandise: 0, prizes: 0, sales: 0, parachute: 0, grants: 0 };
}
function emptyExpenses() {
  return { wages: 0, staff: 0, transfers: 0, agentFees: 0, academyUpkeep: 0, stadiumMaint: 0 };
}

/** Fresh finance state for a club. */
export function initFinances(state: GameState): FinanceState {
  const club = userClub(state);
  return {
    seasonYear: state.seasonYear,
    leagueId: club.leagueId,
    boardConfidence: clamp(state.board?.confidence ?? 50, 0, 100),
    seasonIncome: emptyIncome(),
    seasonExpenses: emptyExpenses(),
    balanceHistory: [],
    history: [],
    amortizations: [],
    pointsDeduction: 0,
    seenLedger: [],
    parachuteYears: 0,
    boardFundsRequested: false,
    weeksElapsed: 0,
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
  // Saves written before per-club wage budgets existed fall back to the
  // squad-derived ceiling `wageCeiling` already supplies, so nothing here has
  // to special-case an absent cap.
  return state.finances;
}

/** Read-only view for React, which must not mutate the state it renders.
 *  Returns the live object if there is one, otherwise a throwaway. */
export function financesView(state: GameState): FinanceState {
  return state.finances ?? initFinances(state);
}

/* =========================================================================
   Club stature and the per-league economy scale
   ========================================================================= */

function userClub(state: GameState): Club {
  return state.clubs.find((c) => c.id === state.userClubId)!;
}

function clubAvgRating(state: GameState, club: Club): number {
  const ids = club.playerIds;
  if (!ids.length) return 60;
  let sum = 0;
  let n = 0;
  for (const id of ids) {
    const p = state.players[id];
    if (p) { sum += p.rating; n++; }
  }
  return n ? sum / n : 60;
}

/**
 * Continuous 1–5 club stature. `Club.reputation` is the anchor, but it is a
 * coarse 1–5 integer that clusters hard (every top-flight club here scores 4
 * or 5). Squad strength relative to the rest of the division spreads them back
 * out without contradicting the reputation band.
 */
export function clubStature(state: GameState, club: Club): number {
  const peers = state.clubs.filter((c) => c.leagueId === club.leagueId && !c.dormant);
  const leagueAvg = peers.length
    ? peers.reduce((s, c) => s + clubAvgRating(state, c), 0) / peers.length
    : 60;
  const rel = (clubAvgRating(state, club) - leagueAvg) / 6;
  return clamp((club.reputation ?? 3) + rel, 1, MAX_STATURE);
}

/** Interpolate a stature-banded table (index 1–5) at a continuous stature. */
function statureLerp(table: number[], stature: number): number {
  const s = clamp(stature, 1, table.length - 1);
  const lo = Math.floor(s);
  const hi = Math.min(table.length - 1, lo + 1);
  return table[lo] + (table[hi] - table[lo]) * (s - lo);
}

/* --- the reference model, unscaled, in pounds ---------------------------- */

function refMatchdayAnnual(level: number, stature: number): number {
  return FIN_MATCHDAY_LEAGUE[Math.min(level, 5)] * statureLerp(FIN_STADIUM_MULT, stature) * 1e6;
}

function refShirtMarketAnnual(level: number, stature: number): number {
  const lvl = Math.min(level, 5);
  const repFrac = (clamp(stature, 1, MAX_STATURE) - 1) / 4;
  return COMMERCIAL_BASE[lvl] * (1 + repFrac * repFrac * COMMERCIAL_REP_MULT[lvl]) * 1e6;
}

function refKitAnnual(level: number, stature: number): number {
  // Half the shirt-front rate, floored at what the division alone is worth.
  const floor = KIT_LEVEL_FLOOR[Math.min(level, 5)] * 1e6;
  return Math.max(floor, refShirtMarketAnnual(level, stature) * 0.5);
}

function refCommercialAnnual(level: number, stature: number): number {
  return refShirtMarketAnnual(level, stature) * COMMERCIAL_SLOT_SUM + refKitAnnual(level, stature);
}

function refFootballRevenue(lg: LeagueDef, stature: number): number {
  const md = refMatchdayAnnual(lg.level, stature);
  return lg.tvEqualShare * 1e6 + md + md * MERCH_RATIO + refCommercialAnnual(lg.level, stature);
}

/** Per-state, per-league memo so the mean-stature pass is not redone weekly. */
const scaleCache = new WeakMap<GameState, Map<string, number>>();

/**
 * The calibration constant described in the file header: what one season of
 * income in this division is actually worth in this game, divided by what the
 * reference model would pay the same clubs. Derived from the league's *actual*
 * club set, so it self-normalises however the reputation distribution shifts.
 */
export function economyScale(state: GameState, leagueId: string): number {
  let byLeague = scaleCache.get(state);
  if (!byLeague) { byLeague = new Map(); scaleCache.set(state, byLeague); }
  const hit = byLeague.get(leagueId);
  if (hit !== undefined) return hit;

  const lg = getLeague(leagueId);
  const peers = state.clubs.filter((c) => c.leagueId === leagueId && !c.dormant);
  // Anchored on the median club, not the mean. The stature curve is deliberately
  // steep at the top so that an elite side's revenue can keep pace with a wage
  // bill many times the division's smallest; anchoring on the mean would let
  // that same tail drag the scale down and squeeze everyone else.
  const refs = peers.map((c) => refFootballRevenue(lg, clubStature(state, c))).sort((a, b) => a - b);
  const refMedian = refs.length ? refs[refs.length >> 1] : refFootballRevenue(lg, 3);
  const target = lg.gateBase * SEASON_ROUNDS * (REVENUE_UPLIFT[Math.min(lg.level, 5)] ?? 1.2);
  const scale = refMedian > 0 ? target / refMedian : 1;
  byLeague.set(leagueId, scale);
  return scale;
}

/* =========================================================================
   Revenue streams (all in £/season unless the name says otherwise)
   ========================================================================= */

/** Home league fixtures in a season for this club's division. */
export function homeGamesPerSeason(lg: LeagueDef): number {
  return Math.max(1, Math.round(((lg.clubCount - 1) * lg.rounds) / 2));
}

/** Annual matchday income. */
export function matchdayBase(state: GameState, club = userClub(state)): number {
  const lg = getLeague(club.leagueId);
  return refMatchdayAnnual(lg.level, clubStature(state, club)) * economyScale(state, club.leagueId);
}

/** Annual TV money: the league's equal share, on this game's scale. */
export function tvIncomeAnnual(state: GameState, club = userClub(state)): number {
  const lg = getLeague(club.leagueId);
  return lg.tvEqualShare * 1e6 * economyScale(state, club.leagueId);
}

/**
 * Annual commercial income — shirt, sleeve, naming rights and kit, as one
 * passive stream. The club's partners are assumed rather than negotiated: this
 * scales with league level and stature exactly as the old sponsor market did,
 * so the revenue level is unchanged, but there is nothing for the manager to
 * sell or renew.
 */
export function commercialIncomeAnnual(state: GameState, club = userClub(state)): number {
  const lg = getLeague(club.leagueId);
  return refCommercialAnnual(lg.level, clubStature(state, club)) * economyScale(state, club.leagueId);
}

/** Weekly commercial income. */
export function weeklyCommercial(state: GameState, club = userClub(state)): number {
  return commercialIncomeAnnual(state, club) / YEAR_WEEKS;
}

/** Deterministic weekly merchandise average (the live figure varies ±30%). */
export function weeklyMerchBase(state: GameState): number {
  return (matchdayBase(state) * MERCH_RATIO) / YEAR_WEEKS;
}

/**
 * Recurring football revenue: broadcast, matchday and commercial. Transfer
 * income and prize money are excluded — both are one-off and volatile rather
 * than a stable base to spend against.
 */
export function annualFootballRevenue(state: GameState): number {
  const club = userClub(state);
  const md = matchdayBase(state, club);
  return tvIncomeAnnual(state, club) + md + md * MERCH_RATIO + commercialIncomeAnnual(state, club);
}

/* =========================================================================
   Matchday income — replaces the flat GATE_BASE lookup
   ========================================================================= */

/** The user's league fixture in a given round, if any. */
function userFixture(state: GameState, round: number): Fixture | undefined {
  const club = userClub(state);
  return (state.fixtures[club.leagueId] ?? []).find(
    (f) => f.round === round && (f.homeId === state.userClubId || f.awayId === state.userClubId)
  );
}

/** How much of a draw the visitors are: a marquee opponent fills the ground. */
function opponentMult(state: GameState, opponentId: number): number {
  const opp = state.clubs.find((c) => c.id === opponentId);
  if (!opp) return 1;
  return clamp(0.80 + (clubStature(state, opp) - 2.5) * 0.14, 0.80, 1.28);
}

/**
 * Gate receipts for one home fixture: the annual base spread over the
 * division's home games, then bent by who is visiting, how the team is going
 * and how full the ground is likely to be.
 */
export function matchIncome(
  state: GameState,
  opponentId: number,
  competition: 'league' | 'cup' | 'continental' = 'league'
): number {
  const club = userClub(state);
  const lg = getLeague(club.leagueId);
  const perGame = matchdayBase(state, club) / homeGamesPerSeason(lg);
  // Attendance responds to where the club sits and how the fans feel.
  const pos = clamp(userPositionSafe(state), 1, lg.clubCount);
  const formMult = 0.86 + state.fanConfidence / 320 + (lg.clubCount - pos) / (lg.clubCount * 8);
  const compMult = competition === 'continental' ? 1.35 : competition === 'cup' ? 0.90 : 1;
  return Math.round((perGame * opponentMult(state, opponentId) * formMult * compMult) / 1000) * 1000;
}

function userPositionSafe(state: GameState): number {
  const club = userClub(state);
  const lg = getLeague(club.leagueId);
  const fixtures = state.fixtures[club.leagueId] ?? [];
  const pts = new Map<number, { pts: number; gd: number }>();
  for (const c of state.clubs) if (c.leagueId === club.leagueId) pts.set(c.id, { pts: 0, gd: 0 });
  for (const f of fixtures) {
    if (!f.played) continue;
    const h = pts.get(f.homeId);
    const a = pts.get(f.awayId);
    if (!h || !a) continue;
    h.gd += f.homeGoals - f.awayGoals;
    a.gd += f.awayGoals - f.homeGoals;
    if (f.homeGoals > f.awayGoals) h.pts += 3;
    else if (f.homeGoals < f.awayGoals) a.pts += 3;
    else { h.pts++; a.pts++; }
  }
  const rows = [...pts.entries()].sort((x, y) => y[1].pts - x[1].pts || y[1].gd - x[1].gd);
  const i = rows.findIndex(([id]) => id === state.userClubId);
  return i >= 0 ? i + 1 : Math.ceil(lg.clubCount / 2);
}

/**
 * What lands in the bank in the round about to be settled. Zero on an away
 * week — the reference pays gate receipts per home fixture, not as a flat
 * weekly drip, and this is the function `seasonProgression.gateIncome`
 * delegates to so the whole game moves onto the new model at once.
 */
export function weeklyMatchdayIncome(state: GameState, round = state.week): number {
  const f = userFixture(state, round);
  if (!f || f.homeId !== state.userClubId) return 0;
  return matchIncome(state, f.awayId, 'league');
}

/** Per-fixture income preview for the hub/fixture list. */
export function previewMatchIncome(
  state: GameState,
  fixture: Fixture,
  competition: 'league' | 'cup' | 'continental' = 'league'
): { tv: number; matchday: number; total: number; label: string } {
  const tv = Math.round(tvIncomeAnnual(state) / YEAR_WEEKS);
  const home = fixture.homeId === state.userClubId;
  const matchday = home ? matchIncome(state, fixture.awayId, competition) : 0;
  const parts = [`TV +${formatMoney(tv)}`];
  if (matchday > 0) parts.push(`Matchday +${formatMoney(matchday)}`);
  else parts.push('Away — no gate receipts');
  return { tv, matchday, total: tv + matchday, label: parts.join(' · ') };
}

/* =========================================================================
   Transfers: amortization and the ledger scan
   ========================================================================= */

/**
 * Record a transfer fee. The fee itself has already left `budget` at the point
 * of signing; only the 5% agent fee is charged here. The amortization schedule
 * is kept for the season accounts, which report what a signing costs per week
 * across its contract rather than as one lump in the summer.
 */
export function recordTransferExpense(state: GameState, fee: number, contractYears = 3): void {
  const fin = ensureFinances(state);
  const agentFee = Math.round(fee * 0.05);
  state.budget -= agentFee;
  fin.seasonExpenses.transfers += fee;
  fin.seasonExpenses.agentFees += agentFee;
  const weeks = Math.max(1, Math.round((contractYears || 3) * YEAR_WEEKS));
  fin.amortizations.push({ weeklyCost: (fee + agentFee) / weeks, weeksLeft: weeks });
}

export function recordTransferIncome(state: GameState, fee: number): void {
  const fin = ensureFinances(state);
  fin.seasonIncome.sales += fee;
}

/**
 * `engine/transferMarket.ts` is owned by another phase and does not call
 * `recordTransferExpense` yet, which would leave the season accounts blank in
 * real play. Until that call site exists, transfers are picked up from the
 * ledger entries the market already writes. Idempotent via `seenLedger`, so
 * repeated ticks never double-count a signing.
 */
function absorbLedgerTransfers(state: GameState, fin: FinanceState): void {
  for (const e of state.ledger) {
    const isBuy = e.desc.startsWith('Signed ') && e.amount < 0;
    const isSale = e.desc.startsWith('Sold ') && e.amount > 0;
    if (!isBuy && !isSale) continue;
    const key = `${state.seasonYear}|${e.week}|${e.desc}|${e.amount}`;
    if (fin.seenLedger.includes(key)) continue;
    fin.seenLedger.push(key);
    if (isBuy) recordTransferExpense(state, -e.amount, 3);
    else recordTransferIncome(state, e.amount);
  }
  // The ledger itself is capped at 24 entries; keep the dedupe set bounded too.
  if (fin.seenLedger.length > 120) fin.seenLedger = fin.seenLedger.slice(-120);
}

export function weeklyAmortization(fin: FinanceState): number {
  return fin.amortizations.reduce((s, a) => s + a.weeklyCost, 0);
}

/* =========================================================================
   The weekly tick
   ========================================================================= */

function weeklyStaffWages(state: GameState): number {
  const st = state.staff;
  const legacy = st ? (st.coach + st.physio + st.scout) * 10_000 : 0;
  // Named coaches (Staff Hub) and named scouts (Scouting Network) carry their
  // own wage, on top of the legacy per-level figure — kept in sync with
  // seasonProgression.ts's staffWageBill(), which is what actually debits the
  // budget week to week; this copy only feeds the season-expense ledger.
  const coaches = (state.facilities?.coaches ?? []).reduce((sum, c) => sum + c.wage, 0);
  const scouts = (state.scouting?.scouts ?? []).reduce((sum, s) => sum + s.wage, 0);
  return legacy + coaches + scouts;
}

/**
 * Ground and academy running costs. The ground's figure keys off stature rather
 * than a build level: stadium expansion was removed, so capacity is fixed and a
 * bigger club simply runs a bigger ground.
 */
function weeklyUpkeep(state: GameState): { academy: number; stadium: number } {
  const club = userClub(state);
  const scale = economyScale(state, club.leagueId);
  const academy = Math.round([0, 0.001, 0.003, 0.015][clamp(state.academyLevel ?? 1, 1, 3)] * 1e6 * scale);
  const stadium = Math.round(0.0005 * 1e6 * scale * statureLerp(FIN_STADIUM_MULT, clubStature(state, club)));
  return { academy, stadium };
}

/**
 * The one weekly hook. Called from `seasonProgression.playRound` with a single
 * added line; everything else in this module hangs off it.
 *
 * `budget` has already been moved by the caller for gate receipts, player wages
 * and staff wages — those are recorded into the season buckets here but NOT
 * charged again. Everything else (TV, commercial, merchandising, facility
 * upkeep) is both charged and recorded here.
 */
export function tickFinances(state: GameState, round = state.week, weeks = 1): void {
  const fin = ensureFinances(state);
  const club = userClub(state);

  // A new season started since the last tick: settle the old one first.
  if (fin.seasonYear !== state.seasonYear) rolloverSeason(state, fin);

  absorbLedgerTransfers(state, fin);

  /* --- income ----------------------------------------------------------- */
  const weeklyTV = tvIncomeAnnual(state, club) / YEAR_WEEKS;
  // Brands want association with success: a small form uplift on commercial.
  const recentWins = countRecentWins(state, round);
  const commercial = weeklyCommercial(state, club) * (1 + recentWins * 0.008);
  const merch = weeklyMerchBase(state) * (1 + recentWins * 0.06) * (0.70 + Math.random() * 0.60);
  const income = Math.round((weeklyTV + commercial + merch) * weeks);

  /* --- expenses this hook owns ------------------------------------------ */
  const upkeep = weeklyUpkeep(state);
  const expenses = Math.round((upkeep.academy + upkeep.stadium) * weeks);

  state.budget += income - expenses;
  state.ledger.unshift({ week: round, desc: 'TV & commercial income', amount: income });
  state.ledger = state.ledger.slice(0, 24);

  fin.seasonIncome.tv += Math.round(weeklyTV * weeks);
  fin.seasonIncome.sponsorship += Math.round(commercial * weeks);
  fin.seasonIncome.merchandise += Math.round(merch * weeks);
  fin.seasonExpenses.academyUpkeep += Math.round(upkeep.academy * weeks);
  fin.seasonExpenses.stadiumMaint += Math.round(upkeep.stadium * weeks);

  // Recorded, not charged — the caller already moved the money.
  fin.seasonIncome.matchday += weeklyMatchdayIncome(state, round);
  fin.seasonExpenses.wages += Math.round(clubWageBill(state, club.id) * weeks);
  fin.seasonExpenses.staff += Math.round(weeklyStaffWages(state) * weeks);

  fin.weeksElapsed += weeks;
  fin.balanceHistory.push({ year: state.seasonYear, week: round, balance: state.budget });
  if (fin.balanceHistory.length > 180) fin.balanceHistory = fin.balanceHistory.slice(-180);

  /* --- amortization decay ------------------------------------------------ */
  for (const a of fin.amortizations) a.weeksLeft -= weeks;
  fin.amortizations = fin.amortizations.filter((a) => a.weeksLeft > 0);

  fin.boardConfidence = clamp(state.board.confidence, 0, 100);
}

function countRecentWins(state: GameState, round: number): number {
  const club = userClub(state);
  const fixtures = state.fixtures[club.leagueId] ?? [];
  let wins = 0;
  for (let r = round; r > round - 3 && r > 0; r--) {
    const f = fixtures.find((x) => x.round === r && x.played && (x.homeId === club.id || x.awayId === club.id));
    if (!f) continue;
    const gf = f.homeId === club.id ? f.homeGoals : f.awayGoals;
    const ga = f.homeId === club.id ? f.awayGoals : f.homeGoals;
    if (gf > ga) wins++;
  }
  return wins;
}

/* =========================================================================
   Season rollover
   ========================================================================= */

function totalIncome(fin: FinanceState): number {
  return Object.values(fin.seasonIncome).reduce((s, v) => s + v, 0);
}
function totalExpenses(fin: FinanceState): number {
  return Object.values(fin.seasonExpenses).reduce((s, v) => s + v, 0);
}
export { totalIncome as totalSeasonIncome, totalExpenses as totalSeasonExpenses };

/**
 * What the board puts up for the coming season, before carryover: the club's
 * baseline in whatever division it is now in, bent by last season's finish and
 * by how much faith the board has. Promotion therefore raises the budget by
 * moving `baseTransferBudget` onto the higher division's `startingBudget`,
 * and relegation cuts it the same way.
 */
export function seasonAllocation(
  state: GameState,
  fin: FinanceState,
  position: number,
  clubCount: number
): { transfer: number; wage: number } {
  const club = userClub(state);
  const base = baseTransferBudget(state, club);
  const mult = finishMultiplier(position, clubCount) * confidenceMultiplier(fin.boardConfidence);
  // The wage budget tracks the squad the club actually has, so a season of
  // signings raises the following season's ceiling rather than stranding the
  // squad above it. The same finish/confidence bend applies on top.
  const committed = clubWageBill(state, club.id);
  const baseWage = Math.max(club.wageBudget ?? 0, Math.round(committed * WAGE_BUDGET_HEADROOM));
  return {
    transfer: Math.round((base * mult) / 100_000) * 100_000,
    wage: Math.round((baseWage * clamp(mult, 0.9, 1.35)) / 100) * 100,
  };
}

/**
 * Settle the completed season. Driven off `fin.seasonYear` drifting behind
 * `state.seasonYear` rather than a second hook in `seasonProgression`, so the
 * whole phase costs that file exactly one added line.
 */
function rolloverSeason(state: GameState, fin: FinanceState): void {
  const club = userClub(state);
  const last = state.history[state.history.length - 1];
  const oldLeague = getLeague(fin.leagueId);
  const newLeague = getLeague(club.leagueId);

  const profit = totalIncome(fin) - totalExpenses(fin);
  fin.history.push({
    year: fin.seasonYear,
    leagueId: fin.leagueId,
    position: last?.position ?? 0,
    income: totalIncome(fin),
    expenses: totalExpenses(fin),
    profit,
    balance: state.budget,
    confidence: fin.boardConfidence,
  });
  if (fin.history.length > 20) fin.history.shift();

  // Parachute payments: dropping out of a top flight into the tier below.
  if (oldLeague.level === 1 && newLeague.level === 2) fin.parachuteYears = 2;
  else if (newLeague.level < 2) fin.parachuteYears = 0;
  let parachute = 0;
  if (fin.parachuteYears > 0 && newLeague.level === 2) {
    const above = leagueAbove(newLeague.id) ?? oldLeague;
    const base = above.gateBase * SEASON_ROUNDS * (REVENUE_UPLIFT[Math.min(above.level, 5)] ?? 1.2);
    parachute = Math.round(base * (fin.parachuteYears >= 2 ? 0.45 : 0.27));
    state.budget += parachute;
    fin.parachuteYears--;
    pushInbox(state, {
      category: 'board',
      title: `Parachute payment received: ${formatMoney(parachute)}`,
      body: `Relegation from the ${above.name} brings a parachute payment of ${formatMoney(parachute)}.\n\n${fin.parachuteYears} further payment${fin.parachuteYears === 1 ? '' : 's'} remain${fin.parachuteYears === 1 ? 's' : ''} if the club stays at this level.`,
    });
  }

  /* --- the board sets next season's budgets ------------------------------ */
  const alloc = seasonAllocation(state, fin, last?.position ?? 0, oldLeague.clubCount);
  const carried = Math.min(
    Math.round(Math.max(0, state.budget) * BUDGET_CARRYOVER),
    Math.round(alloc.transfer * MAX_CARRYOVER_RATIO)
  );
  const previous = state.budget;
  state.budget = alloc.transfer + carried;
  state.wageBudget = alloc.wage;
  pushInbox(state, {
    category: 'board',
    title: `Budgets set for ${state.seasonYear}/${(state.seasonYear + 1) % 100}`,
    body: `The board has set a transfer budget of ${formatMoney(alloc.transfer)}`
      + (carried > 0 ? `, plus ${formatMoney(carried)} carried over from last season's unspent funds` : '')
      + `, and a wage budget of ${formatMoney(alloc.wage)} per week.`
      + (previous > alloc.transfer
        ? `\n\nLast season closed with ${formatMoney(previous)} in the bank; half of any surplus carries over.`
        : ''),
  });

  // Reset the season counters. `parachute` is recorded against the new season.
  fin.seasonIncome = emptyIncome();
  fin.seasonIncome.parachute = parachute;
  fin.seasonExpenses = emptyExpenses();
  fin.pointsDeduction = 0;
  fin.boardFundsRequested = false;
  fin.seenLedger = [];
  fin.seasonYear = state.seasonYear;
  fin.leagueId = club.leagueId;
  // A division change repriced everything; drop the memo.
  scaleCache.delete(state);
}

/* =========================================================================
   Board confidence, grants and funding requests
   ========================================================================= */

/** What the board would put up if asked today. Confidence is the biggest
 *  lever: a delighted board nearly doubles the grant, an exhausted one all but
 *  closes the chequebook. */
export function boardGrantAmount(state: GameState, fin = financesView(state)): number {
  const club = userClub(state);
  const lg = getLeague(club.leagueId);
  const base = baseTransferBudget(state, club) * 0.20;
  const h = fin.boardConfidence;
  const confMult = h >= 90 ? 1.95 : h >= 85 ? 1.65 : h >= 70 ? 1.30 : h >= 55 ? 1.05 : h >= 35 ? 0.78 : h >= 20 ? 0.52 : 0.28;
  const pos = userPositionSafe(state) / Math.max(1, lg.clubCount);
  const posMult = pos <= 0.05 ? 1.28 : pos <= 0.2 ? 1.12 : pos >= 0.8 ? 0.82 : 1.0;
  const balMult = state.budget > base * 1.5 ? 1.15 : state.budget < 0 ? 0.62 : 1.0;
  return Math.round(base * confMult * posMult * balMult / 100_000) * 100_000;
}

export function canRequestBoardFunds(state: GameState): boolean {
  const fin = financesView(state);
  return !fin.boardFundsRequested && boardGrantAmount(state, fin) > 0;
}

/** Ask the board for money. Once a season, win or lose. */
export function requestBoardFunds(state: GameState): { state: GameState; granted: number } {
  if (!canRequestBoardFunds(state)) return { state, granted: 0 };
  const s: GameState = structuredClone(state);
  const fin = ensureFinances(s);
  fin.boardFundsRequested = true;
  const offered = boardGrantAmount(s, fin);
  // A board with no faith in the manager says no outright.
  const chance = clamp(0.25 + fin.boardConfidence / 130, 0.1, 0.95);
  if (Math.random() > chance) {
    pushInbox(s, {
      category: 'board',
      title: 'Funding request declined',
      body: 'The board has considered your request for additional funds and declined. Results on the pitch will have to come first.',
    });
    return { state: s, granted: 0 };
  }
  s.budget += offered;
  fin.seasonIncome.grants += offered;
  s.ledger.unshift({ week: s.week, desc: 'Board grant', amount: offered });
  pushInbox(s, {
    category: 'board',
    title: `Board grants ${formatMoney(offered)}`,
    body: `The board has released ${formatMoney(offered)} of additional funds for the transfer budget. The wage budget is unchanged — this buys players, it does not pay them.`,
  });
  return { state: s, granted: offered };
}

/* =========================================================================
   Points deductions on the table
   ========================================================================= */

/**
 * Apply this season's points deductions to a computed league table. Kept as a
 * pure view transform rather than a mutation so it can only ever be applied
 * once per render, and so `computeTable` (owned by another phase) is untouched.
 *
 * The only writer left is the `points_deduction` scenario — FFP and the squad
 * cost ratio, which used to dock points, were removed with the move to a
 * FIFA-style wage budget.
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

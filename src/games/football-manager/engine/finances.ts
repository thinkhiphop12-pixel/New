/**
 * Phase 8 — club finances.
 *
 * Ports the reference build's `js/finances.js` model: three sellable sponsor
 * slots with performance clauses, a separate kit deal, a matchday income model
 * that replaces the flat `GATE_BASE` lookup, TV equal share, merchandising,
 * parachute payments, transfer-fee amortization, the UEFA-style squad cost
 * ratio (SCR) with its embargo/deduction ladder, and FFP on a three-year
 * rolling loss.
 *
 * ── Money units ──────────────────────────────────────────────────────────
 * The reference works in £m; this engine works in whole pounds everywhere
 * (`Player.wage`, `GameState.budget`, `LedgerEntry.amount`). Every reference
 * constant below is therefore stated in £m and multiplied by 1e6 at the point
 * of use, so the tables stay readable against their source.
 *
 * ── Economy calibration (read this before retuning) ───────────────────────
 * The reference's revenue tables are real-world sized (a Premier League club
 * earns £110m TV + £30-70m matchday + £40-150m commercial). This codebase's
 * *wage* economy is not: the median Premier League squad here costs £9.1m a
 * year and the most expensive £31m, roughly a tenth of the real figure, and
 * the compression is not uniform — League Two wages (£1.4m/yr) are close to
 * real while Premier League wages are ~10x too low.
 *
 * Dropping the reference's real revenues in unmodified would therefore do two
 * bad things at once: it would print money into `budget` (breaking the
 * transfer market), and it would pin every club's squad cost ratio near 0.05,
 * making SCR/FFP decorative — the exact "compiles clean but is silently
 * wrong" failure this project keeps hitting.
 *
 * So every revenue stream is multiplied by a per-league `economyScale`, which
 * is *derived*, not hand-tuned: it is the ratio between what this game's own
 * already-calibrated `LeagueDef.gateBase` says a season of income is worth in
 * that division and what the reference model would produce for the same set of
 * clubs. The relative shape of the reference model (division ladder, stature
 * curve, slot shares, stream mix) is preserved exactly; only the absolute level
 * is pulled onto this game's scale.
 *
 * Consequence to be aware of: headline commercial figures here read low against
 * real football (a top Premier League side lands around £8-12m of commercial
 * income, not £100m). That is deliberate and reversible — raise the wage/fee
 * economy and set `REVENUE_UPLIFT` to 1 with `economyScale` forced to 1, and
 * the model produces real-world numbers unchanged.
 */
import type {
  Amortization, BalancePoint, Club, FinanceState, Fixture, GameState, KitDeal, KitOffer,
  LeagueDef, SponsorClause, SponsorDeal, SponsorOffer, SponsorSlotId, TicketTier,
} from './types';
import { getLeague, SEASON_ROUNDS, leagueAbove } from './gameRules';
import { clubWageBill } from './teamManagement';
import { clamp, pickRandom, formatMoney, weeklyWage } from './utils';
import { pushInbox } from './inbox';
import { clubBudget } from './jobMarket';

/* =========================================================================
   Reference constants (£m unless noted). Kept at the reference's own values.
   ========================================================================= */

/** Weeks in a financial year — the basis for every "annual" figure. */
const YEAR_WEEKS = 52;

/** Upper bound on continuous club stature. The reference's tables stop at 5;
 *  this goes to 6 so a division's outliers have somewhere to go (see
 *  `FIN_STADIUM_MULT`). */
const MAX_STATURE = 6;

/** Commercial slots. `share` is the fraction of the shirt-front market rate;
 *  these three numbers are the reference's tuned values and must not drift. */
export const SPONSOR_SLOTS: Record<SponsorSlotId, { label: string; share: number; terms: number[] }> = {
  shirt: { label: 'Shirt Front', share: 1.00, terms: [1, 2, 3] },
  sleeve: { label: 'Sleeve', share: 0.22, terms: [1, 2, 3] },
  stadium: { label: 'Stadium Naming Rights', share: 0.60, terms: [3, 5, 8] },
};

/** Shirt-front market rate by league level, before the stature multiplier. */
const SPONSOR_BASE = [0, 4, 2, 0.5, 0.2, 0.08];
/** How hard club stature bends the shirt-front rate, by league level. */
const SPONSOR_REP_MULT = [0, 14, 1.8, 1.0, 0.8, 0.6];
/** Kit-deal floor by league level: even a small club gets paid for its
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
 *  bill 20x the division's smallest — with the reference's own 2.10 ceiling a
 *  top-four club sat at 96% squad cost ratio on day one and could never
 *  comply. Verified in scripts/finance-preview.ts. */
const FIN_STADIUM_MULT = [0, 0.18, 0.45, 1.0, 1.60, 2.10, 4.20];
/** Merchandise as a fraction of matchday income. */
const MERCH_RATIO = 0.22;

/** The squad cost ratio cap. UEFA's Financial Sustainability Regulations. */
export const SCR_LIMIT = 0.70;
/** Weeks over the cap before the league imposes a transfer embargo. */
const SCR_EMBARGO_WEEKS = 8;
/** Weeks under embargo, still over the cap, before points are docked. */
const SCR_DEDUCTION_WEEKS = 52;
const SCR_DEDUCTION_POINTS = 6;
/** Weeks in FFP breach before points are docked. */
const FFP_BREACH_WEEKS = 8;
const FFP_DEDUCTION_POINTS = 10;
/** Three-year permitted loss, as a fraction of one year's football revenue.
 *  Real PSR allows £105m against ~£250m of revenue; 0.42 reproduces that
 *  ratio at every level of this game's economy without a magic absolute. */
const FFP_LOSS_RATIO = 0.42;
/** How often the board is nudged while a breach continues, in weeks. */
const FFP_REMINDER_WEEKS = 10 / 7;

/** Ticket tiers: price multiplier and the attendance response it provokes. */
export const TICKET_TIERS: Record<TicketTier, { label: string; mult: number; attEffect: number; desc: string }> = {
  cheap: { label: 'Cheap', mult: 0.75, attEffect: +0.10, desc: 'Low prices — packed stands, less income, fans love it.' },
  standard: { label: 'Standard', mult: 1.00, attEffect: 0, desc: 'Balanced pricing — steady income and attendance.' },
  high: { label: 'High', mult: 1.25, attEffect: -0.06, desc: 'Pricey — more income per fan, some empty seats.' },
  premium: { label: 'Premium', mult: 1.50, attEffect: -0.14, desc: 'Top prices — maximum yield, attendance suffers.' },
};

const SPONSOR_NAMES: string[][] = [
  ['RegioMedia', 'CityFit Gym', 'LocalBank', 'TownBrew', 'MetroGas', 'CoastAir'],
  ['SportsBet Online', 'NationWide Auto', 'TelecomPlus', 'Premier Foods', 'BritAir', 'HealthFirst'],
  ['GlobalTech Corp', 'MegaAuto Group', 'Pinnacle Finance', 'CryptoX Global', 'AeroLine Intl', 'Nexus Energy'],
];
const KIT_MAKERS = ['AdiSport', 'ProKit', 'StrikeX', 'NovaSport', 'EliteKit', 'AlphaWear'];

/** Revenue target as a multiple of the league's existing season gate take.
 *  Slightly above 1 at the top (the new streams should be worth selling) and
 *  well above 1 at the bottom, where this game's gate income alone does not
 *  cover a League Two wage bill and every club would sit permanently in
 *  breach. Verified against real wage bills in scripts/finance-preview.ts. */
const REVENUE_UPLIFT = [0, 1.15, 1.20, 1.40, 2.20, 2.60];

/* =========================================================================
   Lazy state
   ========================================================================= */

function emptyIncome() {
  return { tv: 0, matchday: 0, sponsorship: 0, merchandise: 0, prizes: 0, sales: 0, parachute: 0, grants: 0 };
}
function emptyExpenses() {
  return { wages: 0, staff: 0, transfers: 0, agentFees: 0, academyUpkeep: 0, stadiumMaint: 0 };
}

/** Fresh finance state for a club, with a shirt sponsor and kit deal already
 *  in place (the club had commercial partners before you arrived) and the
 *  sleeve/stadium slots unsold for the manager to sell. */
export function initFinances(state: GameState): FinanceState {
  const club = userClub(state);
  const fin: FinanceState = {
    seasonYear: state.seasonYear,
    leagueId: club.leagueId,
    boardConfidence: clamp(state.board?.confidence ?? 50, 0, 100),
    shirt: null,
    sleeve: null,
    stadium: null,
    kitDeal: null,
    needsRenewal: [],
    kitNeedsRenewal: false,
    offers: {},
    kitOffers: null,
    ticketPricing: 'standard',
    seasonIncome: emptyIncome(),
    seasonExpenses: emptyExpenses(),
    balanceHistory: [],
    history: [],
    ffpRolling: [],
    ffpBreachWeeks: 0,
    ffpDeductedThisBreach: false,
    amortizations: [],
    scr: 0,
    scrOverWeeks: 0,
    transferEmbargo: false,
    embargoWeeks: 0,
    pointsDeduction: 0,
    seenLedger: [],
    parachuteYears: 0,
    boardFundsRequested: false,
    weeksElapsed: 0,
  };
  fin.shirt = genSponsorDeal(state, fin, 'shirt', 2 + Math.floor(Math.random() * 2));
  fin.kitDeal = genKitDeal(state, 2 + Math.floor(Math.random() * 3));
  return fin;
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
 * or 5), which would hand half the Premier League an identical sponsorship
 * offer. Squad strength relative to the rest of the division spreads them back
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
  return SPONSOR_BASE[lvl] * (1 + repFrac * repFrac * SPONSOR_REP_MULT[lvl]) * 1e6;
}

function refKitAnnual(level: number, stature: number): number {
  // Half the shirt-front rate, floored at what the division alone is worth.
  const floor = KIT_LEVEL_FLOOR[Math.min(level, 5)] * 1e6;
  return Math.max(floor, refShirtMarketAnnual(level, stature) * 0.5);
}

function refCommercialAnnual(level: number, stature: number): number {
  const shirt = refShirtMarketAnnual(level, stature);
  const slots = SPONSOR_SLOTS.shirt.share + SPONSOR_SLOTS.sleeve.share + SPONSOR_SLOTS.stadium.share;
  return shirt * slots + refKitAnnual(level, stature);
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
   Wage calibration
   ========================================================================= */

/** Share of a club's football revenue its player wages should cost.
 *
 *  Real clubs run 60-70%, and the squad-cost ratio that triggers an embargo
 *  is 70% — but SCR counts wages *plus* transfer amortization, so wages alone
 *  have to leave room for a normal amount of transfer spending underneath the
 *  limit. 0.52 puts a well-run club comfortably clear while a heavy spender
 *  still breaches, which is the behaviour the SCR ladder exists to produce. */
export const TARGET_WAGE_SHARE = 0.52;

/** Years a transfer fee is written down over. Real accounting spreads it
 *  across the signed contract, and UEFA caps that write-down at five years —
 *  which is also what a big signing is typically tied to. Three years charged
 *  a fee 67% faster than the rules require and, with wages now a realistic
 *  share of revenue, left almost no room under the squad-cost limit to
 *  actually spend a transfer budget. */
export const AMORT_YEARS = 5;

/* =========================================================================
   Revenue streams (all in £/season unless the name says otherwise)
   ========================================================================= */

export function ticketMult(tier: TicketTier, level: number): number {
  const t = TICKET_TIERS[tier] ?? TICKET_TIERS.standard;
  // Fans in lower divisions are far more price-sensitive.
  const elasticity = 1 + (level - 1) * 0.35;
  return t.mult * Math.max(0.4, 1 + t.attEffect * elasticity);
}

/** Home league fixtures in a season for this club's division. */
export function homeGamesPerSeason(lg: LeagueDef): number {
  return Math.max(1, Math.round(((lg.clubCount - 1) * lg.rounds) / 2));
}

/** Annual matchday income at standard prices, before the pricing tier. */
export function matchdayBase(state: GameState, club = userClub(state)): number {
  const lg = getLeague(club.leagueId);
  return refMatchdayAnnual(lg.level, clubStature(state, club)) * economyScale(state, club.leagueId);
}

/** Annual TV money: the league's equal share, on this game's scale. */
export function tvIncomeAnnual(state: GameState, club = userClub(state)): number {
  const lg = getLeague(club.leagueId);
  return lg.tvEqualShare * 1e6 * economyScale(state, club.leagueId);
}

/** The shirt-front market rate this club commands, £/season. */
export function sponsorMarketAnnual(state: GameState, club = userClub(state)): number {
  const lg = getLeague(club.leagueId);
  return refShirtMarketAnnual(lg.level, clubStature(state, club)) * economyScale(state, club.leagueId);
}

function kitMarketAnnual(state: GameState, club = userClub(state)): number {
  const lg = getLeague(club.leagueId);
  return refKitAnnual(lg.level, clubStature(state, club)) * economyScale(state, club.leagueId);
}

/** Combined weekly income from every signed commercial deal. */
export function weeklyCommercial(fin: FinanceState): number {
  return (fin.shirt?.weeklyValue ?? 0)
    + (fin.sleeve?.weeklyValue ?? 0)
    + (fin.stadium?.weeklyValue ?? 0)
    + (fin.kitDeal ? fin.kitDeal.annualValue / YEAR_WEEKS : 0);
}

/** Deterministic weekly merchandise average (the live figure varies ±30%). */
export function weeklyMerchBase(state: GameState): number {
  return (matchdayBase(state) * MERCH_RATIO) / YEAR_WEEKS;
}

/**
 * Recurring football revenue the squad cost is measured against: broadcast,
 * matchday and commercial. Transfer income and prize money are excluded — both
 * are one-off and volatile rather than a stable base to spend against, which
 * is exactly how UEFA's regulations define it.
 */
export function annualFootballRevenue(state: GameState, fin = financesView(state)): number {
  const club = userClub(state);
  const lg = getLeague(club.leagueId);
  const md = matchdayBase(state, club) * ticketMult(fin.ticketPricing, lg.level);
  return tvIncomeAnnual(state, club) + md + md * MERCH_RATIO + weeklyCommercial(fin) * YEAR_WEEKS;
}

/**
 * The same revenue base for *any* club, at market rates.
 *
 * `annualFootballRevenue` reads the user's negotiated sponsorship and ticket
 * pricing, neither of which exists for an AI club (or for anyone on the very
 * first week of a save). This values the commercial line at what the club
 * would command instead, so wage calibration can price all 542 clubs on the
 * same basis the SCR will later judge them by.
 */
export function clubFootballRevenue(state: GameState, club: Club): number {
  const md = matchdayBase(state, club);
  const commercialSlots = SPONSOR_SLOTS.shirt.share + SPONSOR_SLOTS.sleeve.share + SPONSOR_SLOTS.stadium.share;
  const commercial = sponsorMarketAnnual(state, club) * commercialSlots + kitMarketAnnual(state, club);
  return tvIncomeAnnual(state, club) + md + md * MERCH_RATIO + commercial;
}

/**
 * Rescale every club's wage bill to a realistic share of its own revenue.
 *
 * Run once at `newGame`, after squads, reputations and stature exist. Working
 * club by club rather than league by league matters: a league-wide multiple
 * leaves the poorest side in each division at 150%+ of revenue and therefore
 * embargoed within eight weeks of kick-off, through no decision of the
 * player's. Priced individually, every club starts on a sound footing and any
 * later breach is something the manager actually did.
 *
 * The target is jittered deterministically by club id so a division isn't a
 * row of identical ratios — real clubs run anywhere from prudent to reckless.
 *
 * It scales down as well as up. A handful of clubs in the smallest leagues
 * ship with wage bills above their whole revenue (Cork City at 150%), which
 * predates this calibration but would embargo anyone who took the job inside
 * two months. Pricing them to the same target fixes that without a per-club
 * exception list.
 */
export function clubWageScale(state: GameState, club: Club): number {
  const squad = club.playerIds.map((id) => state.players[id]).filter(Boolean);
  if (!squad.length) return 1;
  // Measured against the *unscaled* formula, not the squad's current pay, so
  // the answer is the same however many times this has already been applied.
  const baseBill = squad.reduce((t, p) => t + weeklyWage(p.value, p.rating), 0) * YEAR_WEEKS;
  const revenue = clubFootballRevenue(state, club);
  if (baseBill <= 0 || revenue <= 0) return 1;
  // ±0.06 around the target, stable for a given club.
  const jitter = ((club.id * 2654435761) % 1000) / 1000 * 0.12 - 0.06;
  return clamp(((TARGET_WAGE_SHARE + jitter) * revenue) / baseBill, 0.25, 15);
}

/** Price one club's squad against its own revenue. Idempotent — `clubWageScale`
 *  reads the unscaled formula, so re-running never compounds. Call it after
 *  handing a club a newly generated squad. */
export function calibrateClubWages(state: GameState, club: Club): void {
  const scale = clubWageScale(state, club);
  for (const id of club.playerIds) {
    const p = state.players[id];
    if (p) p.wage = weeklyWage(p.value, p.rating, scale);
  }
}

export function calibrateWages(state: GameState): void {
  for (const club of state.clubs) calibrateClubWages(state, club);
}

/**
 * The weekly wage bill this club's revenue can carry — what a board would
 * sanction, before the headroom the caller adds on top.
 *
 * Seeding the ceiling from the inherited squad alone (the original approach)
 * quietly assumed the squad you inherit is the squad the club can afford.
 * That holds on day one and nowhere else: win promotion and your ceiling
 * stays at the tier you left, so the board refuses top-flight wages in a
 * top-flight league.
 */
export function affordableWageBill(state: GameState, club: Club): number {
  return (TARGET_WAGE_SHARE * clubFootballRevenue(state, club)) / YEAR_WEEKS;
}

/* =========================================================================
   Transfer / wage budget split  (EA FC career-mode model)
   ========================================================================= */

/**
 * The two budgets are separate pools, and the board lets you move money
 * between them — the "adjust budget" control in EA FC's career mode.
 *
 * This is the piece that makes the two-pool model work rather than merely
 * exist. A transfer kitty you cannot pay the wages on is not spendable, and a
 * wage ceiling you cannot reach for want of a fee is equally stuck; letting
 * the manager choose the split turns two rigid limits into one decision.
 *
 * A season's wages cost 52 times the weekly figure, so that is the rate: £52k
 * of transfer money buys £1k/week of wage headroom, and back the other way.
 */
export const BUDGET_SPLIT_RATE = YEAR_WEEKS;

/** Weekly wage headroom `amount` of transfer money converts into. */
export function wagesFromTransferMoney(amount: number): number {
  return Math.round(amount / BUDGET_SPLIT_RATE);
}

/** Transfer money `weekly` of wage ceiling converts into. */
export function transferMoneyFromWages(weekly: number): number {
  return Math.round(weekly * BUDGET_SPLIT_RATE);
}

/**
 * Move `amount` of transfer budget into the weekly wage ceiling (positive),
 * or convert wage ceiling back into transfer money (negative).
 *
 * Refuses rather than clamps, so the UI can say why: you cannot spend money
 * you do not have, and you cannot cut the ceiling below what the squad is
 * already contracted to earn — those wages are owed whatever the board wants.
 */
export function shiftBudgetToWages(
  state: GameState,
  amount: number,
): { state: GameState; ok: boolean; error?: string } {
  if (!Number.isFinite(amount) || Math.round(amount) === 0) {
    return { state, ok: false, error: 'Nothing to move.' };
  }
  const s: GameState = structuredClone(state);
  const club = s.clubs.find((c) => c.id === s.userClubId);
  if (!club) return { state, ok: false, error: 'No club.' };
  const ceiling = s.wageBudget ?? Math.round(clubWageBill(s, s.userClubId) * 1.25);

  if (amount > 0) {
    if (amount > s.budget) {
      return { state, ok: false, error: `You only have ${formatMoney(s.budget)} in the transfer budget.` };
    }
    s.budget -= amount;
    s.wageBudget = ceiling + wagesFromTransferMoney(amount);
  } else {
    const weekly = wagesFromTransferMoney(-amount);
    const bill = clubWageBill(s, s.userClubId);
    if (ceiling - weekly < bill) {
      return {
        state,
        ok: false,
        error: `The squad already earns ${formatMoney(bill)}/wk — the ceiling cannot go below that.`,
      };
    }
    s.wageBudget = ceiling - weekly;
    s.budget += transferMoneyFromWages(weekly);
  }
  return { state: s, ok: true };
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
 * Gate receipts for one home fixture: annual capacity-and-tier base spread over
 * the division's home games, then bent by who is visiting, how the team is
 * going and how full the ground is likely to be.
 */
export function matchIncome(
  state: GameState,
  opponentId: number,
  competition: 'league' | 'cup' | 'continental' = 'league'
): number {
  const fin = financesView(state);
  const club = userClub(state);
  const lg = getLeague(club.leagueId);
  const perGame = (matchdayBase(state, club) * ticketMult(fin.ticketPricing, lg.level)) / homeGamesPerSeason(lg);
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
   Sponsorship
   ========================================================================= */

function sponsorTier(annual: number): 1 | 2 | 3 {
  // Thresholds sit on this game's scale, not the reference's £m one.
  return annual >= 5e6 ? 3 : annual >= 3e5 ? 2 : 1;
}

function genSponsorClauses(state: GameState, weeklyValue: number): SponsorClause[] {
  const r = (v: number) => Math.round(v);
  const annual = weeklyValue * YEAR_WEEKS;
  const pool: SponsorClause[] = [
    { type: 'win', amount: r(weeklyValue * 1.5) },
    { type: 'title', amount: r(annual * 0.50) },
    { type: 'topHalf', amount: r(annual * 0.15) },
  ];
  if (getLeague(userClub(state).leagueId).level > 1) pool.push({ type: 'promotion', amount: r(annual * 0.40) });
  const n = 1 + (Math.random() < 0.5 ? 1 : 0);
  const picked: SponsorClause[] = [];
  while (picked.length < n && pool.length) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return picked;
}

function genSponsorDeal(
  state: GameState,
  fin: FinanceState,
  slot: SponsorSlotId,
  termSeasons: number,
  confidence = fin.boardConfidence,
  goodSeason = false
): SponsorDeal {
  const cfg = SPONSOR_SLOTS[slot];
  let annual = sponsorMarketAnnual(state) * cfg.share * (0.85 + Math.random() * 0.3);
  if (goodSeason) annual *= 1.10;
  if (confidence >= 65) annual *= 1.05;
  else if (confidence < 30) annual *= 0.88;
  const tier = sponsorTier(annual);
  return {
    name: pickRandom(SPONSOR_NAMES[tier - 1]),
    tier,
    slot,
    weeklyValue: Math.round(annual / YEAR_WEEKS),
    seasonsLeft: termSeasons,
    termSeasons,
    // Only the shirt-front deal carries performance clauses.
    clauses: slot === 'shirt' ? genSponsorClauses(state, Math.round(annual / YEAR_WEEKS)) : [],
  };
}

/** Three competing offers for a slot: short, medium and long term. Longer
 *  terms pay a little more per week but lock in today's rate. */
export function genSponsorOffers(state: GameState, slot: SponsorSlotId, goodSeason = false): SponsorOffer[] {
  const fin = ensureFinances(state);
  const cfg = SPONSOR_SLOTS[slot];
  const used = new Set<string>();
  return cfg.terms.map((term, i) => {
    const sp = genSponsorDeal(state, fin, slot, term, fin.boardConfidence - 10 + i * 12, goodSeason && i > 0);
    // Disambiguate a repeated name with a Roman-numeral suffix rather than a
    // fixed word — the base pool already includes names like "MegaAuto
    // Group", and appending a fixed " Group" onto that produced "MegaAuto
    // Group Group".
    if (used.has(sp.name)) sp.name += ` ${['II', 'III'][used.size - 1] ?? used.size + 1}`;
    used.add(sp.name);
    sp.weeklyValue = Math.round(sp.weeklyValue * (1 + i * 0.06));
    return sp as SponsorOffer;
  });
}

function genKitDeal(state: GameState, termSeasons: number): KitDeal {
  const annual = kitMarketAnnual(state) * (0.8 + Math.random() * 0.4);
  return {
    name: pickRandom(KIT_MAKERS),
    annualValue: Math.round(annual),
    seasonsLeft: termSeasons,
    termSeasons,
  };
}

export function genKitOffers(state: GameState): KitOffer[] {
  const used = new Set<string>();
  return [2, 3, 4].map((term, i) => {
    const kd = genKitDeal(state, term) as KitOffer;
    if (used.has(kd.name)) kd.name += ` ${['II', 'III'][used.size - 1] ?? used.size + 1}`;
    used.add(kd.name);
    kd.annualValue = Math.round(kd.annualValue * (1 + i * 0.05));
    return kd;
  });
}

export function clauseLabel(c: SponsorClause): string {
  switch (c.type) {
    case 'win': return `${formatMoney(c.amount)} per league win`;
    case 'title': return `${formatMoney(c.amount)} for winning the league`;
    case 'topHalf': return `${formatMoney(c.amount)} for a top-half finish`;
    case 'promotion': return `${formatMoney(c.amount)} for promotion`;
  }
}

/** Pay out a shirt-sponsor performance clause, if the deal carries one. */
export function paySponsorClause(state: GameState, type: SponsorClause['type']): number {
  const fin = ensureFinances(state);
  const c = fin.shirt?.clauses.find((x) => x.type === type);
  if (!c) return 0;
  state.budget += c.amount;
  fin.seasonIncome.sponsorship += c.amount;
  state.ledger.unshift({ week: state.week, desc: `${fin.shirt!.name} bonus`, amount: c.amount });
  return c.amount;
}

/**
 * One negotiation attempt per partner. Success lifts the offer 12–30%; failure
 * either holds firm or walks away entirely. Chance improves with board
 * confidence and league position — a well-run, high-flying club has leverage.
 */
export function negotiateOffer(
  state: GameState,
  offer: SponsorOffer | KitOffer,
  key: 'weeklyValue' | 'annualValue'
): { ok: boolean; withdrawn: boolean; uplift: number } {
  const fin = ensureFinances(state);
  const lg = getLeague(userClub(state).leagueId);
  const pos = userPositionSafe(state);
  const posBonus = (1 - pos / Math.max(lg.clubCount, 1)) * 0.25;
  const chance = 0.35 + fin.boardConfidence / 250 + posBonus;
  offer.negotiated = true;
  if (Math.random() < chance) {
    const uplift = 0.12 + Math.random() * 0.18;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (offer as any)[key] = Math.round((offer as any)[key] * (1 + uplift));
    return { ok: true, withdrawn: false, uplift };
  }
  if (Math.random() < 0.5) return { ok: false, withdrawn: false, uplift: 0 };
  offer.withdrawn = true;
  return { ok: false, withdrawn: true, uplift: 0 };
}

export function acceptSponsorOffer(state: GameState, slot: SponsorSlotId, offer: SponsorOffer): GameState {
  const s: GameState = structuredClone(state);
  const fin = ensureFinances(s);
  const deal: SponsorDeal = {
    name: offer.name, tier: offer.tier, slot, weeklyValue: offer.weeklyValue,
    seasonsLeft: offer.seasonsLeft, termSeasons: offer.termSeasons, clauses: offer.clauses,
  };
  fin[slot] = deal;
  fin.needsRenewal = fin.needsRenewal.filter((x) => x !== slot);
  delete fin.offers[slot];
  pushInbox(s, {
    category: 'board',
    title: `${SPONSOR_SLOTS[slot].label} deal signed with ${deal.name}`,
    body: `${deal.name} become the club's ${SPONSOR_SLOTS[slot].label.toLowerCase()} partner — ${formatMoney(deal.weeklyValue)} per week (${formatMoney(deal.weeklyValue * YEAR_WEEKS)} a season) for ${deal.termSeasons} season${deal.termSeasons === 1 ? '' : 's'}.` +
      (deal.clauses.length ? `\n\nPerformance clauses: ${deal.clauses.map(clauseLabel).join(' · ')}.` : ''),
  });
  return s;
}

export function acceptKitOffer(state: GameState, offer: KitOffer): GameState {
  const s: GameState = structuredClone(state);
  const fin = ensureFinances(s);
  fin.kitDeal = {
    name: offer.name, annualValue: offer.annualValue,
    seasonsLeft: offer.seasonsLeft, termSeasons: offer.termSeasons,
  };
  fin.kitNeedsRenewal = false;
  fin.kitOffers = null;
  pushInbox(s, {
    category: 'board',
    title: `Kit deal agreed with ${offer.name}`,
    body: `${offer.name} will manufacture the club's kit for the next ${offer.termSeasons} seasons, worth ${formatMoney(offer.annualValue)} a season.`,
  });
  return s;
}

/** Buy out a deal early so the slot can be re-sold: costs 50% of what is left. */
export function terminationFee(deal: SponsorDeal): number {
  return Math.round(deal.weeklyValue * YEAR_WEEKS * deal.seasonsLeft * 0.5);
}

export function terminateSponsorDeal(state: GameState, slot: SponsorSlotId): GameState {
  const s: GameState = structuredClone(state);
  const fin = ensureFinances(s);
  const deal = fin[slot];
  if (!deal) return state;
  const fee = terminationFee(deal);
  if (fee > s.budget) return state;
  s.budget -= fee;
  s.ledger.unshift({ week: s.week, desc: `${deal.name} buyout`, amount: -fee });
  fin[slot] = null;
  if (!fin.needsRenewal.includes(slot)) fin.needsRenewal.push(slot);
  delete fin.offers[slot];
  return s;
}

/* =========================================================================
   Transfers: amortization and the ledger scan
   ========================================================================= */

/**
 * Record a transfer fee. Real transfer accounting spreads a fee across the
 * signed contract length instead of expensing it all in the season it is paid,
 * so a single big signing does not itself look like a squad cost breach — only
 * genuinely unaffordable spending relative to revenue should.
 *
 * Only the 5% agent fee touches the balance here; the fee itself has already
 * left `budget` at the point of signing.
 */
export function recordTransferExpense(state: GameState, fee: number, contractYears = AMORT_YEARS): void {
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
 * `recordTransferExpense` yet, which would leave amortization — and therefore
 * the whole squad cost ratio — permanently zero in real play. Until that call
 * site exists, transfers are picked up from the ledger entries the market
 * already writes. Idempotent via `seenLedger`, so repeated ticks never
 * double-count a signing.
 */
function absorbLedgerTransfers(state: GameState, fin: FinanceState): void {
  for (const e of state.ledger) {
    const isBuy = e.desc.startsWith('Signed ') && e.amount < 0;
    const isSale = e.desc.startsWith('Sold ') && e.amount > 0;
    if (!isBuy && !isSale) continue;
    const key = `${state.seasonYear}|${e.week}|${e.desc}|${e.amount}`;
    if (fin.seenLedger.includes(key)) continue;
    fin.seenLedger.push(key);
    if (isBuy) recordTransferExpense(state, -e.amount, AMORT_YEARS);
    else recordTransferIncome(state, e.amount);
  }
  // The ledger itself is capped at 24 entries; keep the dedupe set bounded too.
  if (fin.seenLedger.length > 120) fin.seenLedger = fin.seenLedger.slice(-120);
}

export function weeklyAmortization(fin: FinanceState): number {
  return fin.amortizations.reduce((s, a) => s + a.weeklyCost, 0);
}

/* =========================================================================
   FFP and the squad cost ratio
   ========================================================================= */

export function ffpLimit(state: GameState, fin = financesView(state)): number {
  return -FFP_LOSS_RATIO * annualFootballRevenue(state, fin);
}

export function ffpStatus(
  state: GameState,
  fin = financesView(state)
): { ok: boolean; rolling: number; limit: number; label: string } {
  const rolling = fin.ffpRolling.reduce((s, v) => s + v, 0);
  const limit = ffpLimit(state, fin);
  const label = rolling >= 0 ? 'Profitable'
    : rolling >= limit * 0.34 ? 'Monitoring'
    : rolling >= limit * 0.67 ? 'Warning'
    : rolling >= limit ? 'Breach Risk'
    : 'In Breach';
  return { ok: rolling >= limit, rolling: Math.round(rolling), limit: Math.round(limit), label };
}

export function scrStatus(
  state: GameState,
  fin = financesView(state)
): { scr: number; limit: number; squadCost: number; revenue: number; embargo: boolean } {
  const revenue = annualFootballRevenue(state, fin);
  const squadCost = (weeklyWages(state) + weeklyAmortization(fin)) * YEAR_WEEKS;
  const scr = revenue > 0 ? squadCost / revenue : squadCost > 0 ? 2 : 0;
  return { scr, limit: SCR_LIMIT, squadCost, revenue, embargo: fin.transferEmbargo };
}

/** True while the league forbids new registrations. Transfer screens should
 *  consult this before allowing a signing. */
export function isTransferEmbargoed(state: GameState): boolean {
  return financesView(state).transferEmbargo;
}

/* =========================================================================
   The weekly tick
   ========================================================================= */

function weeklyWages(state: GameState): number {
  const club = userClub(state);
  let total = 0;
  for (const id of club.playerIds) {
    const p = state.players[id];
    if (!p) continue;
    if (p.onLoanUntil !== undefined && p.onLoanUntil > state.seasonYear) continue;
    total += p.wage;
  }
  return total;
}

function weeklyStaffWages(state: GameState): number {
  const st = state.staff;
  const legacy = st ? (st.coach + st.physio + st.scout) * 10_000 : 0;
  // Named coaches (Staff Hub) and named scouts (Scouting Network) carry their
  // own wage, on top of the legacy per-level figure — kept in sync with
  // seasonProgression.ts's staffWageBill(), which is what actually debits the
  // budget week to week; this copy only feeds the FFP/season-expense ledger.
  const coaches = (state.facilities?.coaches ?? []).reduce((sum, c) => sum + c.wage, 0);
  const scouts = (state.scouting?.scouts ?? []).reduce((sum, s) => sum + s.wage, 0);
  return legacy + coaches + scouts;
}

function weeklyUpkeep(state: GameState): { academy: number; stadium: number } {
  const scale = economyScale(state, userClub(state).leagueId);
  // Facility upkeep on the reference's curve, pulled onto this game's scale so
  // it stays a real but survivable line rather than a rounding error.
  const academy = Math.round([0, 0.001, 0.003, 0.015][clamp(state.academyLevel ?? 1, 1, 3)] * 1e6 * scale);
  const stadium = Math.round([0, 0.0005, 0.0015, 0.007][clamp(state.stadiumLevel ?? 1, 1, 3)] * 1e6 * scale);
  return { academy, stadium };
}

function deductPoints(state: GameState, fin: FinanceState, points: number, title: string, body: string): void {
  fin.pointsDeduction += points;
  fin.boardConfidence = clamp(fin.boardConfidence - (points >= 10 ? 12 : 15), 0, 100);
  state.board.confidence = clamp(state.board.confidence - (points >= 10 ? 12 : 15), 1, 99);
  pushInbox(state, { category: 'board', title, body });
  state.news.unshift(title);
}

/**
 * The one weekly hook. Called from `seasonProgression.playRound` with a single
 * added line; everything else in this module hangs off it.
 *
 * `budget` has already been moved by the caller for gate receipts, player wages
 * and staff wages — those are recorded into the season buckets here for FFP but
 * NOT charged again. Everything else (TV, commercial, merchandising, facility
 * upkeep) is both charged and recorded here.
 */
export function tickFinances(state: GameState, round = state.week, weeks = 1): void {
  const fin = ensureFinances(state);
  const club = userClub(state);

  // A new season started since the last tick: settle the old one first.
  if (fin.seasonYear !== state.seasonYear) rolloverSeason(state, fin);

  absorbLedgerTransfers(state, fin);
  autoRenewStaleDeals(state, fin);

  /* --- income ----------------------------------------------------------- */
  const weeklyTV = tvIncomeAnnual(state, club) / YEAR_WEEKS;
  // Brands want association with success: a small form uplift on commercial.
  const recentWins = countRecentWins(state, round);
  const commercial = weeklyCommercial(fin) * (1 + recentWins * 0.008);
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
  fin.seasonExpenses.wages += Math.round(weeklyWages(state) * weeks);
  fin.seasonExpenses.staff += Math.round(weeklyStaffWages(state) * weeks);

  // Per-league-win sponsor clause.
  if (wonThisRound(state, round)) paySponsorClause(state, 'win');

  fin.weeksElapsed += weeks;
  fin.balanceHistory.push({ year: state.seasonYear, week: round, balance: state.budget });
  if (fin.balanceHistory.length > 180) fin.balanceHistory = fin.balanceHistory.slice(-180);

  /* --- amortization decay ------------------------------------------------ */
  for (const a of fin.amortizations) a.weeksLeft -= weeks;
  fin.amortizations = fin.amortizations.filter((a) => a.weeksLeft > 0);

  /* --- squad cost ratio -------------------------------------------------- */
  const { scr } = scrStatus(state, fin);
  fin.scr = Math.round(scr * 1000) / 1000;
  if (fin.scr > SCR_LIMIT) {
    fin.scrOverWeeks += weeks;
    if (!fin.transferEmbargo && fin.scrOverWeeks >= SCR_EMBARGO_WEEKS) {
      fin.transferEmbargo = true;
      fin.embargoWeeks = 0;
      pushInbox(state, {
        category: 'board',
        title: 'Transfer embargo imposed',
        body: `The squad cost ratio — wages plus transfer amortization measured against football revenue — has been above the ${Math.round(SCR_LIMIT * 100)}% limit for ${Math.round(fin.scrOverWeeks)} weeks, and currently stands at ${Math.round(fin.scr * 100)}%.\n\nThe league has imposed a transfer embargo: no new registrations until costs are back under control. Cut the wage bill, sell players, or grow revenue.`,
      });
      state.news.unshift('Transfer embargo imposed — squad cost ratio over the limit.');
    } else if (fin.transferEmbargo) {
      fin.embargoWeeks += weeks;
      if (fin.embargoWeeks >= SCR_DEDUCTION_WEEKS) {
        fin.embargoWeeks = 0;
        deductPoints(state, fin, SCR_DEDUCTION_POINTS,
          `${SCR_DEDUCTION_POINTS}-point deduction: sustained cost-ratio breach`,
          `A full year under transfer embargo with no improvement — the squad cost ratio is still ${Math.round(fin.scr * 100)}% of football revenue. The league has deducted ${SCR_DEDUCTION_POINTS} points.`);
      }
    }
  } else {
    if (fin.transferEmbargo) {
      fin.transferEmbargo = false;
      fin.embargoWeeks = 0;
      pushInbox(state, {
        category: 'board',
        title: 'Transfer embargo lifted',
        body: `The squad cost ratio is back inside the ${Math.round(SCR_LIMIT * 100)}% limit at ${Math.round(fin.scr * 100)}%. The league has lifted the club's transfer embargo with immediate effect.`,
      });
      state.news.unshift('Transfer embargo lifted — costs back under control.');
    }
    fin.scrOverWeeks = 0;
  }

  /* --- Financial Fair Play ----------------------------------------------- */
  const ffp = ffpStatus(state, fin);
  if (!ffp.ok) {
    const before = fin.ffpBreachWeeks;
    fin.ffpBreachWeeks += weeks;
    const willDeduct = fin.ffpBreachWeeks >= FFP_BREACH_WEEKS && !fin.ffpDeductedThisBreach;
    if (!willDeduct
      && Math.floor(fin.ffpBreachWeeks / FFP_REMINDER_WEEKS) > Math.floor(before / FFP_REMINDER_WEEKS)) {
      pushInbox(state, {
        category: 'board',
        title: 'FFP: still out of compliance',
        body: `The club remains in breach of Financial Fair Play — a three-year rolling loss of ${formatMoney(Math.abs(ffp.rolling))} against a permitted ${formatMoney(Math.abs(ffp.limit))}.\n\nCut wages, sell players or grow revenue before the league imposes a points deduction.`,
      });
    }
    if (willDeduct) {
      fin.ffpDeductedThisBreach = true;
      deductPoints(state, fin, FFP_DEDUCTION_POINTS,
        `${FFP_DEDUCTION_POINTS}-point deduction: FFP breach`,
        `The club has been in breach of Financial Fair Play for over two months — a three-year rolling loss of ${formatMoney(Math.abs(ffp.rolling))} against a permitted ${formatMoney(Math.abs(ffp.limit))}. The league has deducted ${FFP_DEDUCTION_POINTS} points.`);
    }
  } else {
    fin.ffpBreachWeeks = 0;
    fin.ffpDeductedThisBreach = false;
  }

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

function wonThisRound(state: GameState, round: number): boolean {
  const f = userFixture(state, round);
  if (!f || !f.played) return false;
  const gf = f.homeId === state.userClubId ? f.homeGoals : f.awayGoals;
  const ga = f.homeId === state.userClubId ? f.awayGoals : f.homeGoals;
  return gf > ga;
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
 * Settle the completed season. Driven off `fin.seasonYear` drifting behind
 * `state.seasonYear` rather than a second hook in `seasonProgression`, so the
 * whole phase costs that file exactly one added line.
 */
function rolloverSeason(state: GameState, fin: FinanceState): void {
  const club = userClub(state);
  const last = state.history[state.history.length - 1];
  const oldLeague = getLeague(fin.leagueId);
  const newLeague = getLeague(club.leagueId);

  // Season-end sponsor clauses.
  if (last) {
    if (last.position === 1) paySponsorClause(state, 'title');
    if (last.position <= Math.ceil(oldLeague.clubCount / 2)) paySponsorClause(state, 'topHalf');
    if (last.promoted) paySponsorClause(state, 'promotion');
  }

  // Three-year rolling FFP window.
  const profit = totalIncome(fin) - totalExpenses(fin);
  fin.ffpRolling.push(Math.round(profit));
  if (fin.ffpRolling.length > 3) fin.ffpRolling.shift();

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

  // Contracts run down a season.
  for (const slot of ['shirt', 'sleeve', 'stadium'] as SponsorSlotId[]) {
    const deal = fin[slot];
    if (!deal) continue;
    deal.seasonsLeft--;
    if (deal.seasonsLeft <= 0) {
      fin[slot] = null;
      if (!fin.needsRenewal.includes(slot)) fin.needsRenewal.push(slot);
      pushInbox(state, {
        category: 'board',
        title: `${SPONSOR_SLOTS[slot].label} deal has expired`,
        body: `${deal.name}'s ${SPONSOR_SLOTS[slot].label.toLowerCase()} contract has run its course. The slot is back on the market — sell it again from the Finances screen.`,
      });
    }
  }
  if (fin.kitDeal) {
    fin.kitDeal.seasonsLeft--;
    if (fin.kitDeal.seasonsLeft <= 0) { fin.kitDeal = null; fin.kitNeedsRenewal = true; }
  }

  // Parachute payments: dropping out of a top flight into the tier below.
  if (oldLeague.level === 1 && newLeague.level === 2) fin.parachuteYears = 2;
  else if (newLeague.level < 2) fin.parachuteYears = 0;
  if (fin.parachuteYears > 0 && newLeague.level === 2) {
    const above = leagueAbove(newLeague.id) ?? oldLeague;
    const base = above.gateBase * SEASON_ROUNDS * (REVENUE_UPLIFT[Math.min(above.level, 5)] ?? 1.2);
    const payment = Math.round(base * (fin.parachuteYears >= 2 ? 0.45 : 0.27));
    state.budget += payment;
    fin.parachuteYears--;
    pushInbox(state, {
      category: 'board',
      title: `Parachute payment received: ${formatMoney(payment)}`,
      body: `Relegation from the ${above.name} brings a parachute payment of ${formatMoney(payment)}.\n\n${fin.parachuteYears} further payment${fin.parachuteYears === 1 ? '' : 's'} remain${fin.parachuteYears === 1 ? 's' : ''} if the club stays at this level.`,
    });
    fin.seasonIncome.parachute = payment; // recorded against the new season
  }

  // Reset the season counters. `parachute` is set above, so preserve it.
  const carriedParachute = fin.seasonIncome.parachute;
  fin.seasonIncome = emptyIncome();
  fin.seasonIncome.parachute = carriedParachute;
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
/**
 * Sponsor renewal is a Finances-screen action, and that screen has no UI for
 * it yet — an inbox message tells the player the slot is open, but there is
 * currently no way to act on it. Left alone, a slot that expires mid-career
 * stays empty forever and commercial income quietly falls to zero, which is
 * a worse experience than a below-market auto-renewal. This is a stopgap:
 * once FinancesScreen exposes renewal, replace the auto-pick below with the
 * real "player chooses" flow and drop this function, rather than layering
 * the two.
 *
 * Fires on the tick right after a slot opens, picking the middling offer
 * (not the best, not the worst) — a save that never opens Finances still
 * gets a sponsor income line rather than a permanent hole in it.
 */
function autoRenewStaleDeals(state: GameState, fin: FinanceState): void {
  // acceptSponsorOffer/acceptKitOffer are the UI-action versions — they
  // structuredClone the state and return a new one, matching every other
  // player-facing accept/reject function in this codebase (see
  // engine/transferMarket.ts). tickFinances mutates `state` in place, so
  // calling those and discarding the return would silently do nothing —
  // caught by re-running scripts/finance-preview.ts and seeing the same
  // expiry recur with no renewal actually applied. Mutate `fin` directly
  // here instead, same style as the rest of this function.
  for (const slot of [...fin.needsRenewal]) {
    const offers = genSponsorOffers(state, slot);
    if (!offers.length) continue;
    const offer = offers[Math.floor(offers.length / 2)];
    fin[slot] = {
      name: offer.name, tier: offer.tier, slot, weeklyValue: offer.weeklyValue,
      seasonsLeft: offer.seasonsLeft, termSeasons: offer.termSeasons, clauses: offer.clauses,
    };
    fin.needsRenewal = fin.needsRenewal.filter((x) => x !== slot);
    pushInbox(state, {
      category: 'board',
      title: `${SPONSOR_SLOTS[slot].label} deal renewed with ${offer.name}`,
      body: `Nobody picked a new ${SPONSOR_SLOTS[slot].label.toLowerCase()} partner, so the board signed the next best offer on the table: ${offer.name}, ${formatMoney(offer.weeklyValue)} a week for ${offer.termSeasons} season${offer.termSeasons === 1 ? '' : 's'}.`,
    });
  }
  if (fin.kitNeedsRenewal) {
    const offers = genKitOffers(state);
    if (offers.length) {
      const offer = offers[Math.floor(offers.length / 2)];
      fin.kitDeal = { name: offer.name, annualValue: offer.annualValue, seasonsLeft: offer.seasonsLeft, termSeasons: offer.termSeasons };
      fin.kitNeedsRenewal = false;
    }
  }
}

export function boardGrantAmount(state: GameState, fin = financesView(state)): number {
  const club = userClub(state);
  const lg = getLeague(club.leagueId);
  // Scaled to the club, not just the division — a board grant at a giant
  // is worth many times one at a newly promoted side.
  const base = clubBudget(state, club.id) * 0.20;
  const h = fin.boardConfidence;
  const confMult = h >= 90 ? 1.95 : h >= 85 ? 1.65 : h >= 70 ? 1.30 : h >= 55 ? 1.05 : h >= 35 ? 0.78 : h >= 20 ? 0.52 : 0.28;
  const pos = userPositionSafe(state) / Math.max(1, lg.clubCount);
  const posMult = pos <= 0.05 ? 1.28 : pos <= 0.2 ? 1.12 : pos >= 0.8 ? 0.82 : 1.0;
  const balMult = state.budget > base * 1.5 ? 1.15 : state.budget < 0 ? 0.62 : 1.0;
  // An embargoed club is not getting more money to spend.
  const embargoMult = fin.transferEmbargo ? 0 : 1;
  return Math.round(base * confMult * posMult * balMult * embargoMult / 100_000) * 100_000;
}

export function canRequestBoardFunds(state: GameState): boolean {
  const fin = financesView(state);
  return !fin.boardFundsRequested && !fin.transferEmbargo && boardGrantAmount(state, fin) > 0;
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
    body: `The board has released ${formatMoney(offered)} of additional funds for the transfer budget. Spend it well — the squad cost ratio still applies.`,
  });
  return { state: s, granted: offered };
}

export function setTicketPricing(state: GameState, tier: TicketTier): GameState {
  const s: GameState = structuredClone(state);
  ensureFinances(s).ticketPricing = tier;
  return s;
}

/* =========================================================================
   Points deductions on the table
   ========================================================================= */

/**
 * Apply this season's points deductions to a computed league table. Kept as a
 * pure view transform rather than a mutation so it can only ever be applied
 * once per render, and so `computeTable` (owned by another phase) is untouched.
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

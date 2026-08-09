/**
 * Transfer negotiation model — Phase 7.
 *
 * Ported from the reference implementation's `startNegotiation` /
 * `evaluateFeeOffer` / `evaluateWageOffer` / `evaluateTermsOffer` / `evaluateMove`
 * (their `js/engine.js`). Their tuned constants are kept verbatim; only the
 * units change — they price in £m, we price in raw pounds, so every literal
 * money threshold here is theirs × 1e6.
 *
 * This module is PURE: it reads the state and returns decisions. All mutation
 * of clubs/players/negotiations lives in engine/transferMarket.ts.
 */
import type {
  Club, GameState, MoveAssessment, MoveFactor, MoveVerdict, NegotiationTerms,
  Player, SquadStatusKey, MarketStatus,
} from './types';
import { getLeague } from './gameRules';
import { MONEY_SCALE, weeklyWage } from './utils';

/* ------------------------------------------------------------------ money */

/** Round a fee the way a real deal is announced. Their ladder, in pounds. */
export function roundFee(v: number): number {
  if (v <= 0) return 0;
  if (v >= 50_000_000 * MONEY_SCALE) return Math.round(v / (1_000_000 * MONEY_SCALE)) * 1_000_000 * MONEY_SCALE;
  if (v >= 10_000_000 * MONEY_SCALE) return Math.round(v / (250_000 * MONEY_SCALE)) * 250_000 * MONEY_SCALE;
  if (v >= 1_000_000 * MONEY_SCALE) return Math.round(v / (50_000 * MONEY_SCALE)) * 50_000 * MONEY_SCALE;
  return Math.round(v / 10_000) * 10_000;
}

/** Round a weekly wage to the nearest £100. */
export function roundWage(v: number): number {
  return Math.max(500 * MONEY_SCALE, Math.round(v / 100) * 100);
}

function rand(lo: number, hi: number, rng: () => number = Math.random): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/* --------------------------------------------------------- club standing */

/**
 * How a league is regarded across the game. Their `LEAGUE_STANDING`, extended
 * with the two pyramids they don't model (Netherlands, Portugal) using the same
 * level-based scale their fallback uses.
 */
export const LEAGUE_STANDING: Record<string, number> = {
  premier_league: 100, la_liga: 94, bundesliga: 88, serie_a: 88, ligue_1: 78,
  eredivisie: 68, primeira_liga: 66,
  championship: 62, scottish_premiership: 55,
  la_liga_2: 52, bundesliga_2: 52, serie_b: 52, ligue_2: 48,
  eerste_divisie: 44, liga_portugal_2: 44,
  league_one: 42, scottish_championship: 34, league_two: 30,
  primera_rfef: 32, dritte_liga: 34, serie_c: 32, national_fr: 30,
  scottish_league_one: 24, national_league: 22,
};

export function leagueStanding(leagueId: string): number {
  const known = LEAGUE_STANDING[leagueId];
  if (known != null) return known;
  const lvl = getLeague(leagueId)?.level ?? 1;
  return [0, 80, 55, 38, 28, 20][lvl] ?? 40;
}

export function leagueCountry(leagueId: string): string | null {
  return getLeague(leagueId)?.country ?? null;
}

/**
 * How much a league's standing inflates personal-terms demands — a Premier
 * League move commands a premium a National League one never will. Centred
 * on 1.0 at `leagueStanding` 70 (mid-table Championship), the target design
 * spec's `LeaguePrestigeMultiplier` expressed off the scale we already have,
 * clamped so a move up or down the pyramid nudges wages rather than
 * multiplying them out of proportion.
 */
export function leaguePrestigeMultiplier(leagueId: string | null | undefined): number {
  if (!leagueId) return 1;
  return Math.max(0.6, Math.min(1.6, leagueStanding(leagueId) / 70));
}

/**
 * What a player would want on personal terms as a FRESH signing — spec
 * module B's `Demand = (Overall*0.8 + Potential*0.2) * LeaguePrestigeMultiplier`,
 * run through the same value/rating→wage scale the dataset itself is seeded
 * from (`weeklyWage`) so the number lands in this game's wage economy rather
 * than a bare, unscaled points total. Deliberately lower than
 * `renewalWageDemand` for the same player — a fresh approach has no leverage.
 * `leaguePrestigeMult` is 1 for a free agent (spec: "no league prestige
 * boost, they are desperate") and for a like-for-like renewal quote.
 */
export function newSigningWageDemand(p: Player, leaguePrestigeMult = 1): number {
  const blended = p.rating * 0.8 + (p.potential ?? p.rating) * 0.2;
  return roundWage(weeklyWage(p.value, blended) * leaguePrestigeMult);
}

/**
 * A single number for "how big a move is this" — the league, the squad you'd be
 * joining, and the club's standing. Their `clubStature` minus the European
 * bonus (we have no continental group stage to read at negotiation time).
 */
export function clubStature(club: Club | null | undefined, squadRating: number): number {
  if (!club) return 0;
  const league = leagueStanding(club.leagueId) * 0.42;
  const squad = Math.max(0, squadRating - 45) * 1.15;
  const rep = (club.reputation ?? 2) * 4.0;
  return league + squad + rep;
}

/** Squad status a club can promise a signing, best to worst. Their table. */
export const SQUAD_STATUS: Record<SquadStatusKey, { label: string; rank: number; minShare: number }> = {
  star: { label: 'Star Player', rank: 4, minShare: 0.80 },
  key: { label: 'Key Player', rank: 3, minShare: 0.65 },
  first_team: { label: 'First Team', rank: 2, minShare: 0.45 },
  rotation: { label: 'Squad Rotation', rank: 1, minShare: 0.22 },
  fringe: { label: 'Fringe Player', rank: 0, minShare: 0.00 },
};

export const STATUS_ORDER: SquadStatusKey[] = ['rotation', 'first_team', 'key', 'star'];

export function statusLabel(k: SquadStatusKey | null | undefined): string {
  return k ? SQUAD_STATUS[k]?.label ?? 'Squad Player' : 'Squad Player';
}

/**
 * Would he actually get in the team? Compares him to the players already there
 * in his position group — their `projectedRole`.
 */
export function projectedRole(
  player: Player,
  squad: Player[],
  squadRating: number
): { rank: number; status: SquadStatusKey; starter: boolean } {
  if (!squad.length) return { rank: 1, status: 'star', starter: true };
  const rivals = squad
    .filter((p) => p.id !== player.id && p.pos === player.pos)
    .map((p) => p.rating);
  const better = rivals.filter((v) => v > player.rating + 1).length;
  // Roughly how many of this position group start.
  const slots = player.pos === 'GK' ? 1 : player.pos === 'DEF' ? 4 : player.pos === 'MID' ? 4 : 2;
  const status: SquadStatusKey =
    better === 0 && player.rating >= squadRating + 2 ? 'star'
      : better === 0 ? 'key'
        : better < slots ? 'first_team'
          : better < slots + 2 ? 'rotation' : 'fringe';
  return { rank: better + 1, status, starter: better < slots };
}

/* --------------------------------------------------------- player agency */

/** Continuous 1-5 prestige from rating: 55→1, 63.5→2, 72→3, 80.5→4, 89→5. */
export function playerPrestige(rating: number): number {
  return Math.max(1, Math.min(5, 1 + (rating - 55) / 8.5));
}

/**
 * How ambitious a player is to leave his current club (0 = content,
 * 1 = desperate to move). Their `playerAmbition`.
 */
export function playerAmbition(p: Player, squadRating: number): number {
  const ovrGap = p.rating - squadRating;
  const potGap = Math.max(0, (p.potential ?? p.rating) - p.rating);
  const ageBoost = p.age <= 22 ? 1.5 : p.age <= 26 ? 1.1 : p.age <= 29 ? 0.65 : 0.25;
  const loyaltyMod = p.loyal ? 0.5 : 1.0;
  const raw = (ovrGap * 0.045 + potGap * 0.025) * ageBoost * loyaltyMod;
  return Math.max(0, Math.min(1, raw));
}

export interface MoveContext {
  /** Squad average rating of the club he'd be joining. */
  toRating: number;
  /** Squad average rating of the club he's at (null for a free agent). */
  fromRating: number;
  /** The XI-relevant squad of the club he'd be joining. */
  toSquad: Player[];
  /** Months left on his deal (from `contractMonthsLeft`). */
  monthsLeft: number;
}

export interface MoveOptions {
  offeredWage?: number;
  promisedStatus?: SquadStatusKey | null;
  loan?: boolean;
}

/**
 * The full assessment: a score, a plain-language breakdown, a verdict, and what
 * he'd want in order to say yes. Their `evaluateMove`, weights unchanged.
 */
export function evaluateMove(
  player: Player,
  fromClub: Club | null,
  toClub: Club,
  ctx: MoveContext,
  opts: MoveOptions = {}
): MoveAssessment {
  const factors: MoveFactor[] = [];
  const add = (label: string, delta: number, detail?: string) => {
    if (Math.abs(delta) >= 0.5) factors.push({ label, delta: Math.round(delta), detail });
  };
  const age = player.age || 25;
  // What he cares about changes with age.
  const wAmbition = age <= 23 ? 1.00 : age <= 28 ? 1.15 : age <= 31 ? 0.85 : 0.55;
  const wGameTime = age <= 23 ? 1.45 : age <= 28 ? 1.00 : age <= 31 ? 0.95 : 1.10;
  const wMoney = age <= 23 ? 0.55 : age <= 28 ? 0.85 : age <= 31 ? 1.15 : 1.60;

  // How elite he is: a step down costs a world-class player far more, and no
  // amount of money buys it back.
  const calibre = Math.max(0, Math.min(1.4, (player.rating - 62) / 26));

  const fromStature = fromClub ? clubStature(fromClub, ctx.fromRating) : 0;
  const toStature = clubStature(toClub, ctx.toRating);
  const statureGap = fromClub ? toStature - fromStature : 0;
  if (fromClub) {
    add('Standard of club', statureGap * 0.55 * wAmbition * (statureGap < 0 ? 1 + calibre : 1),
      statureGap > 6 ? 'A clear step up' : statureGap < -6 ? 'A step down' : 'A similar level');
  }

  // Joining a squad well below his own level is its own problem.
  const beneath = player.rating - ctx.toRating;
  if (beneath > 8) {
    add('Below his level', -(beneath - 8) * 1.5 * wAmbition * (1 + calibre * 0.6),
      "He'd be far and away their best player");
  }

  // League standard on its own — players care about the shop window.
  const lgGap = leagueStanding(toClub.leagueId) - leagueStanding(fromClub?.leagueId ?? toClub.leagueId);
  add('Standard of league', lgGap * 0.30 * wAmbition,
    lgGap > 8 ? 'A stronger league' : lgGap < -8 ? 'A weaker league' : 'A comparable league');

  // Game time — would he play?
  const role = projectedRole(player, ctx.toSquad, ctx.toRating);
  const promised = opts.promisedStatus && SQUAD_STATUS[opts.promisedStatus] ? opts.promisedStatus : null;
  const effRank = promised
    ? Math.max(SQUAD_STATUS[promised].rank, SQUAD_STATUS[role.status].rank)
    : SQUAD_STATUS[role.status].rank;
  const gameTimeScore = [-16, -4, 5, 10, 13][effRank] ?? 0;
  add('Game time', gameTimeScore * wGameTime,
    effRank >= 3 ? "He'd be central to the side"
      : effRank >= 2 ? "He'd be in and around the team"
        : effRank >= 1 ? "He'd be squad rotation" : "He'd struggle to get on the pitch");

  // Money.
  const curWage = Math.max(1, player.wage);
  const offered = opts.offeredWage != null ? opts.offeredWage : curWage * 1.3;
  const wageRatio = offered / curWage;
  const wageCap = 22 - calibre * 7; // money persuades a squad player, not a superstar
  add('Wages', Math.max(-wageCap, Math.min(wageCap, (wageRatio - 1.12) * 42)) * wMoney,
    wageRatio >= 1.5 ? 'A big rise' : wageRatio >= 1.15 ? 'A decent rise'
      : wageRatio >= 1.0 ? 'Barely a rise' : 'A pay cut');

  // Moving abroad.
  const fromCountry = fromClub ? leagueCountry(fromClub.leagueId) : null;
  const toCountry = leagueCountry(toClub.leagueId);
  if (fromCountry && toCountry && fromCountry !== toCountry) {
    const settled = age >= 30 ? -7 : age >= 26 ? -4 : -2;
    add('Moving abroad', settled + (statureGap > 12 ? 4 : 0), 'A new country and a new language');
  }

  // Personal circumstances.
  if (player.loyal && fromClub) add('Loyalty', -8, "He's settled where he is");
  if (player.wantsMove) add('Wants to leave', 14, 'He has already asked to go');
  if (ctx.monthsLeft <= 12) add('Contract running down', 6, "He's free to think about his future");

  // A loan is temporary, so the badge matters far less than the football.
  if (opts.loan) {
    for (const f of factors) {
      if (f.label === 'Standard of club' || f.label === 'Standard of league') f.delta = Math.round(f.delta * 0.35);
      if (f.label === 'Below his level') f.delta = Math.round(f.delta * 0.25);
      if (f.label === 'Game time') f.delta = Math.round(f.delta * 1.9);
      if (f.label === 'Wages' || f.label === 'Loyalty') f.delta = Math.round(f.delta * 0.3);
    }
  }

  const score = factors.reduce((s, f) => s + f.delta, 0);

  // What would it take?
  const demands: string[] = [];
  if (!promised && effRank <= 2 && score > -30) demands.push('squad_status');
  if (wageRatio < 1.25 && score < 22) demands.push('wage_premium');
  if (statureGap < -8 && score > -30) demands.push('release_clause');
  if (age >= 29 && score < 20) demands.push('signing_bonus');

  const verdict: MoveVerdict =
    score >= 22 ? 'keen' : score >= 2 ? 'open' : score >= -18 ? 'reluctant' : 'refuses';

  return {
    score: Math.round(score), verdict, factors, demands,
    projectedStatus: role.status,
    wageMult: Math.max(1, 1 + Math.max(0, 10 - score) * 0.012),
  };
}

/** "Will he even talk to us" — their `prestigeRejectChance`, off assessMove. */
export function prestigeRejectChance(a: MoveAssessment): number {
  if (a.verdict === 'keen') return 0;
  if (a.verdict === 'open') return 0.05;
  if (a.verdict === 'reluctant') return 0.30;
  return Math.min(0.95, 0.62 + Math.max(0, -a.score - 18) * 0.006);
}

/** Plain-language read on how the player sees the move. */
export function stanceLine(name: string, a: MoveAssessment): string {
  const best = a.factors.filter((f) => f.delta > 0).sort((x, y) => y.delta - x.delta)[0];
  const worst = a.factors.filter((f) => f.delta < 0).sort((x, y) => x.delta - y.delta)[0];
  const why = (f?: MoveFactor) => (f ? (f.detail ?? f.label).toLowerCase() : null);
  if (a.verdict === 'keen') return `${name} would jump at this${best ? ` — ${why(best)}` : ''}.`;
  if (a.verdict === 'open') {
    return `${name} is open to the move${best ? ` — ${why(best)}` : ''}${worst ? `, though ${why(worst)}` : ''}.`;
  }
  return `${name} is far from convinced${worst ? ` — ${why(worst)}` : ''}. It will take more than money.`;
}

/* ------------------------------------------------------------ availability */

/**
 * Months left on a contract. Our contracts carry an ISO `contractEnd`; the
 * in-game "now" is derived from the season year and the round.
 */
export function contractMonthsLeft(p: Player, state: GameState): number {
  if (!p.contractEnd) return (p.contractYears ?? 2) * 12;
  const end = Date.parse(p.contractEnd + 'T00:00:00Z');
  if (!Number.isFinite(end)) return (p.contractYears ?? 2) * 12;
  // A season labelled `seasonYear` runs Jul(seasonYear-1) → Jun(seasonYear);
  // week 1 is early August, and 48 rounds cover ~10 months.
  const monthOffset = 1 + (Math.min(state.week, 48) / 48) * 10;
  const now = Date.UTC(state.seasonYear - 1, 6, 1) + monthOffset * 30.44 * 86_400_000;
  return Math.max(0, (end - now) / (30.44 * 86_400_000));
}

/** How available a player is, from the buying club's point of view. */
export function marketStatus(p: Player, state: GameState): MarketStatus {
  const monthsLeft = contractMonthsLeft(p, state);
  return {
    listed: !!p.transferListed,
    unsettled: !!p.wantsMove,
    unsettledReason: p.wantsMove ? (p.wantsMoveReason ?? 'ability') : null,
    expiring: monthsLeft <= 12 && !p.loyal,
    monthsLeft,
  };
}

/**
 * Multiplier on market value that the selling club builds its asking price
 * from. Their `askingMultiplier`, verbatim.
 */
export function askingMultiplier(p: Player, sellerRating: number, st: MarketStatus): number {
  if (st.unsettled) return st.listed ? 0.86 : 0.90;
  if (st.listed) return 0.97;
  if (st.expiring) return Math.max(0.72, 0.72 + st.monthsLeft * 0.02);
  const above = Math.max(0, p.rating - sellerRating);
  return Math.min(1.9, 1.35 + above * 0.05);
}

/** The asking price a market listing advertises. */
export function askingGuide(p: Player, sellerRating: number, st: MarketStatus): number {
  return Math.max(10_000, roundFee(p.value * askingMultiplier(p, sellerRating, st)));
}

/* ----------------------------------------------------- the state machine */

/**
 * Open a set of negotiating positions. Selling clubs ask 18-28% over their own
 * valuation and won't go below their minimum at all — only a player who has
 * downed tools or is running his contract down gets sold under value, and
 * that's the availability discount, not a willingness to be haggled down.
 */
export function startNegotiation(
  player: Player,
  sellerRating: number,
  st: MarketStatus,
  rng: () => number = Math.random,
  /** Buying club's league, for spec module B's `LeaguePrestigeMultiplier`.
   *  Undefined/null (a free agent, or no buyer context) means no boost. */
  buyingLeagueId?: string | null
): NegotiationTerms {
  const youngBoost = player.age <= 23 ? 0.06 : 0;
  const potBoost = (player.potential ?? player.rating) - player.rating >= 8 ? 0.04 : 0;
  const repBoost = sellerRating >= 78 && player.rating >= 80 ? 0.04 : 0;
  const avail = askingMultiplier(player, sellerRating, st);
  const asking = roundFee(player.value * avail * (1.18 + rand(0, 10, rng) / 100));
  const minMult = avail * Math.max(0.98, 1.03 + youngBoost + potBoost + repBoost + rand(0, 6, rng) / 100);
  const minFee = Math.max(10_000, roundFee(player.value * minMult));
  // Player wants 20-40% more than his current wage — one desperate to leave asks less.
  const wageMult = (1.25 + rand(3, 20, rng) / 100) * (st.unsettled ? 0.92 : 1);
  // Never less than what he'd want as a fresh signing elsewhere (spec module
  // B's formula) — a floor, not the whole story, so the existing
  // current-wage-driven haggle range still does the day-to-day work.
  const wageDemand = Math.max(
    roundWage(player.wage * wageMult),
    newSigningWageDemand(player, buyingLeagueId ? leaguePrestigeMultiplier(buyingLeagueId) : 1)
  );
  return {
    asking,
    minFee,
    wageDemand,
    // Personal terms are near enough take-it-or-leave-it: he named his number.
    minWage: roundWage(wageDemand * 0.985),
    feeRound: 0,
    wageRound: 0,
    // Chance the club rebuffs an offer that does clear their minimum. Spent once.
    holdOut: st.unsettled || st.listed ? 0 : st.expiring ? 0.15 : 0.40,
    wageHoldOut: st.unsettled ? 0 : 0.22,
  };
}

/* ------------------------------------------------------------ deal clauses */

/**
 * The non-cash half of a transfer offer — the things a buying club puts on the
 * table when it can't (or won't) simply pay the asking price.
 *
 * Every field is optional and absent means "not offered", so a bid that is
 * pure cash behaves exactly as it did before any of this existed.
 */
export interface DealClauses {
  /** Share of any future profit that goes back to the selling club, 0–`SELL_ON_MAX`. */
  sellOnPct?: number;
  /** Fee at which the seller may buy him back later. 0 = no buy-back offered. */
  buyBackFee?: number;
  /** Market value of a player sent the other way as part of the deal. */
  exchangeValue?: number;
  /** He stays with the seller until the season ends instead of moving now. */
  endOfSeason?: boolean;
}

/** Hard ceiling on a sell-on share. Beyond half the upside nobody signs. */
export const SELL_ON_MAX = 0.5;

/**
 * What the selling club actually hears when you bid `fee` alongside `clauses`.
 *
 * Clauses are consideration, not magic: each is discounted for being
 * contingent, and the two that cost you nothing today (sell-on, buy-back) are
 * additionally capped as a share of the cash on the table, so no amount of
 * paperwork buys a player without money behind it. An exchange player is real
 * consideration and isn't capped — but his own cash value is still discounted,
 * because a club that didn't ask for him is doing you the favour.
 */
export function effectiveBid(fee: number, marketValue: number, c: DealClauses = {}): number {
  let credit = 0;
  const sellOn = Math.max(0, Math.min(SELL_ON_MAX, c.sellOnPct ?? 0));
  if (sellOn > 0 && marketValue > 0) {
    // A share of a future sale, discounted for being years away and uncertain.
    credit += Math.min(fee * 0.30, marketValue * sellOn * 0.55);
  }
  const buyBack = Math.max(0, c.buyBackFee ?? 0);
  if (buyBack > 0 && marketValue > 0) {
    // A call option on their own player. The cheaper you let them buy him
    // back for, the more the option is worth to them; at 2.2× his value it
    // is worth nothing, because they could just pay the market rate.
    const generosity = Math.max(0, Math.min(1, 1 - buyBack / (marketValue * 2.2)));
    credit += Math.min(fee * 0.20, marketValue * 0.22 * generosity);
  }
  if ((c.exchangeValue ?? 0) > 0) credit += (c.exchangeValue ?? 0) * 0.80;
  // Keeping him for the run-in is worth a little goodwill, no more.
  if (c.endOfSeason) credit += fee * 0.05;
  return Math.round(fee + credit);
}

/** The buy-back fee a seller would consider worth having, for the UI default. */
export function suggestBuyBack(marketValue: number): number {
  return Math.max(10_000, roundFee(marketValue * 1.5));
}

/** Plain-language summary of a clause set, for the log and the inbox. */
export function clauseText(c: DealClauses, money: (v: number) => string): string {
  const parts: string[] = [];
  if ((c.sellOnPct ?? 0) > 0) parts.push(`${Math.round((c.sellOnPct ?? 0) * 100)}% sell-on`);
  if ((c.buyBackFee ?? 0) > 0) parts.push(`${money(c.buyBackFee ?? 0)} buy-back`);
  if ((c.exchangeValue ?? 0) > 0) parts.push('a player in exchange');
  if (c.endOfSeason) parts.push('joining at the end of the season');
  return parts.join(', ');
}

export type FeeDecision =
  | { decision: 'accept' }
  | { decision: 'counter'; counter: number; holdOut?: boolean }
  | { decision: 'reject' }
  | { decision: 'walk' };

/**
 * Accept / counter / reject a fee. Walks after 3 rounds. The one-time hold-out
 * rebuffs a bid that DOES clear the minimum, then raises the price 12%.
 *
 * `clauses` is what the buyer attached to the bid; the club weighs the whole
 * package via `effectiveBid`, so a sell-on or a swap can carry a deal the cash
 * alone wouldn't. The counter it names is still a straight cash number —
 * clubs quote a price, not a package.
 */
export function evaluateFeeOffer(
  neg: NegotiationTerms,
  offer: number,
  rng: () => number = Math.random,
  clauses: DealClauses = {},
  marketValue = 0,
  /** Deadline day: selling-club friction eases 20% (spec module: "Deadline
   *  Day Override" — a panicked seller takes less rather than risk keeping
   *  a player who wants out with no market left to sell him in). */
  deadlineDay = false
): FeeDecision {
  neg.feeRound++;
  const bid = effectiveBid(offer, marketValue, clauses);
  const minFee = deadlineDay ? Math.round(neg.minFee * 0.8) : neg.minFee;
  if (bid >= minFee) {
    if (neg.holdOut && rng() < neg.holdOut) {
      neg.holdOut = 0;
      neg.minFee = roundFee(neg.minFee * 1.12);
      neg.asking = roundFee(Math.max(neg.asking, neg.minFee) * 1.05);
      return { decision: 'counter', counter: neg.asking, holdOut: true };
    }
    return { decision: 'accept' };
  }
  if (neg.feeRound >= 3) return { decision: 'walk' };
  // Only a bid already in touching distance gets a counter, and the counter
  // barely moves off the asking price — no meeting in the middle.
  if (bid >= minFee * 0.90) {
    const counter = Math.max(minFee, roundFee(bid * 0.20 + neg.asking * 0.80));
    neg.asking = counter;
    return { decision: 'counter', counter };
  }
  return { decision: 'reject' };
}

export function evaluateWageOffer(
  neg: NegotiationTerms,
  offer: number,
  rng: () => number = Math.random
): FeeDecision {
  neg.wageRound++;
  if (offer >= neg.minWage) {
    if (neg.wageHoldOut && rng() < neg.wageHoldOut) {
      neg.wageHoldOut = 0;
      neg.wageDemand = roundWage(neg.wageDemand * 1.10);
      neg.minWage = roundWage(neg.wageDemand * 0.985);
      return { decision: 'counter', counter: neg.wageDemand, holdOut: true };
    }
    return { decision: 'accept' };
  }
  if (neg.wageRound >= 3) return { decision: 'walk' };
  if (offer >= neg.minWage * 0.88) {
    const counter = Math.max(neg.minWage, roundWage(offer * 0.15 + neg.wageDemand * 0.85));
    neg.wageDemand = counter;
    return { decision: 'counter', counter };
  }
  return { decision: 'reject' };
}

export interface TermsPackage {
  promisedStatus?: SquadStatusKey | null;
  projectedStatus?: SquadStatusKey;
  signingBonus?: number;
  releaseClause?: number;
  contractYears?: number;
  /** Player's age, for the two squad-role rules below. Optional so every
   *  pre-existing call site (which never checked age here) still compiles
   *  and simply skips them. */
  age?: number;
  /** How many players the buying club already carries at `promisedStatus`
   *  in this player's position — squad-depth detection for the "Crucial"
   *  rule below. 0/undefined = not checked. */
  samePositionAtPromisedStatus?: number;
}

/**
 * The whole package, not just the weekly number. A reluctant player can be
 * talked round with a role guarantee, a signing-on fee, a release clause or a
 * longer deal; a refusenik can't.
 *
 * The signing-bonus credit is re-derived for our units: a bonus worth ~11% of
 * his annual wage demand buys the full 0.09 of shortfall relief.
 */
export function evaluateTermsOffer(
  neg: NegotiationTerms,
  offer: number,
  terms: TermsPackage = {},
  rng: () => number = Math.random
): FeeDecision & { persuadedBy?: boolean } {
  const promised = terms.promisedStatus ? SQUAD_STATUS[terms.promisedStatus] : null;
  // "Future Star" (our 'star') promised to a player past his prime — he knows
  // better and walks immediately, no amount of money changes his mind.
  if (promised?.rank === 4 && (terms.age ?? 0) > 26) {
    return { decision: 'walk' };
  }
  const base = evaluateWageOffer(neg, offer, rng);
  if (base.decision === 'accept') return base;
  const shortfall = Math.max(0, (neg.minWage - offer) / Math.max(1, neg.minWage));
  let credit = 0;
  const expected = SQUAD_STATUS[terms.projectedStatus ?? 'first_team'];
  if (promised) {
    const step = promised.rank - (expected?.rank ?? 2);
    credit += Math.max(0, step) * 0.045 + (step > 0 ? 0.01 : 0);
  }
  if ((terms.signingBonus ?? 0) > 0) {
    credit += Math.min(0.09, 0.8 * (terms.signingBonus ?? 0) / Math.max(1, neg.wageDemand * 52));
  }
  if ((terms.releaseClause ?? 0) > 0) credit += 0.05;
  if ((terms.contractYears ?? 3) >= 4) credit += 0.015;
  // Squad-depth detection: promising "Crucial" (key/star) minutes into a
  // position that already has 3+ players carrying that promise reads as an
  // empty word — the agent discounts the role credit by a quarter.
  if (promised && promised.rank >= 3 && (terms.samePositionAtPromisedStatus ?? 0) >= 3) {
    credit *= 0.75;
  }
  if (credit > 0 && shortfall <= credit) return { decision: 'accept', persuadedBy: true };
  return base;
}

/* ------------------------------------------------------------------ loans */

/**
 * Playing-time clauses a loan deal can carry. `ratio` is the share of the
 * borrowing club's league games the player must feature in once the sample is
 * meaningful. Their `LOAN_PLAYTIME`.
 */
export const LOAN_PLAYTIME: Record<'regular' | 'occasional', { label: string; ratio: number }> = {
  regular: { label: 'Regular starter', ratio: 0.45 },
  occasional: { label: 'Squad player', ratio: 0.22 },
};

/**
 * Loan availability is deterministic — no roll. A player is loanable when he's
 * clearly below his club's level or a young prospect who needs games.
 */
export function isLoanAvailable(p: Player, clubRating: number): boolean {
  if (p.loan) return false;
  const surplus = clubRating - p.rating;
  return surplus >= 6 || (p.age <= 23 && surplus >= 2);
}

/** The small up-front fee a season loan costs. */
export function loanFee(p: Player): number {
  return Math.max(20_000, roundFee(p.value * 0.05));
}

/**
 * Hard ceiling on a loan's buy-option / future fee — spec's "Loan Exploit
 * Flag": an option priced far above value can otherwise force a nonsense
 * accept out of the evaluation math. No future fee, offered or demanded, is
 * ever allowed above 2x market value, whatever either side proposes.
 */
export function capFutureFee(value: number, fee: number): number {
  if (value <= 0) return fee;
  return Math.min(fee, roundFee(value * 2));
}

/**
 * The lending club's opening position for a negotiated outgoing loan
 * (`openLoanNegotiation` in transferMarket.ts) — the loan counterpart to
 * `startNegotiation`. There is no fee to haggle (`loanFee` is a fixed
 * up-front cost, not negotiated); the three real levers are how much of the
 * wage the borrower covers, whether a playing-time guarantee is required,
 * and — `loan_to_buy` only — the option-to-buy fee. A "development loan"
 * (young, below the parent's own level) wants a lower wage share but a firm
 * playing-time promise in return; anyone else wants their wages covered
 * near-in-full and doesn't care how much he plays.
 */
export interface LoanTerms {
  minWageShare: number;
  requiresPlayingTime: boolean;
  minBuyOption: number;
  round: number;
}

export function startLoanNegotiation(
  p: Player,
  ownerRating: number,
  offerType: 'loan' | 'loan_to_buy',
  rng: () => number = Math.random
): LoanTerms {
  const devLoan = p.age <= 23 && p.rating < ownerRating;
  const minWageShare = Math.min(1, (devLoan ? 0.5 : 0.75) + rand(0, 20, rng) / 100);
  // Same "above his current value" logic `requestLoanIn`'s auto-set option
  // uses, just as a negotiated minimum instead of a fixed number.
  const minBuyOption = offerType === 'loan_to_buy'
    ? capFutureFee(p.value, roundFee(p.value * (devLoan ? 1.15 : 1.35)))
    : 0;
  return { minWageShare, requiresPlayingTime: devLoan, minBuyOption, round: 0 };
}

export type LoanDecision =
  | { decision: 'accept' }
  | { decision: 'counter'; reason: 'wageShare' | 'buyOption'; counter: number }
  | { decision: 'reject' }
  | { decision: 'walk' };

/** Accept / counter / reject a loan terms package. Checked in a fixed order
 *  — wage share, then the playing-time guarantee (a hard requirement, not
 *  negotiable, so it rejects rather than counters), then the buy option —
 *  and walks after 3 rounds of an unmet wage share or buy option, same
 *  cadence `evaluateFeeOffer` uses. */
export function evaluateLoanTermsOffer(
  terms: LoanTerms,
  offer: { wageShare: number; playingTime: 'regular' | 'occasional' | null; buyOptionFee?: number }
): LoanDecision {
  terms.round++;
  if (offer.wageShare < terms.minWageShare - 0.02) {
    if (terms.round >= 3) return { decision: 'walk' };
    return { decision: 'counter', reason: 'wageShare', counter: terms.minWageShare };
  }
  if (terms.requiresPlayingTime && offer.playingTime !== 'regular') {
    return { decision: 'reject' };
  }
  if (terms.minBuyOption > 0 && (offer.buyOptionFee ?? 0) < terms.minBuyOption) {
    if (terms.round >= 3) return { decision: 'walk' };
    return { decision: 'counter', reason: 'buyOption', counter: terms.minBuyOption };
  }
  return { decision: 'accept' };
}

/** Text summary of a loan's clause set, for the UI and the inbox. */
export function loanClauseText(
  wageShare: number,
  playingTime: 'regular' | 'occasional' | null,
  optionToBuy: number,
  money: (v: number) => string
): string {
  const parts: string[] = [];
  const cover = Math.round((1 - wageShare) * 100);
  parts.push(cover >= 100 ? 'full wages covered' : `${cover}% of wages covered`);
  if (playingTime) parts.push(`${LOAN_PLAYTIME[playingTime].label.toLowerCase()} clause`);
  if (optionToBuy > 0) parts.push(`option to buy ${money(optionToBuy)}`);
  return parts.join(', ');
}

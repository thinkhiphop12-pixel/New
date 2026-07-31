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

/* ------------------------------------------------------------------ money */

/** Round a fee the way a real deal is announced. Their ladder, in pounds. */
export function roundFee(v: number): number {
  if (v <= 0) return 0;
  if (v >= 50_000_000) return Math.round(v / 1_000_000) * 1_000_000;
  if (v >= 10_000_000) return Math.round(v / 250_000) * 250_000;
  if (v >= 1_000_000) return Math.round(v / 50_000) * 50_000;
  return Math.round(v / 10_000) * 10_000;
}

/** Round a weekly wage to the nearest £100. */
export function roundWage(v: number): number {
  return Math.max(500, Math.round(v / 100) * 100);
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
  rng: () => number = Math.random
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
  const wageDemand = roundWage(player.wage * wageMult);
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

export type FeeDecision =
  | { decision: 'accept' }
  | { decision: 'counter'; counter: number; holdOut?: boolean }
  | { decision: 'reject' }
  | { decision: 'walk' };

/**
 * Accept / counter / reject a fee. Walks after 3 rounds. The one-time hold-out
 * rebuffs a bid that DOES clear the minimum, then raises the price 12%.
 */
export function evaluateFeeOffer(
  neg: NegotiationTerms,
  offer: number,
  rng: () => number = Math.random
): FeeDecision {
  neg.feeRound++;
  if (offer >= neg.minFee) {
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
  if (offer >= neg.minFee * 0.90) {
    const counter = Math.max(neg.minFee, roundFee(offer * 0.20 + neg.asking * 0.80));
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
  const base = evaluateWageOffer(neg, offer, rng);
  if (base.decision === 'accept') return base;
  const shortfall = Math.max(0, (neg.minWage - offer) / Math.max(1, neg.minWage));
  let credit = 0;
  const promised = terms.promisedStatus ? SQUAD_STATUS[terms.promisedStatus] : null;
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

import type {
  Club, GameState, MarketStatus, MoveAssessment, Negotiation, Player, Position,
  PreContract, SquadStatusKey, TransferOffer,
} from './types';
import { MAX_SQUAD_SIZE, MIN_SQUAD_SIZE } from './gameRules';
import { availableSquad, getSquad, isOnLoan, squadAvgRating } from './teamManagement';
import { clamp, contractEndFor, weeklyWage } from './utils';
import { pushInbox } from './inbox';
import { recordScenarioSale } from './scenarios';
import {
  LOAN_PLAYTIME, SQUAD_STATUS, askingGuide, askingMultiplier, contractMonthsLeft,
  evaluateFeeOffer, evaluateMove, evaluateTermsOffer, isLoanAvailable, loanClauseText,
  loanFee, marketStatus, playerAmbition, prestigeRejectChance, roundFee, roundWage,
  stanceLine, startNegotiation, statusLabel,
} from './negotiation';

/** What another club (or agent) wants for a player. */
export function askingPrice(p: Player): number {
  return p.clubId === 0 ? Math.round(p.value * 0.9) : Math.round(p.value * 1.15);
}

/** What you get when you sell on the open market (offers can beat this). */
export function saleValue(p: Player): number {
  return Math.round(p.value * 0.85);
}

export interface BuyResult {
  ok: boolean;
  error?: string;
}

export function canBuy(state: GameState, playerId: number): BuyResult {
  const p = state.players[playerId];
  if (!p) return { ok: false, error: 'Unknown player.' };
  if (p.clubId === state.userClubId) return { ok: false, error: 'Already in your squad.' };
  if (askingPrice(p) > state.budget) return { ok: false, error: 'Not enough budget.' };
  if (getSquad(state, state.userClubId).length >= MAX_SQUAD_SIZE)
    return { ok: false, error: `Squad is full (max ${MAX_SQUAD_SIZE}).` };
  return { ok: true };
}

/** Buy a player. Returns a new state (or the same state if invalid). */
export function buyPlayer(state: GameState, playerId: number): GameState {
  if (!canBuy(state, playerId).ok) return state;
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  const price = askingPrice(p);
  const from = s.clubs.find((c) => c.id === p.clubId);
  if (from) from.playerIds = from.playerIds.filter((id) => id !== playerId);
  const mine = s.clubs.find((c) => c.id === s.userClubId)!;
  mine.playerIds.push(playerId);
  p.clubId = s.userClubId;
  p.contractYears = 3;
  p.contractEnd = contractEndFor(s.seasonYear, 3);
  delete p.onLoanUntil;
  s.budget -= price;
  s.chemistry = clamp(s.chemistry - 6, 0, 100); // new faces take time to gel
  s.ledger.unshift({ week: s.week, desc: `Signed ${p.name}`, amount: -price });
  s.news.unshift(`Signed ${p.name} for ${money(price)}.`);
  pushInbox(s, {
    category: 'transfer',
    title: `${p.name} signs for the club`,
    body: `${p.name} has completed a move to the club for ${money(price)}.\n\nThe new arrival will need time to settle in — expect a short dip in squad chemistry while they bed in.`,
    playerId: p.id,
  });
  return s;
}

export function canSell(state: GameState, playerId: number): BuyResult {
  const p = state.players[playerId];
  if (!p || p.clubId !== state.userClubId) return { ok: false, error: 'Not your player.' };
  if (isOnLoan(p)) return { ok: false, error: 'Player is away on loan.' };
  if (getSquad(state, state.userClubId).length <= MIN_SQUAD_SIZE)
    return { ok: false, error: `Squad too small to sell (min ${MIN_SQUAD_SIZE}).` };
  return { ok: true };
}

/** Sell to the open market at saleValue, or to a bidder at their offer amount. */
export function sellPlayer(state: GameState, playerId: number, offer?: TransferOffer): GameState {
  if (!canSell(state, playerId).ok) return state;
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  const amount = offer ? offer.amount : saleValue(p);
  recordScenarioSale(s, p, amount);
  const mine = s.clubs.find((c) => c.id === s.userClubId)!;
  mine.playerIds = mine.playerIds.filter((id) => id !== playerId);
  if (offer) {
    const buyer = s.clubs.find((c) => c.id === offer.fromClubId);
    if (buyer) buyer.playerIds.push(playerId);
    p.clubId = offer.fromClubId;
  } else {
    p.clubId = 0; // released to the market
  }
  s.budget += amount;
  s.chemistry = clamp(s.chemistry - 3, 0, 100);
  s.lineup = s.lineup.map((id) => (id === playerId ? null : id));
  s.incomingOffers = s.incomingOffers.filter((o) => o.playerId !== playerId);
  s.ledger.unshift({ week: s.week, desc: `Sold ${p.name}`, amount });
  s.news.unshift(`Sold ${p.name} for ${money(amount)}.`);
  pushInbox(s, {
    category: 'transfer',
    title: `${p.name} departs the club`,
    body: `${p.name} has left the club for ${money(amount)}${offer ? ` after a bid from ${s.clubs.find((c) => c.id === offer.fromClubId)?.name ?? 'another club'}` : ' on the open market'}.\n\nThe funds have been added to the transfer budget.`,
    playerId: p.id,
  });
  return s;
}

/** Extend a player's contract: +3 years at a 20% raise, plus a signing bonus. */
export function renewContract(state: GameState, playerId: number): GameState {
  const p = state.players[playerId];
  if (!p || p.clubId !== state.userClubId) return state;
  const bonus = p.wage * 10;
  if (bonus > state.budget) return state;
  const s: GameState = structuredClone(state);
  const sp = s.players[playerId];
  sp.wage = Math.round((sp.wage * 1.2) / 100) * 100;
  sp.contractYears += 3;
  sp.contractEnd = contractEndFor(s.seasonYear, sp.contractYears);
  s.budget -= bonus;
  s.ledger.unshift({ week: s.week, desc: `${sp.name} contract bonus`, amount: -bonus });
  s.news.unshift(`${sp.name} signs a new deal (${sp.contractYears}y, ${money(sp.wage)}/w).`);
  pushInbox(s, {
    category: 'contract',
    title: `${sp.name} signs a new contract`,
    body: `${sp.name} has committed their future to the club, signing a new deal until ${s.seasonYear + sp.contractYears}.\n\nNew terms: ${money(sp.wage)} per week.`,
    playerId: sp.id,
  });
  return s;
}

export function canLoanOut(state: GameState, playerId: number): BuyResult {
  const p = state.players[playerId];
  if (!p || p.clubId !== state.userClubId) return { ok: false, error: 'Not your player.' };
  if (isOnLoan(p)) return { ok: false, error: 'Already on loan.' };
  if (availableSquad(state, state.userClubId).length <= 13)
    return { ok: false, error: 'Too few available players to loan anyone out.' };
  return { ok: true };
}

/**
 * Send a player on loan for the rest of the season. His wage comes off your
 * bill and young players come back improved.
 */
export function loanOut(state: GameState, playerId: number): GameState {
  if (!canLoanOut(state, playerId).ok) return state;
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  p.onLoanUntil = s.seasonYear + 1;
  s.lineup = s.lineup.map((id) => (id === playerId ? null : id));
  s.news.unshift(`${p.name} joins a lower-league side on loan until the end of the season.`);
  return s;
}

/**
 * Roll this week's incoming AI bids for the user's players. Bids favour
 * high-rated players and can exceed market value — selling to a bid is how
 * you fund a rebuild.
 */
export function generateWeeklyOffers(state: GameState): TransferOffer[] {
  const squad = getSquad(state, state.userClubId).filter((p) => !isOnLoan(p));
  const others = state.clubs.filter((c) => c.id !== state.userClubId);
  const offers: TransferOffer[] = [];
  for (const p of squad) {
    const interest = (p.rating - 62) / 90; // ~0 for squad players, ~0.3 for stars
    // Unhappy players (benched, wanting a move) attract noticeably more interest.
    const unhappyBoost = p.unhappy ? 0.12 : 0;
    if (Math.random() < Math.max(0.02, interest * 0.35 + unhappyBoost)) {
      const bidder = others[Math.floor(Math.random() * others.length)];
      offers.push({
        playerId: p.id,
        fromClubId: bidder.id,
        amount: Math.round((p.value * (0.95 + Math.random() * 0.45)) / 50_000) * 50_000,
      });
    }
    if (offers.length >= 3) break;
  }
  return offers;
}

/** All players you could sign, cheapest-relevant first not enforced — UI sorts. */
export function transferTargets(state: GameState): Player[] {
  return Object.values(state.players).filter((p) => p.clubId !== state.userClubId);
}

export interface ScoutReport {
  pos: Position;
  need: number; // your squad's average rating in this position group
  picks: Player[];
}

/**
 * Scouting: for each position group, find affordable players who would raise
 * your level, ranked by rating with a youth bonus.
 */
export function scoutRecommendations(state: GameState): ScoutReport[] {
  const squad = getSquad(state, state.userClubId);
  const targets = transferTargets(state).filter((p) => askingPrice(p) <= state.budget);
  const scoutLevel = state.staff?.scout ?? 0;
  const perPos = 4 + scoutLevel * 2; // a better scouting team surfaces more options
  const reports: ScoutReport[] = [];
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
    const group = squad.filter((p) => p.pos === pos);
    const need = group.length ? group.reduce((s, p) => s + p.rating, 0) / group.length : 50;
    // A sharper scouting team lowers the bar for what counts as an upgrade lead.
    const threshold = need - 1 - scoutLevel;
    const picks = targets
      .filter((p) => p.pos === pos && p.rating >= threshold)
      .sort((a, b) => b.rating + (28 - b.age) * 0.3 - (a.rating + (28 - a.age) * 0.3))
      .slice(0, perPos);
    reports.push({ pos, need: Math.round(need), picks });
  }
  return reports;
}

/**
 * Smarter AI clubs: each week a couple of AI clubs strengthen their weakest
 * position from the free-agent pool. Mutates the passed (cloned) state and
 * returns headlines for the news feed.
 */
export function aiWeeklyTransfers(s: GameState): string[] {
  // The negotiation/loan/promise world ticks off the same weekly hook, so a
  // save that never opens the Transfers screen still sees a living market.
  const headlines: string[] = tickTransferWeek(s);
  const aiClubs = s.clubs.filter((c) => c.id !== s.userClubId);
  const freeAgents = Object.values(s.players).filter((p) => p.clubId === 0);
  for (let n = 0; n < 2; n++) {
    if (Math.random() > 0.55) continue;
    const club = aiClubs[Math.floor(Math.random() * aiClubs.length)];
    if (club.playerIds.length >= MAX_SQUAD_SIZE) continue;
    const squad = club.playerIds.map((id) => s.players[id]).filter(Boolean);
    // Weakest position group by average rating.
    let worst: Position = 'MID';
    let worstAvg = Infinity;
    for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
      const g = squad.filter((p) => p.pos === pos);
      const avg = g.length ? g.reduce((x, p) => x + p.rating, 0) / g.length : 0;
      if (avg < worstAvg) {
        worstAvg = avg;
        worst = pos;
      }
    }
    const clubAvg = squadAvgRating(s, club.id);
    // Sign the best free agent that fits the club's level (no superteam hoarding).
    const pick = freeAgents
      .filter((p) => p.pos === worst && p.rating <= clubAvg + 6)
      .sort((a, b) => b.rating - a.rating)[0];
    if (!pick) continue;
    pick.clubId = club.id;
    pick.contractYears = 2;
    pick.contractEnd = contractEndFor(s.seasonYear, 2);
    club.playerIds.push(pick.id);
    freeAgents.splice(freeAgents.indexOf(pick), 1);
    if (pick.rating >= clubAvg + 2) headlines.push(`${club.name} snap up free agent ${pick.name}.`);
  }
  return headlines;
}

function money(v: number): string {
  return v >= 1_000_000 ? `£${(Math.round(v / 100_000) / 10).toFixed(1)}M` : `£${Math.round(v / 1000)}K`;
}

/* ===========================================================================
 * Phase 7 — negotiation, loans with clauses, release clauses, pre-contracts,
 * transfer bans, squad promises and transfer requests.
 *
 * The pure decision model lives in engine/negotiation.ts. Everything here
 * mutates state. Every exported action takes the current state and returns a
 * `TransferResult` holding the next state plus a message for the UI.
 *
 * Time is measured in season rounds (`state.week`), not calendar days — an AI
 * club replies to a bid on the next weekly tick.
 * ======================================================================== */

export interface TransferResult {
  state: GameState;
  ok: boolean;
  message: string;
}

const fail = (state: GameState, message: string): TransferResult => ({ state, ok: false, message });

/** How long an untouched negotiation survives before it lapses, in rounds. */
const NEGOTIATION_LAPSE_WEEKS = 6;

let negSeq = 0;
function newId(prefix: string): string {
  negSeq = (negSeq + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${negSeq.toString(36)}`;
}

function clubOf(s: GameState, id: number): Club | undefined {
  return s.clubs.find((c) => c.id === id);
}

function ensureArrays(s: GameState): void {
  s.negotiations = s.negotiations ?? [];
  s.preContracts = s.preContracts ?? [];
  s.transferBans = s.transferBans ?? {};
  s.transferNews = s.transferNews ?? [];
}

/** Games the club has played in its league this season (loan-clause sampling). */
function clubGamesPlayed(s: GameState, clubId: number): number {
  const club = clubOf(s, clubId);
  if (!club) return 0;
  const fixtures = s.fixtures[club.leagueId] ?? [];
  let n = 0;
  for (const f of fixtures) if (f.played && (f.homeId === clubId || f.awayId === clubId)) n++;
  return n;
}

/* ------------------------------------------------------------ transfer bans */

export function isTransferBanned(s: GameState, playerId: number): boolean {
  return (s.transferBans ?? {})[playerId] === s.seasonYear;
}

function markTransferBan(s: GameState, playerId: number): void {
  ensureArrays(s);
  s.transferBans![playerId] = s.seasonYear;
}

export function hasPreContract(s: GameState, playerId: number): boolean {
  return (s.preContracts ?? []).some((pc) => pc.playerId === playerId);
}

/* ------------------------------------------------------------ player agency */

/** How a player would see a move to `toClubId`, with all his demands. */
export function assessMove(
  s: GameState,
  playerId: number,
  toClubId: number,
  opts: { offeredWage?: number; promisedStatus?: SquadStatusKey | null; loan?: boolean } = {}
): MoveAssessment | null {
  const p = s.players[playerId];
  const toClub = clubOf(s, toClubId);
  if (!p || !toClub) return null;
  const fromClub = p.clubId ? clubOf(s, p.clubId) ?? null : null;
  return evaluateMove(p, fromClub, toClub, {
    toRating: squadAvgRating(s, toClubId),
    fromRating: fromClub ? squadAvgRating(s, fromClub.id) : 0,
    toSquad: getSquad(s, toClubId),
    monthsLeft: contractMonthsLeft(p, s),
  }, opts);
}

/** Straight probability a player refuses to open talks at all. */
export function refuseChance(s: GameState, playerId: number, toClubId: number): number {
  const a = assessMove(s, playerId, toClubId);
  return a ? prestigeRejectChance(a) : 1;
}

/* ---------------------------------------------------------------- the market */

export interface MarketEntry extends Player {
  clubName: string;
  status: MarketStatus;
  askingGuide: number;
  releaseClauseFee: number | null;
}

export interface MarketFilters {
  search?: string;
  pos?: Position | 'ALL';
  /** 'all' | 'available' | 'wants' | 'listed' | 'expiring' */
  avail?: string;
  priceMode?: 'under' | 'over';
  priceVal?: number | null;
  ratingMode?: 'under' | 'over';
  ratingVal?: number | null;
}

/**
 * Every signable player in the game, with his club's availability status and
 * the asking price that follows from it. Their `getTransferMarket`.
 */
export function getTransferMarket(s: GameState, filters: MarketFilters = {}): MarketEntry[] {
  const { search, pos, avail, priceMode, priceVal, ratingMode, ratingVal } = filters;
  const q = search?.trim().toLowerCase();
  const out: MarketEntry[] = [];
  const ratingCache = new Map<number, number>();
  const clubRating = (id: number) => {
    let v = ratingCache.get(id);
    if (v === undefined) { v = squadAvgRating(s, id); ratingCache.set(id, v); }
    return v;
  };
  for (const club of s.clubs) {
    if (club.id === s.userClubId || club.dormant) continue;
    for (const id of club.playerIds) {
      const p = s.players[id];
      if (!p) continue;
      if (p.loan) continue; // the parent club owns the registration
      // Cheap numeric filters first so the common case never builds a copy.
      if (ratingVal != null && (ratingMode === 'under' ? p.rating > ratingVal : p.rating < ratingVal)) continue;
      if (priceVal != null && (priceMode === 'under' ? p.value > priceVal : p.value < priceVal)) continue;
      if (pos && pos !== 'ALL' && p.pos !== pos) continue;
      if (q && !p.name.toLowerCase().includes(q) && !p.nat.toLowerCase().includes(q)) continue;
      const st = marketStatus(p, s);
      if (avail && avail !== 'all') {
        if (avail === 'wants' && !st.unsettled) continue;
        if (avail === 'listed' && !st.listed) continue;
        if (avail === 'expiring' && !st.expiring) continue;
        if (avail === 'available' && !(st.unsettled || st.listed || st.expiring)) continue;
      }
      out.push({
        ...p,
        clubName: club.name,
        status: st,
        askingGuide: askingGuide(p, clubRating(club.id), st),
        releaseClauseFee: p.releaseClause > 0 ? p.releaseClause : null,
      });
    }
  }
  return out.sort((a, b) => b.rating - a.rating);
}

export interface LoanEntry extends Player {
  clubName: string;
  fee: number;
  devLoan: boolean;
}

/** Players other clubs would let go on loan. Their `getLoanMarket`. */
export function getLoanMarket(s: GameState): LoanEntry[] {
  const out: LoanEntry[] = [];
  for (const club of s.clubs) {
    if (club.id === s.userClubId || club.dormant) continue;
    const rating = squadAvgRating(s, club.id);
    const cands = club.playerIds
      .map((id) => s.players[id])
      .filter((p): p is Player => Boolean(p) && isLoanAvailable(p, rating));
    if (!cands.length) continue;
    // Clubs don't hawk the whole reserve squad — young prospects with growth
    // left first, then the best of the surplus men.
    const devScore = (p: Player) => (p.age <= 23 ? (p.potential ?? p.rating) - p.rating : -5);
    cands.sort((a, b) => devScore(b) - devScore(a) || b.rating - a.rating);
    for (const p of cands.slice(0, 3)) {
      out.push({
        ...p,
        clubName: club.name,
        fee: loanFee(p),
        devLoan: p.age <= 23 && rating - p.rating < 6,
      });
    }
  }
  return out.sort((a, b) => b.rating - a.rating);
}

/* ------------------------------------------------------- outgoing (buying) */

function pushLog(N: Negotiation, text: string, tone: Negotiation['log'][number]['tone']): void {
  N.log.push({ text, tone });
  if (N.log.length > 24) N.log.splice(0, N.log.length - 24);
}

/**
 * Open talks for a player at another club. A flat refusal ends it before a bid
 * is even made and bans further approaches this season.
 */
export function openNegotiation(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const p = s.players[playerId];
  if (!p) return fail(state, 'Unknown player.');
  if (p.clubId === s.userClubId) return fail(state, 'He is already yours.');
  if (p.loan) return fail(state, `${p.name} is only there on loan — ${p.loan.parentClubName} own him.`);
  if (isTransferBanned(s, playerId)) {
    return fail(state, "That player won't entertain a move to your club again this season.");
  }
  if (hasPreContract(s, playerId)) return fail(state, "You've already agreed a pre-contract with him.");
  const existing = s.negotiations!.find((n) => n.type === 'outgoing' && n.playerId === playerId);
  if (existing) return { state, ok: true, message: 'Talks are already open.' };
  if (getSquad(s, s.userClubId).length >= MAX_SQUAD_SIZE) {
    return fail(state, `Squad is full (max ${MAX_SQUAD_SIZE}).`);
  }
  const seller = clubOf(s, p.clubId);
  if (!seller) return fail(state, 'He has no club to negotiate with.');

  const assess = assessMove(s, playerId, s.userClubId)!;
  if (assess.verdict === 'refuses') {
    const worst = assess.factors.filter((f) => f.delta < 0).sort((a, b) => a.delta - b.delta)[0];
    markTransferBan(s, playerId);
    return { state: s, ok: false, message: `${p.name} has no interest in the move${worst ? ` — ${(worst.detail ?? worst.label).toLowerCase()}` : ''}.` };
  }
  if (assess.verdict === 'reluctant' && Math.random() < 0.30) {
    markTransferBan(s, playerId);
    return { state: s, ok: false, message: `${p.name} isn't convinced by the move and won't open talks for now.` };
  }

  const st = marketStatus(p, s);
  // A player inside the last six months of his deal can be signed on a
  // pre-contract for nothing when the season turns over.
  const preContract = st.monthsLeft <= 6 && !p.loyal;
  const openMsg = preContract
    ? `${p.name} is out of contract in the summer — ${seller.name} can't stop him agreeing a pre-contract.`
    : st.unsettled
      ? `${p.name} has asked to leave — ${seller.name} will listen to sensible offers.`
      : st.listed
        ? `${seller.name} are willing to listen to offers for ${p.name}.`
        : st.expiring
          ? `${p.name} is into the last year of his deal — ${seller.name} would rather cash in than lose him for nothing.`
          : `${seller.name} are not looking to sell ${p.name}. It will take an offer well above his value to change their minds.`;

  const terms = startNegotiation(p, squadAvgRating(s, seller.id), st);
  if (preContract) { terms.asking = 0; terms.minFee = 0; }
  const N: Negotiation = {
    id: newId('neg'),
    type: 'outgoing',
    playerId, clubId: seller.id, clubName: seller.name,
    playerName: p.name, playerPos: p.pos, playerRating: p.rating,
    stage: preContract ? 'terms' : 'fee',
    awaiting: 'user', responseWeek: null, lastTouchWeek: s.week,
    neg: terms,
    lastFee: null, lastWage: null,
    agreedFee: preContract ? 0 : null, agreedWage: null,
    contractYears: 3, promisedStatus: null, signingBonus: 0, releaseClause: 0,
    stance: assess.verdict, stanceScore: assess.score, demands: assess.demands,
    projectedStatus: assess.projectedStatus,
    rival: null, preContract,
    marketValue: p.value,
    log: [
      { text: openMsg, tone: 'info' },
      { text: stanceLine(p.name, assess), tone: assess.verdict === 'keen' ? 'good' : assess.verdict === 'reluctant' ? 'bad' : 'info' },
    ],
  };
  s.negotiations!.push(N);
  return { state: s, ok: true, message: `Talks opened with ${seller.name} over ${p.name}.` };
}

/**
 * Meeting a release clause skips the fee haggling entirely — but the PLAYER
 * still has to want to come, which stops it being a cheat code.
 */
export function triggerReleaseClause(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const p = s.players[playerId];
  if (!p) return fail(state, 'Unknown player.');
  const fee = p.releaseClause > 0 ? p.releaseClause : 0;
  if (!fee) return fail(state, `${p.name} has no release clause.`);
  if (p.clubId === s.userClubId) return fail(state, 'He is already yours.');
  if (fee > s.budget) return fail(state, `His clause is ${money(fee)} — you have ${money(s.budget)}.`);
  if (getSquad(s, s.userClubId).length >= MAX_SQUAD_SIZE) {
    return fail(state, `Squad is full (max ${MAX_SQUAD_SIZE}).`);
  }
  const seller = clubOf(s, p.clubId);
  if (!seller) return fail(state, 'He has no club.');
  const assess = assessMove(s, playerId, s.userClubId)!;
  if (assess.verdict === 'refuses') {
    markTransferBan(s, playerId);
    return { state: s, ok: false, message: `You can meet ${p.name}'s ${money(fee)} clause, but he doesn't want the move.` };
  }
  s.negotiations = s.negotiations!.filter((n) => !(n.type === 'outgoing' && n.playerId === playerId));
  const st = marketStatus(p, s);
  const terms = startNegotiation(p, squadAvgRating(s, seller.id), st);
  const N: Negotiation = {
    id: newId('neg'), type: 'outgoing',
    playerId, clubId: seller.id, clubName: seller.name,
    playerName: p.name, playerPos: p.pos, playerRating: p.rating,
    // The fee is settled by the clause — straight to personal terms.
    stage: 'terms', awaiting: 'user', responseWeek: null, lastTouchWeek: s.week,
    neg: terms,
    lastFee: fee, lastWage: null, agreedFee: fee, agreedWage: null,
    contractYears: 3, promisedStatus: null, signingBonus: 0, releaseClause: 0,
    stance: assess.verdict, stanceScore: assess.score, demands: assess.demands,
    projectedStatus: assess.projectedStatus, rival: null, preContract: false,
    marketValue: p.value,
    log: [
      { text: `You have triggered ${p.name}'s ${money(fee)} release clause. ${seller.name} have no say in the matter.`, tone: 'good' },
      { text: stanceLine(p.name, assess), tone: assess.verdict === 'keen' ? 'good' : assess.verdict === 'reluctant' ? 'bad' : 'info' },
    ],
  };
  s.negotiations!.push(N);
  return { state: s, ok: true, message: `Clause triggered — now agree personal terms with ${p.name}.` };
}

/** Submit a bid. It does not resolve inline: the seller replies next week. */
export function submitFeeOffer(state: GameState, negId: string, fee: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const N = s.negotiations!.find((n) => n.id === negId);
  if (!N || N.type !== 'outgoing' || N.stage !== 'fee') return fail(state, 'No fee to negotiate.');
  if (!Number.isFinite(fee) || fee < 0) return fail(state, 'Enter a valid amount.');
  if (fee > s.budget) return fail(state, `Not enough funds — your budget is ${money(s.budget)}.`);
  N.lastFee = roundFee(fee);
  N.awaiting = 'club';
  N.responseWeek = s.week + 1;
  N.lastTouchWeek = s.week;
  pushLog(N, `You bid ${money(N.lastFee)}.`, 'you');
  pushLog(N, `${N.clubName} will consider your offer.`, 'info');
  return { state: s, ok: true, message: `Bid of ${money(N.lastFee)} sent to ${N.clubName}.` };
}

export interface ContractPackage {
  contractYears?: number;
  promisedStatus?: SquadStatusKey | null;
  signingBonus?: number;
  releaseClause?: number;
}

/** Offer personal terms. The player replies next week. */
export function submitTermsOffer(
  state: GameState,
  negId: string,
  weeklyWageOffer: number,
  pkg: ContractPackage = {}
): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const N = s.negotiations!.find((n) => n.id === negId);
  if (!N || N.type !== 'outgoing' || N.stage !== 'terms') return fail(state, 'No terms to negotiate.');
  if (!Number.isFinite(weeklyWageOffer) || weeklyWageOffer < 0) return fail(state, 'Enter a valid wage.');
  N.contractYears = clamp(Math.round(pkg.contractYears ?? N.contractYears), 1, 5);
  N.promisedStatus = pkg.promisedStatus ?? null;
  N.signingBonus = Math.max(0, Math.round(pkg.signingBonus ?? 0));
  N.releaseClause = Math.max(0, Math.round(pkg.releaseClause ?? 0));
  if (N.signingBonus > s.budget) return fail(state, "You can't cover that signing-on fee.");
  N.lastWage = roundWage(weeklyWageOffer);
  N.awaiting = 'club';
  N.responseWeek = s.week + 1;
  N.lastTouchWeek = s.week;
  pushLog(N, `You offer ${money(N.lastWage)}/wk over ${N.contractYears} years.`, 'you');
  pushLog(N, `${N.playerName} will think it over.`, 'info');
  return { state: s, ok: true, message: `Contract offer sent to ${N.playerName}.` };
}

/** Walk away. He won't talk to you again this season. */
export function walkAwayNegotiation(state: GameState, negId: string): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const N = s.negotiations!.find((n) => n.id === negId);
  if (!N) return fail(state, 'No such negotiation.');
  if (N.type === 'outgoing') markTransferBan(s, N.playerId);
  s.negotiations = s.negotiations!.filter((n) => n.id !== negId);
  return { state: s, ok: true, message: 'You walked away from the table.' };
}

/** Drop a finished/outbid negotiation from the list. */
export function dismissNegotiation(state: GameState, negId: string): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  s.negotiations = s.negotiations!.filter((n) => n.id !== negId);
  return { state: s, ok: true, message: 'Dismissed.' };
}

/** Close out an agreed outgoing deal: sign him, or bank the pre-contract. */
function completeTransfer(s: GameState, N: Negotiation): string {
  const p = s.players[N.playerId];
  const seller = clubOf(s, N.clubId);
  s.negotiations = (s.negotiations ?? []).filter((n) => n.id !== N.id);
  if (!p || !seller) return `The ${N.playerName} deal collapsed — he moved on elsewhere.`;
  const fee = N.agreedFee ?? 0;
  const wage = N.agreedWage ?? p.wage;
  if (fee + N.signingBonus > s.budget) {
    return `Not enough funds to complete the ${p.name} deal — budget is ${money(s.budget)}.`;
  }
  if (getSquad(s, s.userClubId).length >= MAX_SQUAD_SIZE) {
    return `No room in the squad for ${p.name} (max ${MAX_SQUAD_SIZE}).`;
  }
  if (N.preContract) {
    s.preContracts = s.preContracts ?? [];
    s.preContracts.push({
      id: newId('pre'), playerId: p.id, playerName: p.name, fromClubId: seller.id,
      agreedWage: wage, agreedYears: N.contractYears, activatesSeason: s.seasonYear + 1,
    });
    pushInbox(s, {
      category: 'transfer',
      title: `Pre-contract agreed with ${p.name}`,
      body: `${p.name} will join on a free transfer when his ${seller.name} contract expires, on ${money(wage)} per week for ${N.contractYears} years.\n\nHe arrives at the start of next season.`,
      playerId: p.id,
    });
    return `Pre-contract agreed with ${p.name} — he joins next season on a free.`;
  }
  seller.playerIds = seller.playerIds.filter((id) => id !== p.id);
  const mine = clubOf(s, s.userClubId)!;
  mine.playerIds.push(p.id);
  p.clubId = s.userClubId;
  p.wage = wage;
  p.contractYears = N.contractYears;
  p.contractEnd = contractEndFor(s.seasonYear, N.contractYears);
  p.promisedStatus = N.promisedStatus;
  p.promiseWeeks = 0;
  p.promiseBreachWeeks = 0;
  p.releaseClause = N.releaseClause > 0 ? N.releaseClause : 0;
  p.chem = 30; // a new signing integrates over the following weeks
  clearTransferUnrest(p);
  s.budget -= fee + N.signingBonus;
  s.chemistry = clamp(s.chemistry - 6, 0, 100);
  s.ledger.unshift({ week: s.week, desc: `Signed ${p.name}`, amount: -(fee + N.signingBonus) });
  s.news.unshift(`Signed ${p.name} from ${seller.name} for ${money(fee)}.`);
  pushInbox(s, {
    category: 'transfer',
    title: `${p.name} signs for the club`,
    body: `${p.name} has joined from ${seller.name} for ${money(fee)} on ${money(wage)} per week, signing a ${N.contractYears}-year deal.${N.promisedStatus ? `\n\nHe was promised ${statusLabel(N.promisedStatus)} status — deliver the game time or he will down tools.` : ''}${N.releaseClause > 0 ? `\n\nHis contract carries a ${money(N.releaseClause)} release clause.` : ''}`,
    playerId: p.id,
  });
  return `Signed ${p.name} for ${money(fee)} on ${money(wage)}/wk!`;
}

function clearTransferUnrest(p: Player): void {
  p.wantsMove = false;
  delete p.wantsMoveReason;
  p.transferListed = false;
  p.listingPrice = null;
  p.loanListed = false;
  p.unhappy = false;
  p.benchWeeks = 0;
}

/* ---------------------------------------------------- incoming (selling) */

/** Put one of your players on the market at your own price. */
export function listForSale(state: GameState, playerId: number, price: number): TransferResult {
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  if (!p || p.clubId !== s.userClubId) return fail(state, 'Not your player.');
  if (p.loan) return fail(state, "He's only here on loan — his parent club owns the registration.");
  if (!Number.isFinite(price) || price <= 0) return fail(state, 'Enter a valid asking price.');
  p.listingPrice = roundFee(price);
  p.transferListed = true;
  return { state: s, ok: true, message: `${p.name} listed at ${money(p.listingPrice)}.` };
}

export function delistPlayer(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const p = s.players[playerId];
  if (!p) return fail(state, 'Unknown player.');
  p.listingPrice = null;
  p.transferListed = false;
  s.negotiations = s.negotiations!.filter((n) => !(n.type === 'incoming' && n.playerId === playerId));
  return { state: s, ok: true, message: `${p.name} removed from the transfer list.` };
}

export function toggleLoanList(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const p = s.players[playerId];
  if (!p || p.clubId !== s.userClubId) return fail(state, 'Not your player.');
  if (p.loan) return fail(state, "He's only here on loan — you can't loan him out again.");
  p.loanListed = !p.loanListed;
  if (!p.loanListed) s.negotiations = s.negotiations!.filter((n) => !(n.isLoan && n.playerId === playerId));
  return {
    state: s, ok: true,
    message: p.loanListed
      ? `${p.name} made available for loan — clubs will enquire.`
      : `${p.name} pulled from the loan list.`,
  };
}

/** Accept a bid (or a loan enquiry) outright. */
export function acceptIncomingOffer(state: GameState, negId: string): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const N = s.negotiations!.find((n) => n.id === negId);
  if (!N || N.type !== 'incoming') return fail(state, 'No such offer.');
  const msg = N.isLoan ? completeLoanOut(s, N) : completeIncomingSale(s, N);
  return { state: s, ok: true, message: msg };
}

export function rejectIncomingOffer(state: GameState, negId: string): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  s.negotiations = s.negotiations!.filter((n) => n.id !== negId);
  return { state: s, ok: true, message: 'Offer rejected.' };
}

/** Counter a bid. The bidder decides next week whether to meet it. */
export function counterIncomingOffer(state: GameState, negId: string, counter: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const N = s.negotiations!.find((n) => n.id === negId);
  if (!N || N.type !== 'incoming') return fail(state, 'No such offer.');
  const fee = roundFee(counter);
  if (!(fee > (N.fee ?? 0))) return fail(state, `${N.clubName} won't accept less than their bid of ${money(N.fee ?? 0)}.`);
  N.lastCounter = fee;
  N.awaiting = 'club';
  N.responseWeek = s.week + 1;
  N.lastTouchWeek = s.week;
  return { state: s, ok: true, message: `Counter of ${money(fee)} sent to ${N.clubName}.` };
}

/**
 * Play rival bidders off against each other: every club in the race is told the
 * current top bid and given a week to raise, hold firm, or pull out.
 */
export function playOffBidders(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const offers = s.negotiations!.filter(
    (n) => n.type === 'incoming' && n.playerId === playerId && n.stage !== 'outbid' && n.awaiting === 'user' && !n.isLoan
  );
  if (offers.length < 2) return fail(state, 'You need at least two live bids to play them off.');
  const top = Math.max(...offers.map((o) => Math.max(o.lastCounter ?? 0, o.fee ?? 0)));
  for (const o of offers) {
    o.playoffFloor = top;
    o.awaiting = 'club';
    o.responseWeek = s.week + 1;
    o.lastTouchWeek = s.week;
  }
  return {
    state: s, ok: true,
    message: `All ${offers.length} clubs told the bidding stands at ${money(top)} — best and final offers expected.`,
  };
}

function completeIncomingSale(s: GameState, N: Negotiation): string {
  s.negotiations = (s.negotiations ?? []).filter((n) => n.id !== N.id);
  const p = s.players[N.playerId];
  const mine = clubOf(s, s.userClubId)!;
  if (!p || p.clubId !== s.userClubId) return 'That player is no longer in your squad.';
  if (mine.playerIds.length <= MIN_SQUAD_SIZE) return `Squad too small to sell (min ${MIN_SQUAD_SIZE}).`;
  const fee = N.lastCounter ?? N.fee ?? 0;
  recordScenarioSale(s, p, fee);
  const buyer = clubOf(s, N.clubId);
  mine.playerIds = mine.playerIds.filter((id) => id !== p.id);
  if (buyer && buyer.playerIds.length < MAX_SQUAD_SIZE) {
    buyer.playerIds.push(p.id);
    p.clubId = buyer.id;
  } else {
    p.clubId = 0;
  }
  clearTransferUnrest(p);
  p.promisedStatus = null;
  p.chem = 30;
  s.budget += fee;
  s.chemistry = clamp(s.chemistry - 3, 0, 100);
  s.lineup = s.lineup.map((id) => (id === p.id ? null : id));
  // Clear every other bid for this player, including a rival club's.
  s.negotiations = (s.negotiations ?? []).filter((n) => n.playerId !== p.id);
  s.ledger.unshift({ week: s.week, desc: `Sold ${p.name}`, amount: fee });
  s.news.unshift(`Sold ${p.name} to ${buyer?.name ?? 'another club'} for ${money(fee)}.`);
  pushInbox(s, {
    category: 'transfer',
    title: `${p.name} departs the club`,
    body: `${p.name} has joined ${buyer?.name ?? 'another club'} for ${money(fee)}.\n\nThe funds have been added to your transfer budget.`,
    playerId: p.id,
  });
  return `${p.name} sold to ${buyer?.name ?? 'another club'} for ${money(fee)}!`;
}

/* ------------------------------------------------------------------ loans */

/** Move a loanee back to his parent club immediately. */
function executeLoanReturn(s: GameState, p: Player): void {
  const L = p.loan;
  if (!L) return;
  const at = clubOf(s, p.clubId);
  const parent = clubOf(s, L.parentClubId);
  if (at) at.playerIds = at.playerIds.filter((id) => id !== p.id);
  delete p.loan;
  p.loanListed = false;
  if (parent) {
    parent.playerIds.push(p.id);
    p.clubId = parent.id;
    p.chem = Math.max(p.chem ?? 40, 45); // coming home, not arriving somewhere new
  } else {
    p.clubId = 0;
  }
  if (at?.id === s.userClubId || parent?.id === s.userClubId) {
    s.lineup = s.lineup.map((id) => (id === p.id ? null : id));
  }
}

/** Send one of your players out on loan on the terms the borrower offered. */
function completeLoanOut(s: GameState, N: Negotiation): string {
  s.negotiations = (s.negotiations ?? []).filter((n) => n.id !== N.id);
  const p = s.players[N.playerId];
  const mine = clubOf(s, s.userClubId)!;
  const borrower = clubOf(s, N.clubId);
  if (!p || p.clubId !== s.userClubId) return 'That player is no longer in your squad.';
  if (!borrower) return 'That club has withdrawn.';
  if (mine.playerIds.length <= MIN_SQUAD_SIZE) return `Squad too small to loan anyone out (min ${MIN_SQUAD_SIZE}).`;
  if (borrower.playerIds.length >= MAX_SQUAD_SIZE) return `${borrower.name} have no room in their squad.`;
  mine.playerIds = mine.playerIds.filter((id) => id !== p.id);
  borrower.playerIds.push(p.id);
  p.clubId = borrower.id;
  p.loan = {
    parentClubId: s.userClubId, parentClubName: mine.name,
    untilSeason: s.seasonYear + 1,
    wageShare: N.loanWageShare ?? 0,
    playingTime: N.loanPlayingTime ?? null,
    optionToBuy: 0,
    startApps: p.apps, startGoals: p.goals,
    startClubPlayed: clubGamesPlayed(s, borrower.id),
    clauseBroken: false, warnedGames: null,
  };
  p.loanListed = false;
  p.listingPrice = null;
  p.chem = 40;
  s.lineup = s.lineup.map((id) => (id === p.id ? null : id));
  s.budget += N.fee ?? 0;
  s.negotiations = (s.negotiations ?? []).filter((n) => n.playerId !== p.id);
  s.ledger.unshift({ week: s.week, desc: `${p.name} loan fee`, amount: N.fee ?? 0 });
  const clauses = loanClauseText(p.loan.wageShare, p.loan.playingTime, 0, money);
  s.news.unshift(`${p.name} joins ${borrower.name} on loan (${clauses}).`);
  return `${p.name} joins ${borrower.name} on loan until the end of the season (${money(N.fee ?? 0)} fee, ${clauses}).`;
}

/**
 * Borrow a player from an AI club. Instant yes/no: clubs only let fringe or
 * development players go, and never to a direct rival.
 */
export function requestLoanIn(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  ensureArrays(s);
  const p = s.players[playerId];
  if (!p) return fail(state, 'Unknown player.');
  if (p.loan) return fail(state, "He's already out on loan.");
  const owner = clubOf(s, p.clubId);
  if (!owner || owner.id === s.userClubId) return fail(state, 'He is not available to borrow.');
  if (isTransferBanned(s, playerId)) return fail(state, `${owner.name} have already said no this season.`);
  const mine = clubOf(s, s.userClubId)!;
  if (mine.playerIds.length >= MAX_SQUAD_SIZE) return fail(state, `Squad is full (max ${MAX_SQUAD_SIZE}).`);
  const fee = loanFee(p);
  if (fee > s.budget) return fail(state, `Not enough funds for the ${money(fee)} loan fee.`);

  const ownerRating = squadAvgRating(s, owner.id);
  // A direct rival is a club in your league within striking distance.
  const rival = owner.leagueId === mine.leagueId;
  if (isLoanAvailable(p, ownerRating)) {
    if (rival) {
      markTransferBan(s, playerId);
      return { state: s, ok: false, message: `${owner.name} won't strengthen a direct rival — no loan for ${p.name}.` };
    }
  } else {
    // Long-shot ask for a player the club hasn't listed.
    const surplus = ownerRating - p.rating;
    const young = p.age <= 23;
    let chance = surplus >= 3 ? 0.6 : surplus >= 0 ? (young ? 0.45 : 0.25) : young ? 0.15 : 0.05;
    if (rival) chance *= 0.4;
    if (Math.random() > chance) {
      markTransferBan(s, playerId);
      return {
        state: s, ok: false,
        message: `${owner.name} won't loan ${p.name} out${surplus < 0 ? " — he's a key player for them" : ''}.`,
      };
    }
  }
  // The player has a say too. A loan is about football, not the badge.
  const la = assessMove(s, playerId, s.userClubId, { loan: true })!;
  if (la.verdict === 'refuses') {
    markTransferBan(s, playerId);
    const worst = la.factors.filter((f) => f.delta < 0).sort((a, b) => a.delta - b.delta)[0];
    return { state: s, ok: false, message: `${p.name} turned the loan down${worst ? ` — ${(worst.detail ?? worst.label).toLowerCase()}` : ''}.` };
  }

  owner.playerIds = owner.playerIds.filter((id) => id !== p.id);
  mine.playerIds.push(p.id);
  p.clubId = s.userClubId;
  // Development loans (a young player below the owner's level) come with the
  // parent chipping in on wages but a firm expectation he plays.
  const devLoan = p.age <= 23 && p.rating < ownerRating;
  p.loan = {
    parentClubId: owner.id, parentClubName: owner.name,
    untilSeason: s.seasonYear + 1,
    wageShare: devLoan ? 0.25 : 0,
    playingTime: devLoan ? 'regular' : 'occasional',
    // The parent sets the option above his current value so a good season
    // doesn't come cheap.
    optionToBuy: roundFee(p.value * (devLoan ? 1.35 : 1.15)),
    startApps: p.apps, startGoals: p.goals,
    startClubPlayed: clubGamesPlayed(s, s.userClubId),
    clauseBroken: false, warnedGames: null,
  };
  clearTransferUnrest(p);
  p.chem = 30;
  s.budget -= fee;
  s.ledger.unshift({ week: s.week, desc: `${p.name} loan fee`, amount: -fee });
  const clauses = loanClauseText(p.loan.wageShare, p.loan.playingTime, p.loan.optionToBuy, money);
  s.news.unshift(`${p.name} joins on loan from ${owner.name}.`);
  return { state: s, ok: true, message: `${p.name} joins on loan until the end of the season — ${clauses}.` };
}

/**
 * Turn a loan into a permanent deal at the pre-agreed price. The parent club
 * has no say — that's what the option is — but the player still has to want it.
 */
export function exerciseLoanOption(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  if (!p || p.clubId !== s.userClubId || !p.loan) return fail(state, 'He is not on loan with you.');
  const fee = p.loan.optionToBuy;
  if (!(fee > 0)) return fail(state, 'That loan carries no option to buy.');
  if (fee > s.budget) return fail(state, `His option is ${money(fee)} — you have ${money(s.budget)}.`);
  const parentName = p.loan.parentClubName;
  const parent = clubOf(s, p.loan.parentClubId);
  const a = assessMove(s, playerId, s.userClubId)!;
  if (a.verdict === 'refuses') {
    return fail(state, `${p.name} doesn't want to make the move permanent — he'll see out the loan and go back to ${parentName}.`);
  }
  if (parent) parent.playerIds = parent.playerIds.filter((id) => id !== p.id);
  delete p.loan;
  p.loanListed = false;
  p.chem = Math.max(p.chem ?? 40, 55); // he's been here all season
  p.contractYears = 3;
  p.contractEnd = contractEndFor(s.seasonYear, 3);
  clearTransferUnrest(p);
  s.budget -= fee;
  s.ledger.unshift({ week: s.week, desc: `${p.name} loan option`, amount: -fee });
  s.news.unshift(`${p.name} signs permanently from ${parentName} for ${money(fee)}.`);
  return { state: s, ok: true, message: `${p.name} is yours permanently — option taken up with ${parentName} for ${money(fee)}.` };
}

/**
 * Recall a player you loaned out: freely once the borrower has broken the
 * playing-time clause, otherwise only in the first half of the season.
 */
export function recallFromLoan(state: GameState, playerId: number): TransferResult {
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  if (!p || !p.loan || p.loan.parentClubId !== s.userClubId) return fail(state, "He's no longer out on loan.");
  if (!p.loan.clauseBroken && s.week > 24) {
    return fail(state, 'The loan terms are being honoured — you can only recall him before the midway point.');
  }
  const mine = clubOf(s, s.userClubId)!;
  if (mine.playerIds.length >= MAX_SQUAD_SIZE) return fail(state, `Squad is full (max ${MAX_SQUAD_SIZE}).`);
  const fromName = clubOf(s, p.clubId)?.name ?? 'his loan club';
  executeLoanReturn(s, p);
  return { state: s, ok: true, message: `${p.name} recalled from his loan at ${fromName}.` };
}

/* ================================ WEEKLY TICK ============================ */

/**
 * Everything the transfer world does between rounds. Called once per round
 * from `aiWeeklyTransfers` (the one weekly hook the season loop already owns),
 * so a save that never opens the Transfers screen still sees a living market.
 */
export function tickTransferWeek(s: GameState): string[] {
  ensureArrays(s);
  const headlines: string[] = [];
  returnExpiredLoans(s, headlines);
  activatePreContracts(s, headlines);
  resolveNegotiationResponses(s, headlines);
  rollBiddingWars(s, headlines);
  checkIncomingOffers(s, headlines);
  tickLoanClauses(s, headlines);
  tickSquadPromises(s);
  generatePlayerEvents(s);
  s.transferNews = (s.transferNews ?? []).slice(0, 20);
  return headlines;
}

function returnExpiredLoans(s: GameState, headlines: string[]): void {
  for (const p of Object.values(s.players)) {
    if (p.loan && s.seasonYear >= p.loan.untilSeason) {
      const parentName = p.loan.parentClubName;
      const wasMine = p.loan.parentClubId === s.userClubId || p.clubId === s.userClubId;
      executeLoanReturn(s, p);
      if (wasMine) headlines.push(`${p.name} returns from his loan spell to ${parentName}.`);
    }
  }
}

function activatePreContracts(s: GameState, headlines: string[]): void {
  const pending = s.preContracts ?? [];
  if (!pending.length) return;
  const remaining: PreContract[] = [];
  const mine = clubOf(s, s.userClubId)!;
  for (const pc of pending) {
    if (s.seasonYear < pc.activatesSeason) { remaining.push(pc); continue; }
    const p = s.players[pc.playerId];
    if (!p) continue;
    if (mine.playerIds.length >= MAX_SQUAD_SIZE) { remaining.push(pc); continue; }
    const from = clubOf(s, p.clubId);
    if (from) from.playerIds = from.playerIds.filter((id) => id !== p.id);
    mine.playerIds.push(p.id);
    p.clubId = s.userClubId;
    p.wage = pc.agreedWage;
    p.contractYears = pc.agreedYears;
    p.contractEnd = contractEndFor(s.seasonYear, pc.agreedYears);
    p.chem = 30;
    clearTransferUnrest(p);
    headlines.push(`${p.name} arrives on a free transfer — the pre-contract is done.`);
    pushInbox(s, {
      category: 'transfer',
      title: `${p.name} joins on a free`,
      body: `${p.name}'s pre-contract has activated. He joins on ${money(pc.agreedWage)} per week for ${pc.agreedYears} years, with no fee paid.`,
      playerId: p.id,
    });
  }
  s.preContracts = remaining;
}

function resolveNegotiationResponses(s: GameState, headlines: string[]): void {
  const keep: Negotiation[] = [];
  for (const N of s.negotiations ?? []) {
    if (N.stage === 'outbid') { keep.push(N); continue; } // sits until dismissed
    if (N.awaiting === 'user' && s.week - N.lastTouchWeek > NEGOTIATION_LAPSE_WEEKS) {
      if (N.type === 'outgoing') {
        markTransferBan(s, N.playerId);
        headlines.push(`Talks with ${N.clubName} over ${N.playerName} lapsed.`);
      } else {
        headlines.push(`${N.clubName}'s offer for ${N.playerName} expired.`);
      }
      continue; // drop — nobody acted on it
    }
    if (N.awaiting !== 'club' || N.responseWeek == null || N.responseWeek > s.week) { keep.push(N); continue; }
    if (N.type === 'outgoing') resolveOutgoingResponse(s, N, keep, headlines);
    else resolveIncomingResponse(s, N, keep, headlines);
  }
  s.negotiations = keep;
}

function resolveOutgoingResponse(s: GameState, N: Negotiation, keep: Negotiation[], headlines: string[]): void {
  const p = s.players[N.playerId];
  const seller = clubOf(s, N.clubId);
  if (!p || !seller || p.clubId !== seller.id) return; // he moved on — drop the deal
  N.awaiting = 'user';
  N.lastTouchWeek = s.week;
  if (N.stage === 'fee') {
    const r = evaluateFeeOffer(N.neg, N.lastFee ?? 0);
    if (r.decision === 'accept') {
      N.agreedFee = N.lastFee;
      N.stage = 'terms';
      pushLog(N, `${seller.name} accept ${money(N.lastFee ?? 0)}! Now agree personal terms.`, 'good');
      headlines.push(`${seller.name} accepted your ${money(N.lastFee ?? 0)} bid for ${p.name}.`);
      keep.push(N);
    } else if (r.decision === 'counter') {
      if (r.holdOut) {
        pushLog(N, `${seller.name} have had second thoughts about selling ${p.name}. They now want ${money(r.counter)}.`, 'bad');
        headlines.push(`${seller.name} raised their demands for ${p.name} to ${money(r.counter)}.`);
      } else {
        pushLog(N, `${seller.name} reject ${money(N.lastFee ?? 0)}, but would accept ${money(r.counter)}.`, 'info');
      }
      keep.push(N);
    } else if (r.decision === 'reject') {
      pushLog(N, `${seller.name} dismiss your ${money(N.lastFee ?? 0)} bid as far too low.`, 'bad');
      keep.push(N);
    } else {
      markTransferBan(s, N.playerId);
      headlines.push(`${seller.name} have ended negotiations over ${p.name}.`);
    }
    return;
  }
  // Personal terms.
  const r = evaluateTermsOffer(N.neg, N.lastWage ?? 0, {
    promisedStatus: N.promisedStatus,
    projectedStatus: N.projectedStatus,
    signingBonus: N.signingBonus,
    releaseClause: N.releaseClause,
    contractYears: N.contractYears,
  });
  if (r.decision === 'accept') {
    if (r.persuadedBy) pushLog(N, `${p.name} takes less than he asked for — the package swung it.`, 'good');
    N.agreedWage = N.lastWage;
    headlines.push(completeTransfer(s, N));
  } else if (r.decision === 'counter') {
    if (r.holdOut) {
      pushLog(N, `${p.name}'s agent senses you're keen and pushes for more — he now wants ${money(N.neg.wageDemand)}/wk.`, 'bad');
    } else {
      pushLog(N, `${p.name} rejects ${money(N.lastWage ?? 0)}/wk but would sign for ${money(N.neg.wageDemand)}/wk.`, 'info');
    }
    keep.push(N);
  } else if (r.decision === 'reject') {
    pushLog(N, `${p.name} is insulted by an offer of just ${money(N.lastWage ?? 0)}/wk.`, 'bad');
    keep.push(N);
  } else {
    markTransferBan(s, N.playerId);
    headlines.push(`${p.name} rejected your contract terms.`);
  }
}

function resolveIncomingResponse(s: GameState, N: Negotiation, keep: Negotiation[], headlines: string[]): void {
  N.awaiting = 'user';
  N.lastTouchWeek = s.week;
  // Playoff round: the club was told the top rival bid and now raises, holds or walks.
  if (N.playoffFloor != null) {
    const floor = N.playoffFloor;
    N.playoffFloor = null;
    const maxW = N.maxWilling ?? (N.marketValue ?? 0) * 1.15;
    if (maxW > floor) {
      N.fee = Math.max(N.fee ?? 0, roundFee(Math.min(maxW, floor * (1.04 + Math.random() * 0.10))));
      headlines.push(`${N.clubName} raised their bid for ${N.playerName} to ${money(N.fee)}.`);
      keep.push(N);
    } else if ((N.fee ?? 0) >= floor) {
      headlines.push(`${N.clubName} are holding firm at ${money(N.fee ?? 0)} for ${N.playerName} — final offer.`);
      keep.push(N);
    } else {
      headlines.push(`${N.clubName} pulled out of the race for ${N.playerName}.`);
    }
    return;
  }
  // The user sent a counter; the bidder decides whether to meet it.
  const maxWilling = N.maxWilling ?? (N.marketValue ?? 0) * 1.15;
  if ((N.lastCounter ?? Infinity) <= maxWilling) {
    N.fee = N.lastCounter ?? N.fee;
    headlines.push(completeIncomingSale(s, N));
  } else {
    headlines.push(`${N.clubName} rejected your ${money(N.lastCounter ?? 0)} counter — they walked away.`);
  }
}

/**
 * Rival interest in a player the user is trying to buy. Sometimes the rival's
 * opening bid is simply too good to refuse and the target is gone.
 */
function rollBiddingWars(s: GameState, headlines: string[]): void {
  for (const N of s.negotiations ?? []) {
    if (N.type !== 'outgoing' || N.stage !== 'fee' || N.preContract) continue;
    const completeRivalSigning = (): boolean => {
      const p = s.players[N.playerId];
      const seller = clubOf(s, N.clubId);
      const rivalClub = N.rival ? clubOf(s, N.rival.clubId) : null;
      if (!p || !seller || !rivalClub || rivalClub.playerIds.length >= MAX_SQUAD_SIZE) return false;
      seller.playerIds = seller.playerIds.filter((id) => id !== p.id);
      rivalClub.playerIds.push(p.id);
      p.clubId = rivalClub.id;
      p.contractYears = 3;
      p.contractEnd = contractEndFor(s.seasonYear, 3);
      p.chem = 30;
      clearTransferUnrest(p);
      s.transferNews!.unshift(`${rivalClub.name} completed the signing of ${p.name} from ${seller.name} for ${money(N.rival!.offer)}.`);
      N.stage = 'outbid';
      N.awaiting = 'user';
      return true;
    };
    if (!N.rival && Math.random() < 0.14) {
      const rivals = s.clubs.filter((c) => c.id !== s.userClubId && c.id !== N.clubId && !c.dormant);
      if (!rivals.length) continue;
      const rival = rivals[Math.floor(Math.random() * rivals.length)];
      if (Math.random() < 0.25) {
        const offer = roundFee(Math.max(N.neg.asking, N.neg.minFee) * (1.05 + Math.floor(Math.random() * 21) / 100));
        N.rival = { clubId: rival.id, clubName: rival.name, offer };
        if (completeRivalSigning()) {
          headlines.push(`${rival.name} swooped in with a ${money(offer)} bid for ${N.playerName} — ${N.clubName} accepted on the spot!`);
        }
        continue;
      }
      const rivalOffer = roundFee(N.neg.minFee * (1 + Math.floor(Math.random() * 16) / 100));
      N.rival = { clubId: rival.id, clubName: rival.name, offer: rivalOffer };
      N.neg.minFee = Math.max(N.neg.minFee, rivalOffer);
      N.neg.asking = Math.max(N.neg.asking, rivalOffer);
      pushLog(N, `${rival.name} have also entered talks for ${N.playerName}.`, 'bad');
      headlines.push(`${rival.name} have also entered talks for ${N.playerName} — expect the price to climb.`);
    } else if (N.rival && Math.random() < 0.18) {
      if (completeRivalSigning()) headlines.push(`You've been outbid! ${N.rival.clubName} signed ${N.playerName}.`);
    }
  }
}

/**
 * AI clubs bid for the user's listed players, circle anyone whose deal runs out
 * within a year, and enquire about loan-listed players.
 */
function checkIncomingOffers(s: GameState, headlines: string[]): void {
  const mine = clubOf(s, s.userClubId);
  if (!mine) return;
  const squad = getSquad(s, s.userClubId).filter((p) => !p.loan);
  const listed = squad.filter((p) => p.listingPrice != null);
  const expiringUnlisted = squad.filter(
    (p) => p.listingPrice == null && !p.loyal && contractMonthsLeft(p, s) <= 12
  );
  const loanListed = squad.filter((p) => p.loanListed);
  if (!listed.length && !expiringUnlisted.length && !loanListed.length) return;
  if (mine.playerIds.length <= MIN_SQUAD_SIZE) return; // nothing to sell
  const aiClubs = s.clubs.filter((c) => c.id !== s.userClubId && !c.dormant);
  if (!aiClubs.length) return;

  const tryBid = (p: Player, isListed: boolean, contestFloor?: number) => {
    if (Math.random() > (contestFloor ? 0.25 : isListed ? 0.30 : 0.12)) return;
    // Listed players draw fair bids (75-100% of value); an unlisted-but-expiring
    // player draws a cheeky lowball since the club hasn't been put up for sale.
    const frac = isListed ? 0.75 + Math.random() * 0.25 : 0.45 + Math.random() * 0.25;
    const fee = Math.max(10_000, roundFee(Math.max(p.value * frac, (contestFloor ?? 0) * (1.03 + Math.random() * 0.12))));
    const alreadyBidding = new Set(
      s.negotiations!.filter((n) => n.type === 'incoming' && n.playerId === p.id).map((n) => n.clubId)
    );
    const candidates = aiClubs.filter((c) => !alreadyBidding.has(c.id) && c.playerIds.length < MAX_SQUAD_SIZE);
    if (!candidates.length) return;
    const bidder = candidates[Math.floor(Math.random() * candidates.length)];
    // The most they'll pay: value × 1.10-1.20 if listed; opportunistic bids
    // won't go much past value since they know you didn't ask to sell.
    const maxWilling = roundFee(Math.max(
      fee * (1.02 + Math.random() * 0.10),
      p.value * (isListed ? 1.10 + Math.random() * 0.10 : 0.85 + Math.random() * 0.15)
    ));
    s.negotiations!.push({
      id: newId('neg'), type: 'incoming', stage: 'fee', awaiting: 'user',
      responseWeek: null, lastTouchWeek: s.week,
      playerId: p.id, playerName: p.name, playerPos: p.pos, playerRating: p.rating,
      clubId: bidder.id, clubName: bidder.name,
      neg: { asking: fee, minFee: fee, wageDemand: p.wage, minWage: p.wage, feeRound: 0, wageRound: 0, holdOut: 0, wageHoldOut: 0 },
      lastFee: null, lastWage: null, agreedFee: null, agreedWage: null,
      contractYears: 3, promisedStatus: null, signingBonus: 0, releaseClause: 0,
      stance: 'open', stanceScore: 0, demands: [], projectedStatus: 'first_team',
      fee, maxWilling, lastCounter: null, marketValue: p.value,
      log: [],
    });
    headlines.push(isListed
      ? `${bidder.name} have bid ${money(fee)} for ${p.name}.`
      : `${bidder.name} have made an opportunistic bid of ${money(fee)} for ${p.name}, whose contract is running down.`);
  };

  for (const p of listed) tryBid(p, true);
  // A live offer draws rivals in, seeding an incoming bidding war.
  for (const p of listed) {
    const active = s.negotiations!.filter((n) => n.type === 'incoming' && n.playerId === p.id && n.stage !== 'outbid');
    if (active.length === 1) tryBid(p, true, Math.max(active[0].lastCounter ?? 0, active[0].fee ?? 0));
  }
  for (const p of expiringUnlisted) tryBid(p, false);

  // Loan enquiries come from clubs a notch below the player's level.
  for (const p of loanListed) {
    if (Math.random() > 0.35) continue;
    if (s.negotiations!.some((n) => n.isLoan && n.playerId === p.id)) continue;
    const suitors = aiClubs.filter((c) => {
      const r = squadAvgRating(s, c.id);
      return r <= p.rating + 2 && r >= p.rating - 8 && c.playerIds.length < MAX_SQUAD_SIZE;
    });
    if (!suitors.length) continue;
    const borrower = suitors[Math.floor(Math.random() * suitors.length)];
    const fee = Math.max(20_000, roundFee(p.value * (0.03 + Math.random() * 0.04)));
    // Most suitors want him as a starter and cover everything; some only offer
    // squad minutes but ask the parent to chip in on wages.
    const wantsStarter = Math.random() < 0.7;
    const wageShare = wantsStarter ? 0 : Math.round((0.2 + Math.random() * 0.2) * 100) / 100;
    s.negotiations!.push({
      id: newId('neg'), type: 'incoming', isLoan: true, stage: 'fee', awaiting: 'user',
      responseWeek: null, lastTouchWeek: s.week,
      playerId: p.id, playerName: p.name, playerPos: p.pos, playerRating: p.rating,
      clubId: borrower.id, clubName: borrower.name,
      neg: { asking: fee, minFee: fee, wageDemand: p.wage, minWage: p.wage, feeRound: 0, wageRound: 0, holdOut: 0, wageHoldOut: 0 },
      lastFee: null, lastWage: null, agreedFee: null, agreedWage: null,
      contractYears: 1, promisedStatus: null, signingBonus: 0, releaseClause: 0,
      stance: 'open', stanceScore: 0, demands: [], projectedStatus: 'first_team',
      fee, marketValue: p.value, loanWageShare: wageShare,
      loanPlayingTime: wantsStarter ? 'regular' : 'occasional',
      log: [],
    });
    headlines.push(`${borrower.name} want ${p.name} on loan for the season.`);
  }
}

/**
 * Weekly clause check for every loan the user is a party to (parent OR
 * borrower). Warns first, then an AI parent genuinely exercises its recall.
 */
function tickLoanClauses(s: GameState, headlines: string[]): void {
  const myId = s.userClubId;
  const recalls: Player[] = [];
  for (const p of Object.values(s.players)) {
    const L = p.loan;
    if (!L || !L.playingTime) continue;
    const mineOut = L.parentClubId === myId;
    const mineIn = p.clubId === myId && !mineOut;
    if (!mineOut && !mineIn) continue;
    const games = clubGamesPlayed(s, p.clubId) - L.startClubPlayed;
    // Too small a sample, or he can't be blamed while he's injured.
    if (games < 6 || p.injuryWeeks > 0) continue;
    const apps = Math.max(0, p.apps - L.startApps);
    const ratio = apps / games;
    const req = LOAN_PLAYTIME[L.playingTime].ratio;
    if (ratio >= req) {
      if (L.clauseBroken) { L.clauseBroken = false; L.warnedGames = null; } // back on track
      continue;
    }
    if (!L.clauseBroken) {
      L.clauseBroken = true;
      L.warnedGames = games;
      const label = LOAN_PLAYTIME[L.playingTime].label.toLowerCase();
      const atName = clubOf(s, p.clubId)?.name ?? 'his loan club';
      if (mineOut) {
        headlines.push(`${p.name}'s playing-time clause at ${atName} is broken — recall available.`);
        pushInbox(s, {
          category: 'transfer',
          title: `Loan clause broken: ${p.name}`,
          body: `${atName} agreed ${p.name} would be a ${label}, but he has made just ${apps} appearance${apps === 1 ? '' : 's'} in their ${games} league games since the loan began.\n\nThe playing-time clause is broken — you can recall him at any time.`,
          playerId: p.id,
        });
      } else {
        headlines.push(`${L.parentClubName} may recall ${p.name} — he isn't getting the agreed game time.`);
        pushInbox(s, {
          category: 'transfer',
          title: `${L.parentClubName} unhappy over ${p.name}`,
          body: `${L.parentClubName} loaned you ${p.name} to play — the deal carries a ${label} clause, and he has made only ${apps} appearance${apps === 1 ? '' : 's'} in ${games} league games.\n\nGet him on the pitch soon or they will exercise their recall clause.`,
          playerId: p.id,
        });
      }
    } else if (mineIn && games >= (L.warnedGames ?? 0) + 4) {
      recalls.push(p); // warned a month of fixtures ago and still not playing
    }
  }
  for (const p of recalls) {
    const parentName = p.loan!.parentClubName;
    executeLoanReturn(s, p);
    headlines.push(`${parentName} have recalled ${p.name} from his loan.`);
    pushInbox(s, {
      category: 'transfer',
      title: `${p.name} recalled by ${parentName}`,
      body: `${parentName} have exercised their recall clause — the agreed playing time never materialised, so ${p.name} has gone back to his parent club.`,
      playerId: p.id,
    });
  }
}

/**
 * Promises made in negotiations are checked against what actually happens. A
 * player told he'd be a key man and then left on the bench downs tools — which
 * is what makes the squad-status lever a real decision rather than free words.
 */
function tickSquadPromises(s: GameState): void {
  const squad = getSquad(s, s.userClubId);
  if (!squad.length) return;
  const teamGames = Math.max(1, ...squad.map((p) => p.apps));
  const inLineup = new Set(s.lineup.filter((id): id is number => id != null));
  for (const p of squad) {
    // Bench tracking feeds transfer requests from frozen-out players.
    p.benchWeeks = inLineup.has(p.id) ? 0 : (p.benchWeeks ?? 0) + 1;
    if (!p.promisedStatus || p.loan) continue;
    p.promiseWeeks = (p.promiseWeeks ?? 0) + 1;
    // Give a signing time to settle, and wait until the sample means something.
    if (p.promiseWeeks < 8 || teamGames < 6) continue;
    const need = SQUAD_STATUS[p.promisedStatus as SquadStatusKey]?.minShare ?? 0;
    const share = p.apps / teamGames;
    if (share >= need * 0.85 || p.injuryWeeks > 0) { p.promiseBreachWeeks = 0; continue; }
    p.promiseBreachWeeks = (p.promiseBreachWeeks ?? 0) + 1;
    if (p.promiseBreachWeeks === 4) {
      p.morale = Math.max(0, p.morale - 12);
      pushInbox(s, {
        category: 'club',
        title: `${p.name} unhappy with his game time`,
        body: `${p.name} was promised he would be a ${statusLabel(p.promisedStatus as SquadStatusKey).toLowerCase()} when he signed. He has featured in ${Math.round(share * 100)}% of matches since.\n\nHis representatives have been in touch.`,
        playerId: p.id,
      });
    } else if (p.promiseBreachWeeks >= 9 && !p.wantsMove) {
      p.morale = Math.max(0, p.morale - 22);
      const broken = p.promisedStatus as SquadStatusKey;
      p.promisedStatus = null; // the promise is dead; he's stopped believing it
      fileTransferRequest(s, p, 'game_time',
        `${p.name} has formally asked to leave. He signed on the promise of being a ${statusLabel(broken).toLowerCase()} and does not believe that promise has been kept.`);
    }
  }
}

function fileTransferRequest(
  s: GameState,
  p: Player,
  reason: 'ability' | 'ambition' | 'game_time',
  body: string
): void {
  p.transferListed = true;
  p.wantsMove = true;
  p.wantsMoveReason = reason;
  p.unhappy = true;
  p.listingPrice = p.listingPrice ?? roundFee(p.value);
  pushInbox(s, {
    category: 'transfer',
    title: `${p.name} requests a transfer`,
    body,
    playerId: p.id,
  });
  s.news.unshift(`${p.name} has requested a transfer.`);
}

/** Transfer requests from unhappy players, with a stated reason. */
function generatePlayerEvents(s: GameState): void {
  const squad = getSquad(s, s.userClubId);
  if (!squad.length) return;
  const squadRating = squadAvgRating(s, s.userClubId);
  for (const p of squad) {
    if (p.loan || p.injuryWeeks > 0 || p.wantsMove || p.transferListed || p.loyal) continue;
    const ambition = playerAmbition(p, squadRating);
    const gap = p.rating - squadRating;
    // He feels he has outgrown the club.
    if (ambition >= 0.65 && gap >= 8 && Math.random() < 0.04) {
      fileTransferRequest(s, p, 'ability',
        `${p.name} (${p.pos}, ${p.rating} rated) believes he has outgrown the club and has handed in a transfer request. He is unlikely to sign a new contract while he feels this way.`);
    // Starved of game time. The reference also gates this on `ambition`, but
    // `ambition` is driven by how far ABOVE the squad average he is, so with a
    // real squad the two gates never overlap and the branch is dead code —
    // measured over 40 simulated weeks it fired exactly zero times. Being good
    // enough to expect to play (`gap >= -3`) is the condition that matters, so
    // that is the only gate here.
    } else if ((p.benchWeeks ?? 0) >= 6 && gap >= -3 && Math.random() < 0.045) {
      fileTransferRequest(s, p, 'game_time',
        `${p.name} (${p.pos}, ${p.rating} rated) is unhappy with his lack of game time and has handed in a transfer request. He is unlikely to sign a new contract while he is frozen out.`);
    }
  }
}

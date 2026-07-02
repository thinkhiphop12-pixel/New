import type { GameState, Player, Position, TransferOffer } from './types';
import { MAX_SQUAD_SIZE, MIN_SQUAD_SIZE } from './gameRules';
import { availableSquad, getSquad, isOnLoan, squadAvgRating } from './teamManagement';
import { clamp, weeklyWage } from './utils';

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
  delete p.onLoanUntil;
  s.budget -= price;
  s.chemistry = clamp(s.chemistry - 6, 0, 100); // new faces take time to gel
  s.ledger.unshift({ week: s.week, desc: `Signed ${p.name}`, amount: -price });
  s.news.unshift(`Signed ${p.name} for ${money(price)}.`);
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
  s.budget -= bonus;
  s.ledger.unshift({ week: s.week, desc: `${sp.name} contract bonus`, amount: -bonus });
  s.news.unshift(`${sp.name} signs a new deal (${sp.contractYears}y, ${money(sp.wage)}/w).`);
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
    if (Math.random() < Math.max(0.02, interest * 0.35)) {
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
  const reports: ScoutReport[] = [];
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
    const group = squad.filter((p) => p.pos === pos);
    const need = group.length ? group.reduce((s, p) => s + p.rating, 0) / group.length : 50;
    const picks = targets
      .filter((p) => p.pos === pos && p.rating >= need - 1)
      .sort((a, b) => b.rating + (28 - b.age) * 0.3 - (a.rating + (28 - a.age) * 0.3))
      .slice(0, 4);
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
  const headlines: string[] = [];
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
    club.playerIds.push(pick.id);
    freeAgents.splice(freeAgents.indexOf(pick), 1);
    if (pick.rating >= clubAvg + 2) headlines.push(`${club.name} snap up free agent ${pick.name}.`);
  }
  return headlines;
}

function money(v: number): string {
  return v >= 1_000_000 ? `£${(Math.round(v / 100_000) / 10).toFixed(1)}M` : `£${Math.round(v / 1000)}K`;
}

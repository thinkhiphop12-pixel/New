import type { GameState, Player, TransferOffer } from './types';
import { MAX_SQUAD_SIZE, MIN_SQUAD_SIZE } from './gameRules';
import { getSquad } from './teamManagement';

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
  s.budget -= price;
  s.news.unshift(`Signed ${p.name} for ${money(price)}.`);
  return s;
}

export function canSell(state: GameState, playerId: number): BuyResult {
  const p = state.players[playerId];
  if (!p || p.clubId !== state.userClubId) return { ok: false, error: 'Not your player.' };
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
  s.lineup = s.lineup.map((id) => (id === playerId ? null : id));
  s.incomingOffers = s.incomingOffers.filter((o) => o.playerId !== playerId);
  s.news.unshift(`Sold ${p.name} for ${money(amount)}.`);
  return s;
}

/**
 * Roll this week's incoming AI bids for the user's players. Bids favour
 * high-rated players and can exceed market value — selling to a bid is how
 * you fund a rebuild.
 */
export function generateWeeklyOffers(state: GameState): TransferOffer[] {
  const squad = getSquad(state, state.userClubId);
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

function money(v: number): string {
  return v >= 1_000_000 ? `£${(Math.round(v / 100_000) / 10).toFixed(1)}M` : `£${Math.round(v / 1000)}K`;
}

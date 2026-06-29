import type { DraftState, Player, Pool, Position, Squad } from './types';
import { TOTAL_PICKS, XI_REQUIREMENTS } from './types';

export function createDraftState(pool: Pool): DraftState {
  return {
    pool,
    currentSquad: null,
    picks: [],
    seenSquadIds: [],
    swapEditionUsed: false,
    swapSquadUsed: false,
  };
}

export function countByPosition(state: DraftState, position: Position): number {
  return state.picks.filter((p) => p.player.position === position).length;
}

export function isXiComplete(state: DraftState): boolean {
  return state.picks.length >= TOTAL_PICKS;
}

export function canPickPosition(state: DraftState, position: Position): boolean {
  if (isXiComplete(state)) return false;
  return countByPosition(state, position) < XI_REQUIREMENTS[position];
}

export function isPlayerPicked(state: DraftState, player: Player): boolean {
  return state.picks.some((p) => p.player.id === player.id);
}

export function canPickPlayer(state: DraftState, player: Player): boolean {
  if (isPlayerPicked(state, player)) return false;
  return canPickPosition(state, player.position);
}

/** Has a player already been drafted from this squad? Each squad gives one. */
function isSquadAlreadyUsed(state: DraftState, squad: Squad): boolean {
  return state.picks.some((p) => p.squadId === squad.id);
}

/** Does this (un-drafted) squad still contain a player for an open slot? */
function offersNeededPlayer(state: DraftState, squad: Squad): boolean {
  if (isSquadAlreadyUsed(state, squad)) return false;
  return squad.players.some((p) => canPickPosition(state, p.position) && !isPlayerPicked(state, p));
}

/**
 * Picks a random squad to offer next from the active pool. Prefers squads not
 * yet seen this run, and only ones that can fill an open slot — so a spin can
 * never strand the player on an unusable squad.
 */
export function spinForSquad(state: DraftState, pool: Squad[]): Squad {
  const usable = pool.filter((s) => offersNeededPlayer(state, s));
  const usablePool = usable.length > 0 ? usable : pool;
  const unseen = usablePool.filter((s) => !state.seenSquadIds.includes(s.id));
  const candidates = unseen.length > 0 ? unseen : usablePool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function markSquadSeen(state: DraftState, squad: Squad): DraftState {
  return {
    ...state,
    currentSquad: squad,
    seenSquadIds: state.seenSquadIds.includes(squad.id)
      ? state.seenSquadIds
      : [...state.seenSquadIds, squad.id],
  };
}

/**
 * Drafts one player from the current squad. Each squad contributes a single
 * player, so the squad is cleared afterwards and the player spins again.
 */
export function pickPlayer(state: DraftState, player: Player, squad: Squad): DraftState {
  if (!canPickPlayer(state, player)) {
    throw new Error(`Cannot pick ${player.name}: slot full or already picked`);
  }
  return {
    ...state,
    currentSquad: null,
    picks: [
      ...state.picks,
      {
        player,
        squadId: squad.id,
        squadLabel: `${squad.flag} ${squad.countryName} ${squad.tournamentYear}`,
      },
    ],
    seenSquadIds: state.seenSquadIds.includes(squad.id)
      ? state.seenSquadIds
      : [...state.seenSquadIds, squad.id],
  };
}

/** Eligible "same country, different year" editions for the current squad. */
function editionCandidates(state: DraftState, pool: Squad[]): Squad[] {
  if (!state.currentSquad) return [];
  const { countryName, id } = state.currentSquad;
  return pool.filter(
    (s) => s.countryName === countryName && s.id !== id && offersNeededPlayer(state, s)
  );
}

/** Eligible "same year, different country" squads for the current squad. */
function squadCandidates(state: DraftState, pool: Squad[]): Squad[] {
  if (!state.currentSquad) return [];
  const { tournamentYear, id } = state.currentSquad;
  return pool.filter(
    (s) => s.tournamentYear === tournamentYear && s.id !== id && offersNeededPlayer(state, s)
  );
}

export function canSwapEdition(state: DraftState, pool: Squad[]): boolean {
  return !state.swapEditionUsed && state.currentSquad !== null && editionCandidates(state, pool).length > 0;
}

export function canSwapSquad(state: DraftState, pool: Squad[]): boolean {
  return !state.swapSquadUsed && state.currentSquad !== null && squadCandidates(state, pool).length > 0;
}

/**
 * Swap the edition: keep the same country, change the tournament year. Consumes
 * the once-per-game edition swap only when a valid same-country edition exists;
 * otherwise the state is returned unchanged (the reroll is never wasted).
 */
export function swapEdition(state: DraftState, pool: Squad[]): DraftState {
  if (!canSwapEdition(state, pool)) return state;
  const candidates = editionCandidates(state, pool);
  const squad = candidates[Math.floor(Math.random() * candidates.length)];
  return markSquadSeen({ ...state, swapEditionUsed: true }, squad);
}

/**
 * Swap the squad: keep the same tournament year, change the country. Consumes
 * the once-per-game squad swap only when a valid same-year squad exists;
 * otherwise the state is returned unchanged (the reroll is never wasted).
 */
export function swapSquad(state: DraftState, pool: Squad[]): DraftState {
  if (!canSwapSquad(state, pool)) return state;
  const candidates = squadCandidates(state, pool);
  const squad = candidates[Math.floor(Math.random() * candidates.length)];
  return markSquadSeen({ ...state, swapSquadUsed: true }, squad);
}

export function remainingPositions(state: DraftState): Position[] {
  return (Object.keys(XI_REQUIREMENTS) as Position[]).filter((pos) => canPickPosition(state, pos));
}

/** Average rating of the players drafted so far, or 0 with no picks yet. */
export function draftStrength(state: DraftState): number {
  if (state.picks.length === 0) return 0;
  const sum = state.picks.reduce((acc, p) => acc + p.player.rating, 0);
  return Math.round(sum / state.picks.length);
}

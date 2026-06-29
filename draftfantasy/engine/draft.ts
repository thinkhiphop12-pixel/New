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

/** Does this squad still contain a player for an open slot? */
function offersNeededPlayer(state: DraftState, squad: Squad): boolean {
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

export function canSwapEdition(state: DraftState): boolean {
  return !state.swapEditionUsed && state.currentSquad !== null;
}

export function canSwapSquad(state: DraftState): boolean {
  return !state.swapSquadUsed && state.currentSquad !== null;
}

/**
 * Swap the edition: keep the same country, change the tournament year. Uses the
 * once-per-game edition swap. Falls back to any usable squad if the country has
 * no other eligible edition in the pool.
 */
export function swapEdition(state: DraftState, pool: Squad[]): DraftState {
  if (!canSwapEdition(state) || !state.currentSquad) return state;
  const { countryName, id } = state.currentSquad;
  const used = { ...state, swapEditionUsed: true };
  const sameCountry = pool.filter(
    (s) => s.countryName === countryName && s.id !== id && offersNeededPlayer(used, s)
  );
  const squad =
    sameCountry.length > 0
      ? sameCountry[Math.floor(Math.random() * sameCountry.length)]
      : spinForSquad(used, pool);
  return markSquadSeen(used, squad);
}

/**
 * Swap the squad: keep the same tournament year, change the country. Uses the
 * once-per-game squad swap. Falls back to any usable squad if the year has no
 * other eligible country in the pool.
 */
export function swapSquad(state: DraftState, pool: Squad[]): DraftState {
  if (!canSwapSquad(state) || !state.currentSquad) return state;
  const { tournamentYear, id } = state.currentSquad;
  const used = { ...state, swapSquadUsed: true };
  const sameYear = pool.filter(
    (s) => s.tournamentYear === tournamentYear && s.id !== id && offersNeededPlayer(used, s)
  );
  const squad =
    sameYear.length > 0
      ? sameYear[Math.floor(Math.random() * sameYear.length)]
      : spinForSquad(used, pool);
  return markSquadSeen(used, squad);
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

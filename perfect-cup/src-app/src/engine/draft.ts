import type { DraftState, Player, Position, Squad } from './types';
import { TOTAL_PICKS, TOTAL_REROLLS, XI_REQUIREMENTS } from './types';

export function createDraftState(): DraftState {
  return {
    currentSquad: null,
    picks: [],
    seenSquadIds: [],
    rerollsLeft: TOTAL_REROLLS,
  };
}

/** Picks a random squad the player hasn't seen yet this run. */
export function spinForSquad(state: DraftState, squads: Squad[]): Squad {
  const unseen = squads.filter((s) => !state.seenSquadIds.includes(s.id));
  const pool = unseen.length > 0 ? unseen : squads;
  return pool[Math.floor(Math.random() * pool.length)];
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

/** Adds a player to the squad. Returns a new DraftState; throws if the pick is invalid. */
export function pickPlayer(state: DraftState, player: Player, squad: Squad): DraftState {
  if (!canPickPlayer(state, player)) {
    throw new Error(`Cannot pick ${player.name}: position full or already picked`);
  }
  return {
    ...state,
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

export function markSquadSeen(state: DraftState, squad: Squad): DraftState {
  return {
    ...state,
    currentSquad: squad,
    seenSquadIds: state.seenSquadIds.includes(squad.id)
      ? state.seenSquadIds
      : [...state.seenSquadIds, squad.id],
  };
}

/** Rerolls are only allowed before the first pick — once you draft a player, the squad locks in. */
export function canReroll(state: DraftState): boolean {
  return state.rerollsLeft > 0 && state.picks.length === 0;
}

/** Rerolls the current squad for a new random one, consuming one reroll. */
export function rerollSquad(state: DraftState, squads: Squad[]): DraftState {
  if (!canReroll(state)) return state;
  const next: DraftState = { ...state, rerollsLeft: state.rerollsLeft - 1 };
  const squad = spinForSquad(next, squads);
  return markSquadSeen(next, squad);
}

export function remainingPositions(state: DraftState): Position[] {
  return (Object.keys(XI_REQUIREMENTS) as Position[]).filter((pos) =>
    canPickPosition(state, pos)
  );
}

/** Average rating of the squad picked so far, or 0 with no picks yet. */
export function draftStrength(state: DraftState): number {
  if (state.picks.length === 0) return 0;
  const sum = state.picks.reduce((acc, p) => acc + p.player.rating, 0);
  return Math.round(sum / state.picks.length);
}

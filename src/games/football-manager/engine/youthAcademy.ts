import type { GameState } from './types';
import { MAX_SQUAD_SIZE } from './gameRules';

/**
 * Youth squad helpers. Intake (`makeYouthPlayer`, called at season end in
 * `seasonProgression.ts`) drops new prospects into `club.youthPlayerIds` —
 * a list kept separate from `club.playerIds` so youth players never count
 * toward `MAX_SQUAD_SIZE`, never draw a first-team wage-bill line, and never
 * show up in lineup/tactics selection (which all read `playerIds`).
 * `promoteYouthPlayer` is the only bridge between the two lists.
 */

/** Youth-team players for a club, most recent intake first. */
export function getYouthSquad(state: GameState, clubId: number) {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club?.youthPlayerIds) return [];
  return club.youthPlayerIds
    .map((id) => state.players[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

/**
 * Move a youth player onto the first-team roster. Fails silently (returns
 * the state unchanged) if the player isn't in the club's youth squad or the
 * first team is already at `MAX_SQUAD_SIZE`.
 */
export function promoteYouthPlayer(state: GameState, playerId: number): GameState {
  const club = state.clubs.find((c) => c.playerIds && c.youthPlayerIds?.includes(playerId));
  if (!club) return state;
  if (club.playerIds.length >= MAX_SQUAD_SIZE) return state;

  const s: GameState = structuredClone(state);
  const sClub = s.clubs.find((c) => c.id === club.id)!;
  sClub.youthPlayerIds = (sClub.youthPlayerIds ?? []).filter((id) => id !== playerId);
  sClub.playerIds.push(playerId);

  const player = s.players[playerId];
  if (player) {
    s.news.unshift(`${player.name} is promoted from the youth academy to the first team.`);
  }
  return s;
}

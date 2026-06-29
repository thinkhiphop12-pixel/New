import type { DraftPick, MatchResult, Run, Squad } from '@/engine/types';

/** Row shape returned by Supabase for the `runs` table. */
export interface RunRow {
  id: string;
  anonymous_id: string;
  share_code: string;
  squad_ids: string[] | null;
  player_ids: string[] | null;
  match_results: MatchResult[] | null;
  goals_for: number | null;
  goals_against: number | null;
  perfect_run: boolean | null;
  is_champion: boolean | null;
  success: boolean | null;
  pool: string | null;
  objective: string | null;
  final_score: string | null;
  team_strength: number | null;
  played_at: string;
  replay_code: string | null;
}

/** Short, shareable code for a run (used as the unique share_code). */
export function makeShareCode(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${time}${rand}`.toUpperCase();
}

/** Builds the POST body for /api/runs from a completed run. */
export function runToInsert(run: Run, anonymousId: string) {
  const squadIds = Array.from(new Set(run.picks.map((p) => p.squadId)));
  const playerIds = run.picks.map((p) => p.player.id);
  return {
    shareCode: makeShareCode(),
    anonymousId,
    squad_ids: squadIds,
    player_ids: playerIds,
    match_results: run.matches,
    goals_for: run.goalsFor,
    goals_against: run.goalsAgainst,
    perfect_run: run.isPerfect,
    is_champion: run.isChampion,
    success: run.success,
    pool: run.pool,
    objective: run.objective,
    final_score: run.finalRecord,
    team_strength: run.teamStrength,
    played_at: run.date,
  };
}

/**
 * Reconstructs a full Run (including drafted picks) from a stored row.
 * Picks are rebuilt by looking each player id up in the loaded squad data, so
 * the result screen renders identically for runs created on any device.
 */
export function rowToRun(row: RunRow, playerIndex: Map<string, { player: DraftPick['player']; squad: Squad }>): Run {
  const picks: DraftPick[] = (row.player_ids ?? [])
    .map((id) => {
      const entry = playerIndex.get(id);
      if (!entry) return null;
      return {
        player: entry.player,
        squadId: entry.squad.id,
        squadLabel: `${entry.squad.flag} ${entry.squad.countryName} ${entry.squad.tournamentYear}`,
      } satisfies DraftPick;
    })
    .filter((p): p is DraftPick => p !== null);

  const objective: Run['objective'] = row.objective === 'trophy' ? 'trophy' : 'perfect';
  const pool: Run['pool'] =
    row.pool === 'history' || row.pool === 'england' ? row.pool : 'legends';
  const isPerfect = row.perfect_run ?? false;
  const isChampion = row.is_champion ?? isPerfect;

  return {
    id: row.id,
    date: row.played_at,
    pool,
    objective,
    picks,
    matches: row.match_results ?? [],
    goalsFor: row.goals_for ?? 0,
    goalsAgainst: row.goals_against ?? 0,
    isPerfect,
    isChampion,
    success: row.success ?? (objective === 'perfect' ? isPerfect : isChampion),
    finalRecord: row.final_score ?? '0-0-0',
    teamStrength: row.team_strength ?? 0,
  };
}

/** Builds a player-id → {player, squad} lookup from loaded squads. */
export function buildPlayerIndex(squads: Squad[]) {
  const index = new Map<string, { player: DraftPick['player']; squad: Squad }>();
  for (const squad of squads) {
    for (const player of squad.players) {
      index.set(player.id, { player, squad });
    }
  }
  return index;
}

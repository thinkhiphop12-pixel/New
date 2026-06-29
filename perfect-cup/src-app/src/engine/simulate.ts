import type { DraftPick, MatchResult, Run, Squad } from './types';
import { TOTAL_MATCHES } from './types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Knuth's algorithm — fine for the small lambdas (~0.2-5) goal counts use. */
function poissonRandom(lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > limit);
  return k - 1;
}

function expectedGoals(attack: number, defense: number): number {
  const diff = attack - defense;
  return clamp(1.35 + diff / 16, 0.2, 5.5);
}

/** Picks an opponent whose strength roughly matches how far into the run we are. */
function pickOpponent(round: number, totalRounds: number, pool: Squad[]): Squad {
  const targetPct = round / totalRounds;
  const ranked = [...pool].sort(
    (a, b) => Math.abs(a.strengthPct - targetPct) - Math.abs(b.strengthPct - targetPct)
  );
  const bandSize = Math.max(3, Math.floor(ranked.length * 0.08));
  const band = ranked.slice(0, bandSize);
  return band[Math.floor(Math.random() * band.length)] ?? pool[0];
}

function outcomeFor(ourGoals: number, opponentGoals: number): MatchResult['outcome'] {
  if (ourGoals > opponentGoals) return 'win';
  if (ourGoals < opponentGoals) return 'loss';
  return 'draw';
}

export interface SimulationResult {
  matches: MatchResult[];
  goalsFor: number;
  goalsAgainst: number;
  isPerfect: boolean;
  finalScoreline: string;
}

/**
 * Simulates all knockout matches against real squads from the dataset, with
 * difficulty escalating round over round. Strength advantage shifts the
 * expected-goals split for each side; actual goals are then sampled from a
 * Poisson distribution so favorites usually win but upsets stay possible.
 */
export function simulateRun(
  teamStrength: number,
  allSquads: Squad[],
  usedSquadIds: Set<string>
): SimulationResult {
  const pool = allSquads.filter((s) => !usedSquadIds.has(s.id));
  const opponentPool = pool.length > 0 ? pool : allSquads;

  const matches: MatchResult[] = [];
  let goalsFor = 0;
  let goalsAgainst = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (let round = 1; round <= TOTAL_MATCHES; round++) {
    const opponent = pickOpponent(round, TOTAL_MATCHES, opponentPool);
    const ourGoals = poissonRandom(expectedGoals(teamStrength, opponent.strength));
    const opponentGoals = poissonRandom(expectedGoals(opponent.strength, teamStrength));
    const outcome = outcomeFor(ourGoals, opponentGoals);

    if (outcome === 'win') wins += 1;
    else if (outcome === 'draw') draws += 1;
    else losses += 1;

    goalsFor += ourGoals;
    goalsAgainst += opponentGoals;

    matches.push({
      round,
      opponent: `${opponent.flag} ${opponent.countryName} ${opponent.tournamentYear}`,
      ourGoals,
      opponentGoals,
      outcome,
    });
  }

  return {
    matches,
    goalsFor,
    goalsAgainst,
    isPerfect: wins === TOTAL_MATCHES,
    finalScoreline: `${wins}-${draws}-${losses}`,
  };
}

function makeRunId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildRun(picks: DraftPick[], teamStrength: number, sim: SimulationResult): Run {
  return {
    id: makeRunId(),
    date: new Date().toISOString(),
    picks,
    matches: sim.matches,
    goalsFor: sim.goalsFor,
    goalsAgainst: sim.goalsAgainst,
    isPerfect: sim.isPerfect,
    finalScoreline: sim.finalScoreline,
    teamStrength,
  };
}

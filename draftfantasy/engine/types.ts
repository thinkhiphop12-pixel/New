export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Player {
  id: string;
  name: string;
  position: Position;
  rating: number;
  squadId: string;
}

export type Tier = 'legendary' | 'strong' | 'medium' | 'weak';

export interface Squad {
  id: string;
  countryName: string;
  tournamentYear: number;
  flag: string;
  strength: number;
  strengthPct: number;
  tier: Tier;
  players: Player[];
}

/** The Perfect Cup XI is a five-a-side: 1 GK, 1 DEF, 2 MID, 1 FWD. */
export const XI_REQUIREMENTS: Record<Position, number> = {
  GK: 1,
  DEF: 1,
  MID: 2,
  FWD: 1,
};

export const TOTAL_PICKS = 5;
/** 2026 format: 3 group games + Round of 32, 16, QF, SF, Final = 8 to lift it. */
export const TOTAL_MATCHES = 8;

/** Squad pool the player drafts from. */
export type Pool = 'legends' | 'history' | 'england';

/** Win condition. */
export type Objective = 'perfect' | 'trophy';

/** How match results are revealed. */
export type RevealMode = 'watch' | 'instant';

export interface DraftPick {
  player: Player;
  squadId: string;
  squadLabel: string;
}

export interface DraftState {
  pool: Pool;
  currentSquad: Squad | null;
  picks: DraftPick[];
  seenSquadIds: string[];
  swapEditionUsed: boolean;
  swapSquadUsed: boolean;
}

export interface MatchResult {
  round: number;
  roundName: string;
  stage: 'group' | 'knockout';
  opponent: string;
  ourGoals: number;
  opponentGoals: number;
  outcome: 'win' | 'draw' | 'loss';
}

export interface Run {
  id: string;
  date: string;
  pool: Pool;
  objective: Objective;
  picks: DraftPick[];
  matches: MatchResult[];
  goalsFor: number;
  goalsAgainst: number;
  /** Won all eight matches (the 8-0). */
  isPerfect: boolean;
  /** Lifted the trophy (won the final). */
  isChampion: boolean;
  /** Whether the chosen objective was met. */
  success: boolean;
  finalRecord: string;
  teamStrength: number;
}

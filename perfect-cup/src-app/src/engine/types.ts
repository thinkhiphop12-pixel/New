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

/** Requirements for a complete starting XI (4-4-2). */
export const XI_REQUIREMENTS: Record<Position, number> = {
  GK: 1,
  DEF: 4,
  MID: 4,
  FWD: 2,
};

export const TOTAL_PICKS = 11;
export const TOTAL_MATCHES = 8;
export const TOTAL_REROLLS = 3;

export interface DraftPick {
  player: Player;
  squadId: string;
  squadLabel: string;
}

export interface DraftState {
  currentSquad: Squad | null;
  picks: DraftPick[];
  seenSquadIds: string[];
  rerollsLeft: number;
}

export interface MatchResult {
  round: number;
  opponent: string;
  ourGoals: number;
  opponentGoals: number;
  outcome: 'win' | 'draw' | 'loss';
}

export interface Run {
  id: string;
  date: string;
  picks: DraftPick[];
  matches: MatchResult[];
  goalsFor: number;
  goalsAgainst: number;
  isPerfect: boolean;
  finalScoreline: string;
  teamStrength: number;
}

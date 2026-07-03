/**
 * League definitions and utilities for the global multi-league world.
 * Replaces the Division 1/2/3 system with league-based structure.
 */

export type LeagueId =
  | 'PL' // Premier League
  | 'LA' // La Liga
  | 'SA' // Serie A
  | 'BL' // Bundesliga
  | 'L1' // Ligue 1
  | 'EFL2' // Championship
  | 'EFL3' // League One
  | 'EFL4'; // League Two

export interface League {
  id: LeagueId;
  name: string;
  country: string;
  tier: number; // 1 = top, 8 = lowest
  clubCount: number;
  promotion?: {
    to: LeagueId;
    count: number;
  };
  relegation?: {
    to: LeagueId;
    count: number;
  };
  continentalSpots: number;
  /** Gate income multiplier relative to PL baseline. */
  attendanceMultiplier: number;
  /** Reputation affects wages, transfer power, player expectations. */
  reputation: number; // 0-100, for balancing
}

export const LEAGUES: Record<LeagueId, League> = {
  PL: {
    id: 'PL',
    name: 'Premier League',
    country: 'England',
    tier: 1,
    clubCount: 20,
    promotion: undefined,
    relegation: { to: 'EFL2', count: 3 },
    continentalSpots: 4,
    attendanceMultiplier: 1.0,
    reputation: 100,
  },
  LA: {
    id: 'LA',
    name: 'La Liga',
    country: 'Spain',
    tier: 2,
    clubCount: 20,
    promotion: undefined,
    relegation: undefined,
    continentalSpots: 4,
    attendanceMultiplier: 0.95,
    reputation: 95,
  },
  BL: {
    id: 'BL',
    name: 'Bundesliga',
    country: 'Germany',
    tier: 3,
    clubCount: 18,
    promotion: undefined,
    relegation: undefined,
    continentalSpots: 4,
    attendanceMultiplier: 0.92,
    reputation: 92,
  },
  SA: {
    id: 'SA',
    name: 'Serie A',
    country: 'Italy',
    tier: 4,
    clubCount: 20,
    promotion: undefined,
    relegation: undefined,
    continentalSpots: 4,
    attendanceMultiplier: 0.88,
    reputation: 88,
  },
  L1: {
    id: 'L1',
    name: 'Ligue 1',
    country: 'France',
    tier: 5,
    clubCount: 18,
    promotion: undefined,
    relegation: undefined,
    continentalSpots: 3,
    attendanceMultiplier: 0.85,
    reputation: 85,
  },
  EFL2: {
    id: 'EFL2',
    name: 'Championship',
    country: 'England',
    tier: 2,
    clubCount: 24,
    promotion: { to: 'PL', count: 3 },
    relegation: { to: 'EFL3', count: 3 },
    continentalSpots: 0,
    attendanceMultiplier: 0.68,
    reputation: 68,
  },
  EFL3: {
    id: 'EFL3',
    name: 'League One',
    country: 'England',
    tier: 3,
    clubCount: 24,
    promotion: { to: 'EFL2', count: 3 },
    relegation: { to: 'EFL4', count: 3 },
    continentalSpots: 0,
    attendanceMultiplier: 0.45,
    reputation: 45,
  },
  EFL4: {
    id: 'EFL4',
    name: 'League Two',
    country: 'England',
    tier: 4,
    clubCount: 24,
    promotion: { to: 'EFL3', count: 3 },
    relegation: undefined,
    continentalSpots: 0,
    attendanceMultiplier: 0.30,
    reputation: 30,
  },
};

export const TOP_5_LEAGUES: LeagueId[] = ['PL', 'LA', 'BL', 'SA', 'L1'];
export const ENGLISH_PYRAMID: LeagueId[] = ['PL', 'EFL2', 'EFL3', 'EFL4'];
export const ALL_LEAGUES: LeagueId[] = Object.keys(LEAGUES) as LeagueId[];

export function getLeague(id: LeagueId): League {
  return LEAGUES[id];
}

export function getLeaguesByTier(tier: number): LeagueId[] {
  return ALL_LEAGUES.filter((id) => LEAGUES[id].tier === tier);
}

/**
 * Get continental qualification spots across all TOP_5 leagues.
 * Returns an array of (leagueId, position) tuples.
 */
export function getContinentalQualification(): Array<{ league: LeagueId; position: number }> {
  const spots: Array<{ league: LeagueId; position: number }> = [];
  for (const leagueId of TOP_5_LEAGUES) {
    const league = LEAGUES[leagueId];
    for (let pos = 1; pos <= league.continentalSpots; pos++) {
      spots.push({ league: leagueId, position: pos });
    }
  }
  return spots;
}

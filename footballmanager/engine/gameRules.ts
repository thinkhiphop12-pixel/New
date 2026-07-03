import type { FormationDef, Position } from './types';
import type { LeagueId } from './leagues';
import { LEAGUES } from './leagues';

export const SEASON_ROUNDS = 38;
export const MIN_SQUAD_SIZE = 16;
export const MAX_SQUAD_SIZE = 30;
export const PROMOTION_SPOTS = 3;

/**
 * Starting budget by league. Top 5 European leagues have higher budgets;
 * English pyramid is tiered.
 */
export function getStartingBudget(leagueId: LeagueId): number {
  switch (leagueId) {
    case 'PL': return 40_000_000;
    case 'LA': return 38_000_000;
    case 'BL': return 36_000_000;
    case 'SA': return 34_000_000;
    case 'L1': return 32_000_000;
    case 'EFL2': return 12_000_000;
    case 'EFL3': return 4_000_000;
    case 'EFL4': return 1_500_000;
  }
}

/**
 * Prize money by league and final position (1-based).
 */
export function getPrizeMoney(leagueId: LeagueId, position: number): number {
  switch (leagueId) {
    case 'PL': return Math.max(0, 32_000_000 - (position - 1) * 1_200_000);
    case 'LA': return Math.max(0, 28_000_000 - (position - 1) * 1_100_000);
    case 'BL': return Math.max(0, 26_000_000 - (position - 1) * 1_050_000);
    case 'SA': return Math.max(0, 24_000_000 - (position - 1) * 1_000_000);
    case 'L1': return Math.max(0, 22_000_000 - (position - 1) * 950_000);
    case 'EFL2': return Math.max(0, 10_000_000 - (position - 1) * 350_000);
    case 'EFL3': return Math.max(0, 3_000_000 - (position - 1) * 100_000);
    case 'EFL4': return Math.max(0, 1_000_000 - (position - 1) * 30_000);
  }
}

/**
 * Weekly gate income baseline per league.
 */
export function getGateBase(leagueId: LeagueId): number {
  const league = LEAGUES[leagueId];
  // Top 5 start high; English pyramid scaled down
  const basePL = 550_000;
  return Math.round(basePL * league.attendanceMultiplier);
}

/** Calendar weeks each domestic cup round is played (6 rounds, ~168 clubs). */
export const CUP_WEEKS = [4, 9, 14, 19, 25, 31];
/** Prize for winning a tie in each cup round (last = winning the final). */
export const CUP_PRIZES = [150_000, 300_000, 600_000, 1_200_000, 2_500_000, 6_000_000];

/** Continental Champions Cup: 20 teams, group stage + knockout. */
export const CONTINENTAL_WEEKS = [7, 17, 29];
export const CONTINENTAL_PRIZES = [3_000_000, 6_000_000, 15_000_000];
export const CONTINENTAL_SPOTS = 20;

/** Cost to upgrade the youth academy to level 2 / level 3. */
export const ACADEMY_UPGRADE_COST: Record<number, number> = { 2: 5_000_000, 3: 12_000_000 };

/** Backroom staff: cost to reach each level (index = new level) and weekly wage per level. */
export const STAFF_UPGRADE_COST = [0, 500_000, 1_500_000, 4_000_000];
export const STAFF_WEEKLY_WAGE = 10_000; // per level, per role
export const STAFF_MAX_LEVEL = 3;

/** Stadium expansion: gate income multiplier is 1 + 0.25 × (level − 1). */
export const STADIUM_UPGRADE_COST: Record<number, number> = { 2: 8_000_000, 3: 20_000_000 };

/** In-match substitutions allowed at half time. */
export const MAX_SUBS = 3;

export const HOME_ADVANTAGE = 1.18;
export const BASE_GOALS = 1.32; // league-average goals per team per match

export const MORALE_START = 60;
export const MORALE_WIN = 6;
export const MORALE_DRAW = 1;
export const MORALE_LOSS = -6;
export const MORALE_MIN = 30;
export const MORALE_MAX = 95;

function line(pos: Position, labels: string[], y: number): { pos: Position; label: string; x: number; y: number }[] {
  const n = labels.length;
  return labels.map((label, i) => ({
    pos,
    label,
    x: n === 1 ? 50 : 10 + (80 * i) / (n - 1),
    y,
  }));
}

export const FORMATIONS: FormationDef[] = [
  {
    id: '4-4-2',
    name: '4-4-2 Classic',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'RB'], 28),
      ...line('MID', ['LM', 'CM', 'CM', 'RM'], 55),
      ...line('FWD', ['ST', 'ST'], 82),
    ],
  },
  {
    id: '4-3-3',
    name: '4-3-3 Attack',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'RB'], 28),
      ...line('MID', ['CM', 'CM', 'CM'], 54),
      ...line('FWD', ['LW', 'ST', 'RW'], 81),
    ],
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1 Control',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'RB'], 27),
      ...line('MID', ['CDM', 'CDM'], 46),
      ...line('MID', ['CAM', 'CAM', 'CAM'], 65),
      ...line('FWD', ['ST'], 85),
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2 Wingback',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['CB', 'CB', 'CB'], 26),
      ...line('MID', ['LM', 'CM', 'CM', 'CM', 'RM'], 54),
      ...line('FWD', ['ST', 'ST'], 82),
    ],
  },
  {
    id: '5-3-2',
    name: '5-3-2 Fortress',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'CB', 'RB'], 28),
      ...line('MID', ['CM', 'CM', 'CM'], 56),
      ...line('FWD', ['ST', 'ST'], 82),
    ],
  },
];

export function getFormation(id: string): FormationDef {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[1];
}

import type { Division, FormationDef, Position } from './types';

export const SEASON_ROUNDS = 46;
export const CLUBS_PER_DIVISION = 24;
export const PROMOTION_SPOTS = 3;

export const MIN_SQUAD_SIZE = 16;
export const MAX_SQUAD_SIZE = 30;

export const DIVISION_NAMES: Record<Division, string> = {
  1: 'Premier League',
  2: 'Championship',
  3: 'League One',
  4: 'League Two',
  5: 'La Liga',
  6: 'Serie A',
  7: 'Bundesliga',
  8: 'Ligue 1',
  9: 'Eredivisie',
  10: 'Primeira Liga',
};

export const STARTING_BUDGET: Record<Division, number> = {
  1: 40_000_000,
  2: 12_000_000,
  3: 4_000_000,
  4: 1_500_000,
  5: 35_000_000,
  6: 28_000_000,
  7: 25_000_000,
  8: 22_000_000,
  9: 18_000_000,
  10: 16_000_000,
};

/** Calendar weeks each domestic cup round is played (7 rounds, 72 clubs across
 *  divisions 1-3 at 24 clubs each — the entrant count isn't a power of two, so
 *  the bracket needs an extra qualifying round; see makeDomesticCup). The
 *  first entry is that extra early round, so every later round keeps its
 *  original week/prize unchanged. */
export const CUP_WEEKS = [2, 4, 9, 14, 19, 25, 31];
/** Prize for winning a tie in each cup round (last = winning the final). */
export const CUP_PRIZES = [75_000, 150_000, 300_000, 600_000, 1_200_000, 2_500_000, 6_000_000];

/** Continental Champions Cup: 8 teams, QF/SF/Final. */
export const CONTINENTAL_WEEKS = [7, 17, 29];
export const CONTINENTAL_PRIZES = [3_000_000, 6_000_000, 15_000_000];
export const CONTINENTAL_SPOTS = 8;

/** Weekly gate income baseline per division. */
export const GATE_BASE: Record<Division, number> = { 1: 550_000, 2: 180_000, 3: 60_000, 4: 25_000, 5: 480_000, 6: 400_000, 7: 380_000, 8: 340_000, 9: 280_000, 10: 250_000 };

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

/** Prize money by final league position (1-based). */
export function prizeMoney(division: Division, position: number): number {
  if (division === 1) return 32_000_000 - (position - 1) * 1_200_000;
  if (division === 2) return 10_000_000 - (position - 1) * 350_000;
  if (division === 3) return 3_000_000 - (position - 1) * 100_000;
  if (division === 4) return 800_000 - (position - 1) * 30_000;
  if (division === 5) return 28_000_000 - (position - 1) * 1_000_000;
  if (division === 6) return 22_000_000 - (position - 1) * 800_000;
  if (division === 7) return 20_000_000 - (position - 1) * 750_000;
  return 18_000_000 - (position - 1) * 650_000;
}

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

import { EXTENDED_FORMATIONS } from './tickEngine/tacticsData';

/** Full formation catalogue: the classic five plus the tick-engine set. */
export const ALL_FORMATIONS: FormationDef[] = [
  ...FORMATIONS,
  ...EXTENDED_FORMATIONS.filter((f) => !FORMATIONS.some((g) => g.id === f.id)),
];

export function getFormation(id: string): FormationDef {
  return ALL_FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[1];
}

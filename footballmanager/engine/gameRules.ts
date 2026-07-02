import type { FormationDef, Position } from './types';

export const SEASON_ROUNDS = 38;
export const CLUBS_PER_DIVISION = 20;
export const PROMOTION_SPOTS = 3;

export const MIN_SQUAD_SIZE = 16;
export const MAX_SQUAD_SIZE = 30;

export const STARTING_BUDGET: Record<1 | 2, number> = {
  1: 40_000_000,
  2: 12_000_000,
};

export const HOME_ADVANTAGE = 1.18;
export const BASE_GOALS = 1.32; // league-average goals per team per match

export const MORALE_START = 60;
export const MORALE_WIN = 6;
export const MORALE_DRAW = 1;
export const MORALE_LOSS = -6;
export const MORALE_MIN = 30;
export const MORALE_MAX = 95;

/** Prize money by final league position (1-based). */
export function prizeMoney(division: 1 | 2, position: number): number {
  return division === 1
    ? 32_000_000 - (position - 1) * 1_200_000
    : 10_000_000 - (position - 1) * 350_000;
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

export function getFormation(id: string): FormationDef {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[1];
}

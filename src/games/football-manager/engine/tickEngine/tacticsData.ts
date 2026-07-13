import type { FormationDef, Position } from '../types';

/** Team mentality presets (ultra-defensive → ultra-attacking). */
export type MentalityId = 'ultra-defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra-attacking';

export interface MentalityMods {
  label: string;
  short: string;
  attackBonus: number;
  defenceBonus: number;
  riskFactor: number;
  fatigueRate: number;
  chanceCreation: number;
  counterExposure: number;
}

export const MENTALITY_ORDER: MentalityId[] = [
  'ultra-defensive',
  'defensive',
  'balanced',
  'attacking',
  'ultra-attacking',
];

export const MENTALITIES: Record<MentalityId, MentalityMods> = {
  'ultra-defensive': { label: 'Ultra Defensive', short: 'Ultra Def', attackBonus: 0.6, defenceBonus: 1.4, riskFactor: 0.4, fatigueRate: 0.8, chanceCreation: 0.5, counterExposure: 0.3 },
  defensive: { label: 'Defensive', short: 'Defensive', attackBonus: 0.75, defenceBonus: 1.2, riskFactor: 0.6, fatigueRate: 0.85, chanceCreation: 0.7, counterExposure: 0.5 },
  balanced: { label: 'Balanced', short: 'Balanced', attackBonus: 1, defenceBonus: 1, riskFactor: 1, fatigueRate: 1, chanceCreation: 1, counterExposure: 1 },
  attacking: { label: 'Attacking', short: 'Attacking', attackBonus: 1.25, defenceBonus: 0.8, riskFactor: 1.3, fatigueRate: 1.15, chanceCreation: 1.3, counterExposure: 1.4 },
  'ultra-attacking': { label: 'Ultra Attacking', short: 'Ultra Att', attackBonus: 1.5, defenceBonus: 0.6, riskFactor: 1.6, fatigueRate: 1.3, chanceCreation: 1.6, counterExposure: 1.8 },
};

export function normalizeMentality(m: string | undefined): MentalityId {
  return MENTALITY_ORDER.includes(m as MentalityId) ? (m as MentalityId) : 'balanced';
}

/** Natural pitch zone (0 = own box, 4 = opposition box) per role label. */
export const ROLE_ZONE: Record<string, 0 | 1 | 2 | 3 | 4> = {
  GK: 0,
  CB: 0,
  LB: 1,
  RB: 1,
  LWB: 1,
  RWB: 1,
  CDM: 1,
  CM: 2,
  LM: 2,
  RM: 2,
  CAM: 3,
  LW: 3,
  RW: 3,
  ST: 4,
  CF: 4,
};

/** Base xG feel by ball zone (only the attacking zones matter for shots). */
export const ZONE_XG_BASE = [0.08, 0.25, 0.5, 0.72, 0.92];

export interface ChanceTier {
  id: string;
  label: string;
  min: number;
  max: number;
  weight: number;
}

export const CHANCE_QUALITY: ChanceTier[] = [
  { id: 'longShot', label: 'a strike from distance', min: 0.02, max: 0.06, weight: 30 },
  { id: 'halfChance', label: 'a half chance', min: 0.06, max: 0.12, weight: 30 },
  { id: 'goodChance', label: 'a good chance', min: 0.12, max: 0.25, weight: 22 },
  { id: 'clearCut', label: 'a clear-cut chance', min: 0.25, max: 0.45, weight: 12 },
  { id: 'oneOnOne', label: 'a one-on-one', min: 0.3, max: 0.55, weight: 6 },
];

/** Down to 10 or 9 men the side compacts into a defensive shape. */
export function compactFormation(menOnPitch: number): string | null {
  if (menOnPitch === 10) return '4-5-1';
  if (menOnPitch <= 9) return '5-4-1';
  return null;
}

const GROUP: Record<string, Position> = {
  GK: 'GK',
  LB: 'DEF', CB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', LM: 'MID', RM: 'MID', CAM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD', CF: 'FWD',
};

function row(labels: string[], y: number) {
  const n = labels.length;
  return labels.map((label, i) => ({
    pos: GROUP[label] ?? 'MID',
    label,
    x: n === 1 ? 50 : 10 + (80 * i) / (n - 1),
    y,
  }));
}

function shape(id: string, name: string, rows: [string[], number][]): FormationDef {
  return {
    id,
    name,
    slots: [{ pos: 'GK', label: 'GK', x: 50, y: 6 }, ...rows.flatMap(([labels, y]) => row(labels, y))],
  };
}

/**
 * The extended formation catalogue used by the tick engine and the tactics
 * modal. Ids overlapping gameRules.FORMATIONS are omitted there when merged.
 */
export const EXTENDED_FORMATIONS: FormationDef[] = [
  shape('3-4-3', '3-4-3', [[['CB', 'CB', 'CB'], 26], [['LM', 'CM', 'CM', 'RM'], 54], [['LW', 'ST', 'RW'], 81]] as [string[], number][]),
  shape('3-4-1-2', '3-4-1-2', [[['CB', 'CB', 'CB'], 26], [['LM', 'CM', 'CM', 'RM'], 50], [['CAM'], 68], [['ST', 'ST'], 83]] as [string[], number][]),
  shape('3-4-2-1', '3-4-2-1', [[['CB', 'CB', 'CB'], 26], [['LM', 'CM', 'CM', 'RM'], 50], [['CAM', 'CAM'], 68], [['ST'], 85]] as [string[], number][]),
  shape('3-3-1-3', '3-3-1-3', [[['CB', 'CB', 'CB'], 26], [['CM', 'CM', 'CM'], 48], [['CAM'], 66], [['LW', 'ST', 'RW'], 83]] as [string[], number][]),
  shape('3-1-4-2', '3-1-4-2', [[['CB', 'CB', 'CB'], 26], [['CDM'], 42], [['LM', 'CM', 'CM', 'RM'], 60], [['ST', 'ST'], 83]] as [string[], number][]),
  shape('3-5-1-1', '3-5-1-1', [[['CB', 'CB', 'CB'], 26], [['LM', 'CM', 'CM', 'CM', 'RM'], 52], [['CAM'], 70], [['ST'], 85]] as [string[], number][]),
  shape('4-1-4-1', '4-1-4-1', [[['LB', 'CB', 'CB', 'RB'], 27], [['CDM'], 42], [['LM', 'CM', 'CM', 'RM'], 60], [['ST'], 85]] as [string[], number][]),
  shape('4-4-1-1', '4-4-1-1', [[['LB', 'CB', 'CB', 'RB'], 27], [['LM', 'CM', 'CM', 'RM'], 52], [['CAM'], 70], [['ST'], 85]] as [string[], number][]),
  shape('4-3-2-1', '4-3-2-1 Tree', [[['LB', 'CB', 'CB', 'RB'], 27], [['CM', 'CM', 'CM'], 48], [['CAM', 'CAM'], 68], [['ST'], 85]] as [string[], number][]),
  shape('4-2-4', '4-2-4', [[['LB', 'CB', 'CB', 'RB'], 27], [['CM', 'CM'], 52], [['LW', 'ST', 'ST', 'RW'], 82]] as [string[], number][]),
  shape('4-5-1', '4-5-1', [[['LB', 'CB', 'CB', 'RB'], 27], [['LM', 'CM', 'CM', 'CM', 'RM'], 54], [['ST'], 84]] as [string[], number][]),
  shape('4-1-2-1-2', '4-1-2-1-2 Diamond', [[['LB', 'CB', 'CB', 'RB'], 27], [['CDM'], 42], [['CM', 'CM'], 55], [['CAM'], 68], [['ST', 'ST'], 84]] as [string[], number][]),
  shape('4-2-2-2', '4-2-2-2', [[['LB', 'CB', 'CB', 'RB'], 27], [['CDM', 'CDM'], 45], [['CAM', 'CAM'], 65], [['ST', 'ST'], 84]] as [string[], number][]),
  shape('4-3-1-2', '4-3-1-2', [[['LB', 'CB', 'CB', 'RB'], 27], [['CM', 'CM', 'CM'], 48], [['CAM'], 67], [['ST', 'ST'], 84]] as [string[], number][]),
  shape('5-4-1', '5-4-1', [[['LB', 'CB', 'CB', 'CB', 'RB'], 28], [['LM', 'CM', 'CM', 'RM'], 55], [['ST'], 84]] as [string[], number][]),
  shape('5-2-3', '5-2-3', [[['LB', 'CB', 'CB', 'CB', 'RB'], 28], [['CM', 'CM'], 52], [['LW', 'ST', 'RW'], 81]] as [string[], number][]),
  shape('5-2-1-2', '5-2-1-2', [[['LB', 'CB', 'CB', 'CB', 'RB'], 28], [['CM', 'CM'], 50], [['CAM'], 66], [['ST', 'ST'], 83]] as [string[], number][]),
  shape('5-3-1-1', '5-3-1-1', [[['LB', 'CB', 'CB', 'CB', 'RB'], 28], [['CM', 'CM', 'CM'], 52], [['CAM'], 68], [['ST'], 85]] as [string[], number][]),
  shape('2-3-5', '2-3-5 Pyramid', [[['CB', 'CB'], 24], [['CM', 'CM', 'CM'], 48], [['LW', 'ST', 'ST', 'ST', 'RW'], 80]] as [string[], number][]),
];

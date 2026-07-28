/**
 * Shot-level xG, out-of-position fit, stamina/sharpness and the tactical xG
 * chain — ported from the reference implementation's `engine.js`
 * (`shotBaseXG`, `SHOT_ARCH`, `calcMatchXG`, `posFitFactor`, `sharpnessAt`,
 * `INJURY_TYPES`). The tuned constants are copied verbatim; only the data
 * access is adapted to our `Player` / `FormationDef` shapes.
 *
 * No React imports — the `scripts/*.ts` harnesses run this under tsx.
 */
import type { FormationDef, GameState, Player, Tactics } from '../types';

/* ------------------------------------------------------------------ *
 * Attribute access — our Player carries FIFA-style short names.
 * ------------------------------------------------------------------ */

export type Attr = 'passing' | 'pace' | 'physical' | 'shooting' | 'dribbling' | 'defending' | 'gkReflexes' | 'gkPositioning';

export function attr(p: Player | null | undefined, a: Attr): number {
  if (!p) return 65;
  switch (a) {
    case 'passing': return p.pas;
    case 'pace': return p.pac;
    case 'physical': return p.phy;
    case 'shooting': return p.sho;
    case 'dribbling': return p.dri;
    case 'defending': return p.def;
    case 'gkReflexes': return p.gkReflexes;
    case 'gkPositioning': return p.gkPositioning;
  }
}

/* ------------------------------------------------------------------ *
 * Out-of-position model (gap 22).
 * ------------------------------------------------------------------ */

/** Positional depth: lower = more defensive, higher = more attacking. */
export const POS_DEPTH: Record<string, number> = {
  CB: 2, RB: 2.5, LB: 2.5, RWB: 3, LWB: 3,
  CDM: 4,
  CM: 5, RM: 5.5, LM: 5.5,
  CAM: 6.5, RW: 7, LW: 7,
  CF: 8, ST: 8.5,
};

export type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export function posGroup(pos: string): PosGroup {
  if (pos === 'GK') return 'GK';
  if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(pos)) return 'DEF';
  if (['CM', 'CDM', 'CAM', 'RM', 'LM'].includes(pos)) return 'MID';
  return 'ATT';
}

/**
 * Stat effectiveness multiplier when a player plays out of position.
 * 1.0 (natural) → 0.93 (mirror) → 0.88 (adjacent) → 0.80 → 0.70 → 0.58 →
 * 0.45 → 0.35 (GK swap).
 */
export function oopFactor(playerPos: string, slotPos: string): number {
  if (!slotPos || playerPos === slotPos) return 1.0;
  if (playerPos === 'GK' || slotPos === 'GK') return 0.35;
  // CF/ST, CDM/CM and CAM/CM are genuine synonyms in real squads.
  if ((playerPos === 'CF' && slotPos === 'ST') || (playerPos === 'ST' && slotPos === 'CF')) return 1.0;
  if ((playerPos === 'CDM' && slotPos === 'CM') || (playerPos === 'CM' && slotPos === 'CDM')) return 1.0;
  if ((playerPos === 'CAM' && slotPos === 'CM') || (playerPos === 'CM' && slotPos === 'CAM')) return 1.0;
  const pd = POS_DEPTH[playerPos] ?? 5;
  const sd = POS_DEPTH[slotPos] ?? 5;
  const dist = Math.abs(pd - sd);
  if (dist === 0) return 0.93;   // mirror pos e.g. RB↔LB
  if (dist <= 1) return 0.88;    // adjacent e.g. CM↔RM
  if (dist <= 2) return 0.80;    // nearby zone e.g. CB↔CDM
  if (dist <= 3) return 0.70;    // cross-zone e.g. CB↔CM
  if (dist <= 4.5) return 0.58;  // major cross
  if (dist <= 6) return 0.45;    // extreme
  return 0.35;
}

/**
 * Positional fit for a player in a slot: the best `oopFactor` across his
 * natural role and any secondary roles — a trained secondary counts as
 * fully natural, that's what makes it one.
 */
export function posFitFactor(p: Player, slotPos: string): number {
  let best = oopFactor(p.role, slotPos);
  for (const alt of p.altPos ?? []) {
    if (best >= 1.0) break;
    best = Math.max(best, oopFactor(alt, slotPos));
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * XI aggregation. Every stat average is OOP-weighted (gap 22: "applied to
 * every stat aggregation, not just overall rating").
 * ------------------------------------------------------------------ */

/** One player as actually deployed: who he is, and how well he fits the slot. */
export interface XISlot {
  p: Player;
  slotPos: string;
  fit: number;
}

export function buildXI(state: GameState, lineup: (number | null)[], formation: FormationDef): XISlot[] {
  const out: XISlot[] = [];
  formation.slots.forEach((slot, i) => {
    const id = lineup[i];
    if (id === null || id === undefined) return;
    const p = state.players[id];
    if (!p) return;
    out.push({ p, slotPos: slot.label, fit: posFitFactor(p, slot.label) });
  });
  return out;
}

/** Plain OOP-weighted stat average across the XI. */
export function avgStat(xi: XISlot[], a: Attr): number {
  if (!xi.length) return 65;
  return xi.reduce((s, x) => s + attr(x.p, a) * x.fit, 0) / xi.length;
}

/** Position-weighted stat average — attackers count more for shooting, etc. */
export function avgStatWeighted(xi: XISlot[], a: Attr, w: Partial<Record<PosGroup, number>>): number {
  if (!xi.length) return 65;
  let wSum = 0;
  let vSum = 0;
  for (const x of xi) {
    const weight = w[posGroup(x.p.role)] ?? 1.0;
    vSum += attr(x.p, a) * x.fit * weight;
    wSum += weight;
  }
  return wSum > 0 ? vSum / wSum : 65;
}

const ATTACK_W: Record<PosGroup, number> = { GK: 0.05, DEF: 0.2, MID: 0.75, ATT: 1.5 };
const DEFENCE_W: Record<PosGroup, number> = { GK: 1.8, DEF: 1.5, MID: 0.8, ATT: 0.1 };

function weightedOvr(xi: XISlot[], w: Record<PosGroup, number>): number {
  if (!xi.length) return 60;
  let wSum = 0;
  let vSum = 0;
  for (const x of xi) {
    const weight = w[posGroup(x.p.role)] ?? 1.0;
    // Form is our stand-in for a player's current level; the reference uses a
    // flat OVR because it has no separate form term.
    vSum += x.p.rating * x.p.form * x.fit * weight;
    wSum += weight;
  }
  return wSum > 0 ? vSum / wSum : 60;
}

/** Attack-facing effective rating: forwards and attacking mids count most. */
export const attackRating = (xi: XISlot[]): number => weightedOvr(xi, ATTACK_W);
/** Defence-facing effective rating: GK and defenders count most. */
export const defenseRating = (xi: XISlot[]): number => weightedOvr(xi, DEFENCE_W);

/* ------------------------------------------------------------------ *
 * Pitch geometry & base xG.
 * ------------------------------------------------------------------ */

const GOAL_HALF_W = 3.66;      // half of a real 7.32m goal
export const PENALTY_SPOT_X = 11;

/** Angle of the goalmouth as seen from the shooting position, in radians. */
export function goalAngle(gx: number, gy: number): number {
  const x = Math.max(0.6, gx);
  return Math.abs(Math.atan2(gy + GOAL_HALF_W, x) - Math.atan2(gy - GOAL_HALF_W, x));
}

/**
 * Base finishing probability for a clean, unpressured shot from (gx, gy):
 * exponential decay in distance, scaled by how much of the goal is visible.
 * Calibrated against real xG models — ~0.45 six yards out, ~0.24 from the
 * penalty spot, ~0.12 at 16m, ~0.07 at 20m, ~0.035 at 25m, ~0.02 at 30m.
 */
export function shotBaseXG(gx: number, gy: number): number {
  const dist = Math.sqrt(gx * gx + gy * gy);
  const ang = goalAngle(gx, gy);
  const angC = goalAngle(Math.max(0.6, dist), 0); // same distance, dead centre
  const angF = Math.pow(Math.max(0.04, ang / Math.max(1e-4, angC)), 0.8);
  return Math.max(0.004, Math.min(0.94, 1.05 * Math.exp(-0.135 * dist) * angF));
}

/* ------------------------------------------------------------------ *
 * Shot archetypes.
 * ------------------------------------------------------------------ */

export interface ShotArch {
  gx: [number, number];
  gy: [number, number];
  header: number;
  volley: number;
  block: number;
  mult: number;
  gk: number;
  aerial?: boolean;
  setPiece?: boolean;
  setPlay?: 'corner';
  isPen?: boolean;
  label: string;
}

/**
 * Where a chance comes from decides where it's taken from, what kind of
 * contact it is, and how likely a body gets in the way. gx/gy are metre
 * ranges; gy is an absolute offset, mirrored to either side when sampled.
 */
export const SHOT_ARCH: Record<string, ShotArch> = {
  tap_in:        { gx: [1.5, 6],   gy: [0, 7],   header: 0.32, volley: 0.18, block: 0.13, mult: 1.10, gk: 0.7, label: 'a tap-in' },
  close_range:   { gx: [6, 11],    gy: [0, 10],  header: 0.24, volley: 0.14, block: 0.22, mult: 1.00, gk: 0.9, label: 'a close-range effort' },
  box_central:   { gx: [11, 16.5], gy: [0, 9],   header: 0.14, volley: 0.11, block: 0.28, mult: 1.00, gk: 1.0, label: 'a shot from the heart of the box' },
  box_wide:      { gx: [5, 16.5],  gy: [10, 20], header: 0.22, volley: 0.10, block: 0.24, mult: 0.92, gk: 1.0, label: 'an effort from a tight angle' },
  header_cross:  { gx: [4, 12],    gy: [0, 11],  header: 1.00, volley: 0,    block: 0.15, mult: 0.95, gk: 0.9, label: 'a header from the cross' },
  one_on_one:    { gx: [7, 18],    gy: [0, 9],   header: 0,    volley: 0.05, block: 0.05, mult: 2.10, gk: 1.7, label: 'a one-on-one' },
  rebound:       { gx: [4, 12],    gy: [0, 10],  header: 0.12, volley: 0.34, block: 0.24, mult: 1.00, gk: 0.8, label: 'a rebound' },
  edge_box:      { gx: [17, 24],   gy: [0, 14],  header: 0.03, volley: 0.16, block: 0.36, mult: 0.95, gk: 1.2, label: 'a strike from the edge' },
  long_range:    { gx: [24, 34],   gy: [0, 18],  header: 0,    volley: 0.12, block: 0.34, mult: 0.90, gk: 1.4, label: 'a shot from distance' },
  free_kick:     { gx: [18, 30],   gy: [0, 13],  header: 0,    volley: 0,    block: 0.20, mult: 1.05, gk: 1.5, setPiece: true, label: 'a free kick' },
  corner_header: { gx: [3, 12],    gy: [0, 9],   header: 0.85, volley: 0.10, block: 0.20, mult: 0.95, gk: 0.9, aerial: true, setPlay: 'corner', label: 'a header from the corner' },
  set_piece_edge:{ gx: [16, 26],   gy: [0, 12],  header: 0.02, volley: 0.30, block: 0.34, mult: 0.95, gk: 1.2, setPlay: 'corner', label: 'a shot from the edge off the set piece' },
  penalty:       { gx: [11, 11],   gy: [0, 0],   header: 0,    volley: 0,    block: 0.0,  mult: 1.00, gk: 1.0, setPiece: true, isPen: true, label: 'a penalty' },
};

/** Baseline mix. ~68% of shots come from inside the box. */
export const ARCH_BASE_W: Record<string, number> = {
  tap_in: 3, close_range: 8, box_central: 22, box_wide: 15, header_cross: 12,
  one_on_one: 4, rebound: 4, edge_box: 18, long_range: 12,
  free_kick: 2.5, corner_header: 5, set_piece_edge: 2,
};

export const IN_BOX_ARCH = new Set(['tap_in', 'close_range', 'box_central', 'box_wide', 'header_cross', 'one_on_one', 'rebound', 'corner_header']);

/**
 * A header off a cross beats a keeper far less often than the same chance
 * struck cleanly; a volley is harder to keep down than a settled side-foot.
 */
export const CONTACT_MULT = { header: 0.56, volley: 0.82, foot: 1.0 } as const;
export type Contact = keyof typeof CONTACT_MULT;

/**
 * Who takes the shot depends on where it comes from: tap-ins fall to
 * strikers, shots from range are hit by midfielders, crosses are attacked by
 * the tall men including centre-backs pushed up for a set piece.
 * Column order: ATT, WIDE, CAM, CM, CDM, DEF, GK.
 */
export const SHOOTER_W: Record<string, number[]> = {
  tap_in:         [12, 4, 3, 1.6, 0.5, 1.4, 0],
  close_range:    [11, 4, 3.5, 2.2, 0.7, 1.0, 0],
  box_central:    [10, 4, 4.5, 3.0, 1.0, 0.8, 0],
  box_wide:       [6, 8, 3.0, 2.4, 0.8, 1.2, 0],
  header_cross:   [10, 2.5, 2.0, 1.8, 1.2, 2.6, 0],
  one_on_one:     [12, 6, 2.5, 1.4, 0.3, 0.3, 0],
  rebound:        [9, 4, 3.5, 2.6, 1.0, 1.4, 0],
  edge_box:       [4, 4, 6.5, 6.0, 2.4, 1.0, 0],
  long_range:     [3, 4, 6.0, 7.0, 3.5, 1.8, 0],
  free_kick:      [4, 5, 6.0, 5.0, 2.0, 1.5, 0],
  corner_header:  [9, 2.0, 2.0, 2.2, 2.0, 5.0, 0],
  set_piece_edge: [3, 3.5, 5.0, 6.0, 3.0, 2.2, 0],
  penalty:        [10, 4, 4.0, 2.0, 0.5, 0.4, 0],
};

export const SHOOT_GROUP_IDX: Record<string, number> = {
  ST: 0, CF: 0, RW: 1, LW: 1, RM: 1, LM: 1, CAM: 2, CM: 3, CDM: 4,
  CB: 5, RB: 5, LB: 5, RWB: 5, LWB: 5, GK: 6,
};

/** Who ends up closing the shot down / throwing himself in front of it. */
export const DEF_PRESS_W: Record<string, number> = {
  CB: 3.0, RB: 2.0, LB: 2.0, RWB: 1.8, LWB: 1.8, CDM: 2.6, CM: 1.6,
  CAM: 0.7, RM: 0.8, LM: 0.8, RW: 0.4, LW: 0.4, ST: 0.25, CF: 0.25, GK: 0,
};

export function sampleShotLocation(archKey: string): { gx: number; gy: number } {
  const A = SHOT_ARCH[archKey];
  const gx = A.gx[0] + Math.random() * (A.gx[1] - A.gx[0]);
  // Central chances cluster in the middle of the goal; wide ones spread out.
  const spread = Math.pow(Math.random(), A.gy[0] > 0 ? 0.85 : 1.35);
  const gy = (A.gy[0] + spread * (A.gy[1] - A.gy[0])) * (Math.random() < 0.5 ? -1 : 1);
  return { gx, gy };
}

/* ------------------------------------------------------------------ *
 * In-match stamina & sharpness (gap 26).
 * ------------------------------------------------------------------ */

const STAM_POS_DRAIN: Record<string, number> = {
  GK: 0.35, CB: 0.88, RB: 1.12, LB: 1.12, RWB: 1.2, LWB: 1.2,
  CDM: 1.05, CM: 1.14, CAM: 1.05, RM: 1.16, LM: 1.16, RW: 1.1, LW: 1.1,
  ST: 1.0, CF: 1.0,
};
const TEMPO_STAM: Record<string, number> = { slow: 0.9, normal: 1.0, fast: 1.14 };
const PRESS_STAM: Record<string, number> = { low: 0.9, mid: 1.0, high: 1.16 };
const STYLE_STAM: Record<string, number> = { defensive: 0.94, balanced: 1.0, attacking: 1.08 };

/** How hard a side's instructions ask its players to run. */
export function teamStaminaRate(tac: Tactics): number {
  return (TEMPO_STAM[tac.tempo] ?? 1) * (PRESS_STAM[tac.pressing] ?? 1) * (STYLE_STAM[tac.style] ?? 1);
}

function playerDrainRate(p: Player | null | undefined, teamRate: number): number {
  const phys = p ? p.phy : 65;
  const age = p ? p.age : 25;
  const endurance = 0.7 + (phys - 40) / 130;                        // ~0.70 – 1.16
  const ageMult = 1 + Math.max(0, age - 30) * 0.045 + Math.max(0, 20 - age) * 0.02;
  return (teamRate * (STAM_POS_DRAIN[p?.role ?? 'CM'] ?? 1.0) * ageMult) / Math.max(0.5, endurance);
}

/**
 * 0..1 sharpness at a given minute. A fully fit player kicks off at 1.0 and
 * finishes a normal 90 around 0.72; someone starting on 60% fitness is at
 * 0.50 before a ball is kicked and under 0.3 by the end.
 */
export function sharpnessAt(p: Player | null | undefined, minute: number, teamRate: number): number {
  const base = Math.max(0.3, Math.min(1, ((p?.fitness ?? 80) - 20) / 80));
  const spent = 0.3 * playerDrainRate(p, teamRate) * Math.pow(Math.max(0, minute) / 90, 1.3);
  return Math.max(0.22, base - spent);
}

/** An attribute as it actually performs in the moment. */
export function effAttr(p: Player | null | undefined, a: Attr, sharp: number): number {
  return attr(p, a) * (0.82 + 0.18 * sharp);
}

/* ---- Post-match fitness ---- */

const FITNESS_DRAIN_90 = 26;
const FITNESS_RECOVER_REST = 6;
const POS_DRAIN: Record<string, number> = {
  GK: 0.4, CB: 0.92, RB: 1.1, LB: 1.1, RWB: 1.14, LWB: 1.14,
  CDM: 1.05, CM: 1.08, RM: 1.12, LM: 1.12, CAM: 1.04,
  RW: 1.1, LW: 1.1, ST: 1.0, CF: 1.0,
};

/** Fitness a player loses for `minutes` played under `teamRate` instructions. */
export function matchFitnessDrain(p: Player, minutes: number, teamRate: number): number {
  const ageMult = 1 + Math.max(0, p.age - 30) * 0.06;
  const qualityMult = Math.max(0.8, Math.min(1.2, 1.18 - (p.rating - 50) * 0.007));
  const physMult = Math.max(0.82, Math.min(1.22, 1.22 - (p.phy - 50) * 0.008));
  const posMult = POS_DRAIN[p.role] ?? 1.0;
  return FITNESS_DRAIN_90 * (Math.min(minutes, 120) / 90) * ageMult * qualityMult * physMult * posMult * teamRate;
}

export { FITNESS_RECOVER_REST };

/* ------------------------------------------------------------------ *
 * Injuries (gap 25) — seven types, day-based recovery, potential loss.
 * ------------------------------------------------------------------ */

export interface InjuryType {
  id: string;
  label: string;
  minDays: number;
  maxDays: number;
  potDrop: number;
  weight: number;
  severity: 'minor' | 'moderate' | 'serious' | 'career';
}

/** Layoffs are stored and shown in DAYS, always rounded up to whole days. */
export const INJURY_TYPES: InjuryType[] = [
  { id: 'knock',     label: 'Knock',          minDays: 4,   maxDays: 14,  potDrop: 0, weight: 35, severity: 'minor' },
  { id: 'strain',    label: 'Muscle Strain',  minDays: 12,  maxDays: 28,  potDrop: 0, weight: 28, severity: 'minor' },
  { id: 'ankle',     label: 'Ankle Sprain',   minDays: 20,  maxDays: 42,  potDrop: 0, weight: 18, severity: 'moderate' },
  { id: 'hamstring', label: 'Hamstring Tear', minDays: 28,  maxDays: 56,  potDrop: 0, weight: 12, severity: 'moderate' },
  { id: 'broken',    label: 'Broken Bone',    minDays: 56,  maxDays: 112, potDrop: 1, weight: 4,  severity: 'serious' },
  { id: 'knee',      label: 'Knee Ligament',  minDays: 98,  maxDays: 196, potDrop: 2, weight: 3,  severity: 'serious' },
  { id: 'acl',       label: 'ACL Rupture',    minDays: 182, maxDays: 364, potDrop: 3, weight: 1,  severity: 'career' },
];

export function pickInjuryType(pool: InjuryType[] = INJURY_TYPES): InjuryType {
  const total = pool.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

/**
 * Tired players get hurt more often. Exponential rather than linear so
 * genuinely fit players are genuinely safe (~0.3x at full fitness) while
 * tired legs get hurt far more often, capped at 7x on empty.
 */
export function fatigueInjuryMult(fitness: number | undefined): number {
  return Math.min(7, Math.pow(1.055, 78 - (fitness ?? 80)));
}

/* ------------------------------------------------------------------ *
 * The tactical xG chain (gap 15) — `calcMatchXG`.
 * ------------------------------------------------------------------ */

const PRESS_PRESET: Record<string, { ownBoost: number; risk: number }> = {
  high: { ownBoost: 0.12, risk: 0.08 },
  mid: { ownBoost: 0.0, risk: 0.0 },
  low: { ownBoost: -0.1, risk: -0.14 },
};

/**
 * How well a mentality exploits the *risk* the opponent's pressing leaves.
 * `counter` = how well you exploit space left by an aggressive high press;
 * `breakdown` = susceptibility to a low block (higher = block is MORE
 * effective against you). Our mentality union stands in for the reference's
 * nine named play styles.
 */
const MENTALITY_EXPOSURE: Record<string, { counter: number; breakdown: number }> = {
  'ultra-defensive': { counter: 1.9, breakdown: 0.45 },  // catenaccio — springs from deep
  defensive: { counter: 1.4, breakdown: 0.7 },           // counter-leaning
  balanced: { counter: 1.0, breakdown: 1.0 },
  attacking: { counter: 0.7, breakdown: 1.15 },
  'ultra-attacking': { counter: 0.5, breakdown: 1.3 },   // committed forward, hates a low block
};
/** Mentalities that genuinely spring from deep and convert a stretched shape. */
const countersFromDeep = (m: string) => m === 'ultra-defensive' || m === 'defensive';

const WIDTH_ATK: Record<string, number> = { narrow: 0.97, standard: 1.0, wide: 1.06 };
const WIDTH_COUNTER_RISK: Record<string, number> = { narrow: 0.9, standard: 1.0, wide: 1.2 };
const TEMPO_ATK: Record<string, number> = { slow: 0.96, normal: 1.0, fast: 1.07 };
const TEMPO_COUNTER_RISK: Record<string, number> = { slow: 0.85, normal: 1.0, fast: 1.2 };
const LINE_ATK: Record<string, number> = { deep: 0.95, normal: 1.0, high: 1.09 };
const LINE_DEF_MOD: Record<string, number> = { deep: 1.1, normal: 1.0, high: 0.88 };
const LINE_COUNTER_RISK: Record<string, number> = { deep: 0.82, normal: 1.0, high: 1.28 };
const FOCUS_ATK: Record<string, number> = { flanks: 1.02, mixed: 1.0, middle: 1.04 };
const FOCUS_VS_WIDTH: Record<string, Record<string, number>> = {
  flanks: { narrow: 1.12, standard: 1.0, wide: 0.92 },
  mixed: { narrow: 1.0, standard: 1.0, wide: 1.0 },
  middle: { narrow: 0.9, standard: 1.0, wide: 1.1 },
};
const TACKLE_BOOST: Record<string, number> = { cautious: -0.02, normal: 0, aggressive: 0.05 };
export const TACKLE_INTENSITY: Record<string, { successMod: number; foulMod: number }> = {
  cautious: { successMod: 0.92, foulMod: 0.65 },
  normal: { successMod: 1.0, foulMod: 1.0 },
  aggressive: { successMod: 1.08, foulMod: 1.55 },
};
const PASS_COUNTER_RISK: Record<string, number> = { short: 0.92, mixed: 1.0, 'through-balls': 1.15 };

const offMod: Record<string, number> = { attacking: 1.25, balanced: 1.0, defensive: 0.75 };
const defMod: Record<string, number> = { attacking: 0.85, balanced: 1.0, defensive: 1.2 };

/* ---- The skill gates. These are the whole point of the chain: an
   instruction only pays off when the players can actually perform it AND
   the opponent's setup leaves it on. Dropping them turns every tactical
   choice into a free bonus (see AGENT_BRIEF §6.1). ---- */

const BUILD_W: Partial<Record<PosGroup, number>> = { GK: 1.6, DEF: 2.0, MID: 0.6, ATT: 0.1 };
/** Can this XI actually play out from the back? 0 = not remotely, 1 = fully. */
export const buildFit = (xi: XISlot[]): number =>
  Math.max(0, Math.min(1, (avgStatWeighted(xi, 'passing', BUILD_W) - 62) / 16));

const RUNS_W: Partial<Record<PosGroup, number>> = { GK: 0, DEF: 0.1, MID: 0.8, ATT: 3.0 };
/** Has this XI the legs to run in behind? */
export const runFit = (xi: XISlot[]): number =>
  Math.max(0, Math.min(1, (avgStatWeighted(xi, 'pace', RUNS_W) - 64) / 16));

const PASSK_W: Partial<Record<PosGroup, number>> = { GK: 0.1, DEF: 0.5, MID: 2.0, ATT: 1.3 };
/** Are there genuine passers to hit a defence-splitting ball? */
export const passFit = (xi: XISlot[]): number =>
  Math.max(0, Math.min(1, (avgStatWeighted(xi, 'passing', PASSK_W) - 66) / 16));

/** Are there the legs to run a press? Full press quality at 76+. */
export const pressFit = (xi: XISlot[]): number => {
  const v = (avgStat(xi, 'physical') + avgStat(xi, 'pace')) / 2;
  return Math.max(0, Math.min(1, (v - 60) / 16));
};

/**
 * Build-up: playing out from the back needs a ball-playing GK + back line.
 * Against a high press it either slices the press apart or gifts turnovers
 * in your own box; going long bypasses the press entirely at the cost of
 * possession and control. Returns [ownMult, oppMult].
 *
 * NOTE the double gate: the branch taken depends on the OPPONENT's press,
 * and the payoff inside that branch scales with the squad's own `fit`. An
 * unfit side playing out against a high press hands the opponent +18%.
 */
export function applyBuild(build: string, oppPress: string, fit: number): [number, number] {
  if (build === 'play-out') {
    if (oppPress === 'high') return [0.92 + fit * 0.16, 1 + (1 - fit) * 0.18];
    return [0.99 + fit * 0.04, 1.0];
  }
  if (build === 'long') {
    return [0.97, oppPress === 'high' ? 0.94 : 1.0];
  }
  return [1.0, 1.0];
}

/**
 * Runs: runs in behind need pace up front and feast on a high line but die
 * against a deep one; playing into feet is the patient answer to a deep
 * block. Again double-gated — `fit` only ever pays out on the branches where
 * the opponent's line actually leaves the space.
 */
export function runsMult(runs: string, fit: number, oppLine: string): number {
  if (runs === 'in-behind') {
    return oppLine === 'high' ? 0.98 + fit * 0.16 : oppLine === 'deep' ? 0.96 : 0.98 + fit * 0.07;
  }
  if (runs === 'into-feet') {
    return oppLine === 'deep' ? 1.04 : oppLine === 'high' ? 0.97 : 1.0;
  }
  return 1.0;
}

/** Everything `calcMatchXG` needs about one side. */
export interface XGSide {
  xi: XISlot[];
  tactics: Tactics;
  mentality: string;
  /** Extra multiplier from morale / chemistry / difficulty scaling. */
  qualityMult: number;
  /**
   * Phase 5: how well this side executes its named play-style, 0-1, combining
   * squad ability with drilled familiarity. Supplied by the caller so this
   * module stays free of a familiarity import. Defaults to 1 (fully executed)
   * when absent, which is what an undrilled 'balanced' side gets.
   */
  styleExec?: number;
}

export interface MatchXG {
  homeXG: number;
  awayXG: number;
  hAttR: number;
  aAttR: number;
  hDefR: number;
  aDefR: number;
}

const t = (tac: Tactics) => ({
  press: tac.pressing ?? 'mid',
  width: tac.width ?? 'standard',
  tempo: tac.tempo ?? 'normal',
  line: tac.defLine ?? 'normal',
  focus: tac.focus ?? 'mixed',
  tackling: tac.tackling ?? 'normal',
  build: tac.buildUp ?? 'balanced',
  passing: tac.passingStyle ?? 'mixed',
  runs: tac.runs ?? 'balanced',
});

/**
 * The deep tactical xG chain. Decides HOW MUCH each side creates; the shot
 * model decides WHAT it creates. Ported from the reference's `calcMatchXG`
 * step for step, including every skill/matchup gate.
 */
export function calcMatchXG(home: XGSide, away: XGSide): MatchXG {
  const h = t(home.tactics);
  const a = t(away.tactics);
  const hMen = home.mentality;
  const aMen = away.mentality;
  // Our five-step mentality collapses onto the reference's three for the
  // base attack/defence modifiers.
  const base3 = (m: string) => (m.includes('attacking') ? 'attacking' : m.includes('defensive') ? 'defensive' : 'balanced');
  const hM3 = base3(hMen);
  const aM3 = base3(aMen);

  // 1. Base xG from starting-XI ratings + mentality (home gets 1.1x).
  const hAttR = attackRating(home.xi) * home.qualityMult;
  const aAttR = attackRating(away.xi) * away.qualityMult;
  const hDefR = defenseRating(home.xi) * home.qualityMult;
  const aDefR = defenseRating(away.xi) * away.qualityMult;
  // Raised to 9 so player quality is clearly the dominant term: a 72-rated
  // side simply cannot out-create an 86-rated one on tactics alone.
  const hAtk = Math.pow(hAttR, 9) * (offMod[hM3] ?? 1) * 1.1;
  const hDef = Math.pow(hDefR, 9) * (defMod[hM3] ?? 1) * (LINE_DEF_MOD[h.line] ?? 1);
  const aAtk = Math.pow(aAttR, 9) * (offMod[aM3] ?? 1);
  const aDef = Math.pow(aDefR, 9) * (defMod[aM3] ?? 1) * (LINE_DEF_MOD[a.line] ?? 1);
  const hStr = hAtk / (hAtk + aDef);
  const aStr = aAtk / (aAtk + hDef);
  // Reference constants are 2.4 / 2.1, tuned against its own rating spread.
  // Our dataset's attack and defence ratings sit closer together, so hStr/aStr
  // hug 0.5 more tightly and the same coefficients land ~2.2 goals a game.
  // Scaled by 1.31 to put sim-test back in the 2.4–3.2 band; the home/away
  // ratio (1.143) is preserved exactly.
  let homeXG = Math.max(0.15, 3.15 * hStr);
  let awayXG = Math.max(0.15, 2.76 * aStr);
  // Ratings-only baseline, kept for the tactical-gain compressor at the end.
  const hBaseXG = homeXG;
  const aBaseXG = awayXG;

  // 2. Pressing: own boost from winning the ball high, plus the risk left for
  // the opponent. Both sides of the trade are quality-gated.
  const hp = PRESS_PRESET[h.press] ?? PRESS_PRESET.mid;
  const ap = PRESS_PRESET[a.press] ?? PRESS_PRESET.mid;
  const hSE = MENTALITY_EXPOSURE[hMen] ?? MENTALITY_EXPOSURE.balanced;
  const aSE = MENTALITY_EXPOSURE[aMen] ?? MENTALITY_EXPOSURE.balanced;
  const hPressFit = pressFit(home.xi);
  const aPressFit = pressFit(away.xi);
  homeXG *= 1 + hp.ownBoost * (hp.ownBoost > 0 ? 0.35 + 0.65 * hPressFit : 1) + (TACKLE_BOOST[h.tackling] ?? 0);
  awayXG *= 1 + ap.ownBoost * (ap.ownBoost > 0 ? 0.35 + 0.65 * aPressFit : 1) + (TACKLE_BOOST[a.tackling] ?? 0);
  const hRiskScale = Math.max(0.5, Math.min(2.2, Math.pow(aAttR / hDefR, 3)));
  const aRiskScale = Math.max(0.5, Math.min(2.2, Math.pow(hAttR / aDefR, 3)));
  const hBlockQ = Math.max(0.6, Math.min(1.2, Math.pow(hDefR / aAttR, 2)));
  const aBlockQ = Math.max(0.6, Math.min(1.2, Math.pow(aDefR / hAttR, 2)));
  awayXG *= hp.risk >= 0
    ? 1 + hp.risk * aSE.counter * hRiskScale   // high press → space for away counters
    : 1 + hp.risk * aSE.breakdown * hBlockQ;   // low block  → away finds it harder
  homeXG *= ap.risk >= 0
    ? 1 + ap.risk * hSE.counter * aRiskScale
    : 1 + ap.risk * hSE.breakdown * aBlockQ;

  // 3. Width, tempo and line height on own attack.
  homeXG *= (WIDTH_ATK[h.width] ?? 1) * (TEMPO_ATK[h.tempo] ?? 1) * (LINE_ATK[h.line] ?? 1);
  awayXG *= (WIDTH_ATK[a.width] ?? 1) * (TEMPO_ATK[a.tempo] ?? 1) * (LINE_ATK[a.line] ?? 1);

  // 3b. Attacking focus vs the OPPONENT's width — a genuine rock-paper-scissors
  // rather than a flat bonus.
  homeXG *= (FOCUS_ATK[h.focus] ?? 1) * (FOCUS_VS_WIDTH[h.focus]?.[a.width] ?? 1);
  awayXG *= (FOCUS_ATK[a.focus] ?? 1) * (FOCUS_VS_WIDTH[a.focus]?.[h.width] ?? 1);

  // 3c. Build-up, passing directness and forward runs — each a matchup against
  // the opponent's press/line, each skill-gated on the players asked to do it.
  const [hBuildOwn, hBuildOpp] = applyBuild(h.build, a.press, buildFit(home.xi));
  const [aBuildOwn, aBuildOpp] = applyBuild(a.build, h.press, buildFit(away.xi));
  homeXG *= hBuildOwn; awayXG *= hBuildOpp;
  awayXG *= aBuildOwn; homeXG *= aBuildOpp;

  if (h.passing === 'through-balls') homeXG *= (0.94 + passFit(home.xi) * 0.16) * (a.line === 'high' ? 1.08 : 1.0);
  else if (h.passing === 'short') homeXG *= 0.98;
  if (a.passing === 'through-balls') awayXG *= (0.94 + passFit(away.xi) * 0.16) * (h.line === 'high' ? 1.08 : 1.0);
  else if (a.passing === 'short') awayXG *= 0.98;

  homeXG *= runsMult(h.runs, runFit(home.xi), a.line);
  awayXG *= runsMult(a.runs, runFit(away.xi), h.line);

  // 4. Playing wide/fast/high-line stretches your own shape — extra exposure
  // when the opponent is set up to punish it on the counter.
  const hCounterRisk = (WIDTH_COUNTER_RISK[h.width] ?? 1) * (TEMPO_COUNTER_RISK[h.tempo] ?? 1)
    * (LINE_COUNTER_RISK[h.line] ?? 1) * (PASS_COUNTER_RISK[h.passing] ?? 1);
  const aCounterRisk = (WIDTH_COUNTER_RISK[a.width] ?? 1) * (TEMPO_COUNTER_RISK[a.tempo] ?? 1)
    * (LINE_COUNTER_RISK[a.line] ?? 1) * (PASS_COUNTER_RISK[a.passing] ?? 1);
  if (countersFromDeep(aMen)) {
    const convQ = Math.max(0.4, Math.min(1.3, Math.pow(aAttR / hDefR, 2)));
    homeXG /= hCounterRisk;
    awayXG *= 1 + (hCounterRisk - 1) * convQ;
  }
  if (countersFromDeep(hMen)) {
    const convQ = Math.max(0.4, Math.min(1.3, Math.pow(hAttR / aDefR, 2)));
    awayXG /= aCounterRisk;
    homeXG *= 1 + (aCounterRisk - 1) * convQ;
  }
  // Space behind a stretched shape is exploitable by ANY good attack — but a
  // weak one can't take advantage at all.
  const spaceQ = (attR: number, defR: number) => Math.max(0, Math.min(1.2, Math.pow(attR / defR, 3) - 0.4));
  if (!countersFromDeep(aMen) && hCounterRisk > 1) awayXG *= 1 + (hCounterRisk - 1) * 0.4 * spaceQ(aAttR, hDefR);
  if (!countersFromDeep(hMen) && aCounterRisk > 1) homeXG *= 1 + (aCounterRisk - 1) * 0.4 * spaceQ(hAttR, aDefR);

  // 4b. Style execution. A side asked to play an identity it hasn't drilled,
  // or hasn't the players for, gets less out of everything above. Scaled to
  // half-strength so a poorly-drilled side is blunted, not crippled — the
  // instructions still work, they just work less well.
  const execMult = (e: number | undefined) => 1 - (1 - Math.max(0, Math.min(1, e ?? 1))) * 0.5;
  homeXG *= execMult(home.styleExec);
  awayXG *= execMult(away.styleExec);

  // 5. Tactics amplify quality — they don't replace it. Compress each side's
  // net tactical GAIN over its ratings-only baseline by the class gap. Net
  // tactical penalties are left uncompressed: a bad setup hurts in full.
  const compressGain = (xg: number, base: number, ownR: number, oppR: number) => {
    const gain = xg / base;
    if (gain <= 1) return xg;
    const realize = Math.max(0.3, Math.min(1, Math.pow(ownR / oppR, 6)));
    return base * (1 + (gain - 1) * realize);
  };
  homeXG = compressGain(homeXG, hBaseXG, (hAttR + hDefR) / 2, (aAttR + aDefR) / 2);
  awayXG = compressGain(awayXG, aBaseXG, (aAttR + aDefR) / 2, (hAttR + hDefR) / 2);

  return {
    homeXG: Math.max(0.15, homeXG),
    awayXG: Math.max(0.15, awayXG),
    hAttR, aAttR, hDefR, aDefR,
  };
}

/* ------------------------------------------------------------------ *
 * Chance profile — WHAT a side creates.
 * ------------------------------------------------------------------ */

/**
 * The shape of a side's chances: who they fall to and from where. A team that
 * can pass and dribble through you takes fewer, better chances; one that
 * can't hits hopeful efforts from 25 yards.
 */
export function chanceProfile(xi: XISlot[], tac: Tactics, oppXi: XISlot[]): Record<string, number> {
  const w: Record<string, number> = { ...ARCH_BASE_W };
  const passQ = avgStatWeighted(xi, 'passing', { GK: 0.1, DEF: 0.5, MID: 2.0, ATT: 1.2 });
  const dribQ = avgStatWeighted(xi, 'dribbling', { GK: 0, DEF: 0.2, MID: 1.2, ATT: 2.5 });
  const shotQ = avgStatWeighted(xi, 'shooting', { GK: 0, DEF: 0.2, MID: 1.4, ATT: 2.0 });
  const paceQ = avgStatWeighted(xi, 'pace', { GK: 0, DEF: 0.4, MID: 1.0, ATT: 2.2 });
  const oppDef = avgStatWeighted(oppXi, 'defending', { GK: 0.2, DEF: 3.0, MID: 0.9, ATT: 0.05 });
  // Can they play through a defence, or do they end up shooting from range?
  const creation = ((passQ + dribQ) / 2 - oppDef) / 22;
  const boxShift = Math.max(-0.45, Math.min(0.55, creation));
  for (const k of ['box_central', 'close_range', 'one_on_one', 'tap_in']) w[k] *= 1 + boxShift * 0.55;
  for (const k of ['edge_box', 'long_range']) w[k] *= 1 - boxShift * 0.6;
  // A side full of shooters but short of passers takes its chances early.
  const potShot = (shotQ - passQ) / 20;
  w.long_range *= Math.max(0.5, 1 + potShot * 0.55);
  w.edge_box *= Math.max(0.6, 1 + potShot * 0.35);

  const style = tac.style ?? 'balanced';
  if (style === 'attacking') { w.rebound *= 1.5; w.one_on_one *= 1.3; w.close_range *= 1.15; }
  if (style === 'defensive') { w.one_on_one *= 1.6; w.long_range *= 1.2; w.header_cross *= 1.2; w.box_central *= 0.85; }

  const inst = t(tac);
  if (inst.runs === 'in-behind') { w.one_on_one *= 1.7; w.header_cross *= 0.85; }
  if (inst.runs === 'into-feet') { w.edge_box *= 1.25; w.box_central *= 1.1; w.one_on_one *= 0.7; }
  if (inst.passing === 'through-balls') { w.one_on_one *= 1.5; w.box_central *= 1.1; }
  if (inst.width === 'wide') { w.header_cross *= 1.35; w.box_wide *= 1.25; w.box_central *= 0.9; }
  if (inst.width === 'narrow') { w.header_cross *= 0.7; w.box_wide *= 0.75; w.box_central *= 1.2; }
  if (inst.tempo === 'fast') { w.rebound *= 1.2; w.one_on_one *= 1.15; }
  // A quick front line runs in behind whatever the instruction says.
  w.one_on_one *= Math.max(0.6, 1 + (paceQ - 68) / 90);
  return w;
}

/** Shot volume from mentality and pressing — more press, more turnovers, more shots. */
export function tacShotVol(tac: Tactics, mentality: string): number {
  const MEN_SHOT_VOL: Record<string, number> = {
    'ultra-attacking': 1.14, attacking: 1.08, balanced: 1.0, defensive: 0.9, 'ultra-defensive': 0.84,
  };
  const press = PRESS_PRESET[tac.pressing ?? 'mid'] ?? PRESS_PRESET.mid;
  return (MEN_SHOT_VOL[mentality] ?? 1.0) * (1 + press.ownBoost * 0.4);
}

import type { Player } from './types';

/** Bonuses a trait adds to a lineup's attack/midfield/defense aggregates. */
export interface TraitDef {
  name: string;
  att: number;
  mid: number;
  def: number;
  /** Multiplier on goal-scoring weight in match sim. */
  scorerMult: number;
  test: (p: Player) => boolean;
}

const TRAITS: TraitDef[] = [
  { name: 'Clinical', att: 0.5, mid: 0, def: 0, scorerMult: 1.6, test: (p) => p.pos !== 'GK' && p.sho >= 85 },
  { name: 'Speedster', att: 0.4, mid: 0, def: 0, scorerMult: 1.2, test: (p) => p.pos !== 'GK' && p.pac >= 90 },
  { name: 'Maestro', att: 0, mid: 0.5, def: 0, scorerMult: 1, test: (p) => p.pos !== 'GK' && p.pas >= 86 },
  { name: 'Trickster', att: 0.3, mid: 0.2, def: 0, scorerMult: 1.1, test: (p) => p.pos !== 'GK' && p.dri >= 89 },
  { name: 'Rock', att: 0, mid: 0, def: 0.5, scorerMult: 0.9, test: (p) => p.pos !== 'GK' && p.def >= 85 },
  { name: 'Engine', att: 0, mid: 0.4, def: 0.2, scorerMult: 1, test: (p) => p.pos !== 'GK' && p.phy >= 86 },
  { name: 'Leader', att: 0.1, mid: 0.2, def: 0.3, scorerMult: 1, test: (p) => p.age >= 31 && p.rating >= 80 },
  { name: 'Wonderkid', att: 0.2, mid: 0.2, def: 0.1, scorerMult: 1.1, test: (p) => p.age <= 20 && p.rating >= 75 },
];

/** Traits are derived from attributes (max 2 per player), so they persist for free. */
export function traitsFor(p: Player): TraitDef[] {
  return TRAITS.filter((t) => t.test(p)).slice(0, 2);
}

export function traitNames(p: Player): string[] {
  return traitsFor(p).map((t) => t.name);
}

export function scorerTraitMult(p: Player): number {
  return traitsFor(p).reduce((m, t) => m * t.scorerMult, 1);
}

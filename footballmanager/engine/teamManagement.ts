import type { GameState, Player, Position, Tactics, FormationDef } from './types';
import { getFormation } from './gameRules';
import { clamp } from './utils';

export function getSquad(state: GameState, clubId: number): Player[] {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return [];
  return club.playerIds.map((id) => state.players[id]).filter(Boolean);
}

/** Effective matchday rating: base rating × form, zero if injured. */
export function effectiveRating(p: Player): number {
  if (p.injuryWeeks > 0) return 0;
  return p.rating * p.form;
}

/** Pick the best available XI for a formation, strongest first per slot group. */
export function autoPickLineup(state: GameState, clubId: number, formation: FormationDef): (number | null)[] {
  const squad = getSquad(state, clubId)
    .filter((p) => p.injuryWeeks === 0)
    .sort((a, b) => effectiveRating(b) - effectiveRating(a));
  const used = new Set<number>();
  const lineup: (number | null)[] = formation.slots.map((slot) => {
    const pick = squad.find((p) => p.pos === slot.pos && !used.has(p.id));
    if (pick) {
      used.add(pick.id);
      return pick.id;
    }
    return null;
  });
  // Fill any empty slots with best remaining outfielders (out of position).
  return lineup.map((id, i) => {
    if (id !== null) return id;
    const slot = formation.slots[i];
    const fallback = squad.find((p) => !used.has(p.id) && (slot.pos === 'GK') === (p.pos === 'GK'));
    if (fallback) {
      used.add(fallback.id);
      return fallback.id;
    }
    return null;
  });
}

/** True if every slot is filled with a fit player from the club. */
export function isLineupValid(state: GameState, clubId: number, lineup: (number | null)[]): boolean {
  const clubPlayers = new Set(getSquad(state, clubId).map((p) => p.id));
  const seen = new Set<number>();
  for (const id of lineup) {
    if (id === null || !clubPlayers.has(id) || seen.has(id)) return false;
    if (state.players[id].injuryWeeks > 0) return false;
    seen.add(id);
  }
  return lineup.length === 11;
}

export interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
}

/**
 * Aggregate a lineup into attack/midfield/defense numbers (roughly 50–95).
 * Players slotted out of position play at 85% of their rating.
 */
export function lineupStrength(
  state: GameState,
  lineup: (number | null)[],
  formation: FormationDef,
  tactics: Tactics,
  morale: number
): TeamStrength {
  const groups: Record<Position, number[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  formation.slots.forEach((slot, i) => {
    const id = lineup[i];
    if (id === null) {
      groups[slot.pos].push(30); // empty slot is a big hole
      return;
    }
    const p = state.players[id];
    const penalty = p.pos === slot.pos ? 1 : 0.85;
    groups[slot.pos].push(effectiveRating(p) * penalty || 30);
  });

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 30);
  const gk = avg(groups.GK);
  const def = avg(groups.DEF);
  const mid = avg(groups.MID);
  const fwd = avg(groups.FWD);

  const moraleMod = 1 + (morale - 60) / 400; // ±~9%
  const styleAtt = tactics.style === 'attacking' ? 1.07 : tactics.style === 'defensive' ? 0.93 : 1;
  const styleDef = tactics.style === 'attacking' ? 0.93 : tactics.style === 'defensive' ? 1.07 : 1;

  const attack = (0.7 * fwd + 0.3 * mid) * moraleMod * styleAtt;
  const midfield = mid * moraleMod;
  const defense = (0.55 * def + 0.3 * gk + 0.15 * mid) * moraleMod * styleDef;

  return {
    attack: clamp(attack, 20, 110),
    midfield: clamp(midfield, 20, 110),
    defense: clamp(defense, 20, 110),
    overall: clamp((attack + midfield + defense) / 3, 20, 110),
  };
}

/** The AI's default setup for a club (used for every non-user team). */
export function aiMatchSetup(state: GameState, clubId: number): {
  lineup: (number | null)[];
  formation: FormationDef;
  tactics: Tactics;
} {
  const formation = getFormation('4-3-3');
  return {
    formation,
    lineup: autoPickLineup(state, clubId, formation),
    tactics: { style: 'balanced', pressing: 'mid' },
  };
}

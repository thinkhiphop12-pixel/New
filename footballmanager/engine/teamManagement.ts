import type { GameState, Player, Position, Tactics, FormationDef } from './types';
import { FORMATIONS, getFormation } from './gameRules';
import { traitsFor } from './traits';
import { clamp } from './utils';

export function getSquad(state: GameState, clubId: number): Player[] {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return [];
  return club.playerIds.map((id) => state.players[id]).filter(Boolean);
}

export function isOnLoan(p: Player): boolean {
  return p.onLoanUntil !== undefined && p.onLoanUntil > 0;
}

/** Players actually available to pick (fit and not away on loan). */
export function availableSquad(state: GameState, clubId: number): Player[] {
  return getSquad(state, clubId).filter((p) => p.injuryWeeks === 0 && !isOnLoan(p));
}

/** Effective matchday rating: base rating × form, zero if injured or on loan. */
export function effectiveRating(p: Player): number {
  if (p.injuryWeeks > 0 || isOnLoan(p)) return 0;
  return p.rating * p.form;
}

/** Pick the best available XI for a formation, strongest first per slot group. */
export function autoPickLineup(state: GameState, clubId: number, formation: FormationDef): (number | null)[] {
  const squad = availableSquad(state, clubId).sort((a, b) => effectiveRating(b) - effectiveRating(a));
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

/** True if every slot is filled with a fit, present player from the club. */
export function isLineupValid(state: GameState, clubId: number, lineup: (number | null)[]): boolean {
  const clubPlayers = new Set(getSquad(state, clubId).map((p) => p.id));
  const seen = new Set<number>();
  for (const id of lineup) {
    if (id === null || !clubPlayers.has(id) || seen.has(id)) return false;
    if (state.players[id].injuryWeeks > 0 || isOnLoan(state.players[id])) return false;
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
 * Players slotted out of position play at 85% of their rating. Morale,
 * team chemistry, player traits and tactics all modulate the result.
 */
export function lineupStrength(
  state: GameState,
  lineup: (number | null)[],
  formation: FormationDef,
  tactics: Tactics,
  morale: number,
  chemistry = 50
): TeamStrength {
  const groups: Record<Position, number[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  let traitAtt = 0;
  let traitMid = 0;
  let traitDef = 0;
  formation.slots.forEach((slot, i) => {
    const id = lineup[i];
    if (id === null || id === undefined) {
      groups[slot.pos].push(30); // empty slot is a big hole
      return;
    }
    const p = state.players[id];
    const penalty = p.pos === slot.pos ? 1 : 0.85;
    groups[slot.pos].push(effectiveRating(p) * penalty || 30);
    for (const t of traitsFor(p)) {
      traitAtt += t.att;
      traitMid += t.mid;
      traitDef += t.def;
    }
  });

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 30);
  const gk = avg(groups.GK);
  const def = avg(groups.DEF);
  const mid = avg(groups.MID);
  const fwd = avg(groups.FWD);

  const moraleMod = 1 + (morale - 60) / 400; // ±~9%
  const chemMod = 1 + (chemistry - 50) / 550; // ±~9%
  const styleAtt = tactics.style === 'attacking' ? 1.07 : tactics.style === 'defensive' ? 0.93 : 1;
  const styleDef = tactics.style === 'attacking' ? 0.93 : tactics.style === 'defensive' ? 1.07 : 1;
  const widthAtt = tactics.width === 'wide' ? 1.03 : tactics.width === 'narrow' ? 0.97 : 1;
  const widthDef = tactics.width === 'narrow' ? 1.04 : tactics.width === 'wide' ? 0.98 : 1;

  const attack = (0.7 * fwd + 0.3 * mid + traitAtt) * moraleMod * chemMod * styleAtt * widthAtt;
  const midfield = (mid + traitMid) * moraleMod * chemMod;
  const defense = (0.55 * def + 0.3 * gk + 0.15 * mid + traitDef) * moraleMod * chemMod * styleDef * widthDef;

  return {
    attack: clamp(attack, 20, 110),
    midfield: clamp(midfield, 20, 110),
    defense: clamp(defense, 20, 110),
    overall: clamp((attack + midfield + defense) / 3, 20, 110),
  };
}

/** Average rating of a club's squad — a proxy for its overall quality. */
export function squadAvgRating(state: GameState, clubId: number): number {
  const squad = getSquad(state, clubId);
  if (!squad.length) return 50;
  return squad.reduce((s, p) => s + p.rating, 0) / squad.length;
}

/**
 * The AI's setup for a club. Smarter than a fixed 4-3-3: each club has its own
 * preferred formation, and adapts style to the opponent's quality.
 */
export function aiMatchSetup(state: GameState, clubId: number, opponentId?: number): {
  lineup: (number | null)[];
  formation: FormationDef;
  tactics: Tactics;
} {
  const formation = getFormation(FORMATIONS[clubId % FORMATIONS.length].id);
  let style: Tactics['style'] = 'balanced';
  let pressing: Tactics['pressing'] = 'mid';
  if (opponentId) {
    const diff = squadAvgRating(state, clubId) - squadAvgRating(state, opponentId);
    if (diff > 3) {
      style = 'attacking';
      pressing = 'high';
    } else if (diff < -3) {
      style = 'defensive';
      pressing = 'low';
    }
  }
  return {
    formation,
    lineup: autoPickLineup(state, clubId, formation),
    tactics: { style, pressing, tempo: 'normal', width: 'standard' },
  };
}

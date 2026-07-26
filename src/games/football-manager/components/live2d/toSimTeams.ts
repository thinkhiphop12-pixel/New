import type { Team as SimTeam, PitchDetails } from 'footballsim';
import type { FormationDef, Player } from '@/engine/types';

/** footballsim's own pitch dimensions (see its init_config/pitch.json). */
export const SIM_PITCH: PitchDetails = { pitchWidth: 680, pitchHeight: 1050, goalWidth: 90 };

const HALF_DEPTH = 500; // own-half depth in sim units before switchSide() mirrors the second team

/** Map a Gaffa 0-100 attribute (or rating) onto footballsim's rough 0-100 skill scale. */
function clampSkill(v: number): number {
  return Math.max(1, Math.min(100, Math.round(v)));
}

function toSkill(p: Player) {
  return {
    passing: clampSkill(p.pas),
    shooting: clampSkill(p.sho),
    tackling: clampSkill(p.def),
    saving: p.pos === 'GK' ? clampSkill(p.rating) : clampSkill(40 + p.def / 3),
    agility: clampSkill((p.pac + p.dri) / 2),
    strength: clampSkill(p.phy),
    penalty_taking: clampSkill(p.sho),
    jumping: clampSkill(p.phy),
  };
}

/** Builds a footballsim Team config from a Gaffa lineup + formation, so the
 *  live match pitch can run real continuous player/ball movement for one
 *  team's own half (the engine mirrors the second team automatically). */
export function toSimTeam(
  name: string,
  formation: FormationDef,
  lineup: (number | null)[],
  players: Record<number, Player>,
): SimTeam {
  const simPlayers = formation.slots.map((slot, i) => {
    const id = lineup[i];
    const p = id != null ? players[id] : null;
    const x = Math.round((slot.x / 100) * SIM_PITCH.pitchWidth);
    const y = Math.round((slot.y / 100) * HALF_DEPTH);
    return {
      name: p?.name ?? slot.label,
      position: slot.label,
      rating: String(p ? Math.round(p.rating * p.form) : 60),
      skill: p ? toSkill(p) : toSkill({ pas: 60, sho: 60, def: 60, pac: 60, dri: 60, phy: 60, rating: 60, pos: slot.pos } as Player),
      currentPOS: [x, y] as [number, number],
      fitness: 100,
      injured: false,
    };
  });

  return {
    name,
    players: simPlayers,
  } as unknown as SimTeam;
}

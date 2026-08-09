import type { GameState, Player } from './types';
import { getFormation } from './gameRules';
import { autoPickLineup, availableSquad, effectiveRating } from './teamManagement';
import { isSuspended, suspensionLabel } from './discipline';

/**
 * The checks that run between "proceed to match" and kick-off.
 *
 * Two kinds of problem, deliberately handled differently:
 *
 *   - Ones the manager has no say in (a suspended or injured man in the XI,
 *     a lineup with holes in it). These are *fixed* here and reported, because
 *     there is no legal way to start the match otherwise — the alternative is
 *     kicking off with ten men for no reason.
 *   - Ones that are a judgement call (a tired player who is legal but unwise).
 *     These are only *raised*; the manager decides. Playing him anyway feeds
 *     `riskyIds` into the sim, where it raises his injury chance for the whole
 *     match (`RISKED_INJURY_MULT` in engine/tickEngine/sim.ts) — so the warning
 *     describes something that genuinely happens rather than being flavour.
 *
 * Pure: nothing here mutates `state`. The caller applies `lineup`/`formationId`
 * if it decides to go ahead.
 */

/** Below this, a player is unfit enough to be worth warning about. */
export const FITNESS_FLOOR = 60;

/** Fallback when the lineup can't be used as-is. */
export const FALLBACK_FORMATION = '4-4-2';

export type PreMatchWarningKind = 'tactics' | 'unavailable' | 'fitness';

export interface PreMatchWarning {
  kind: PreMatchWarningKind;
  /** Headline, already carrying its ⚠️ marker. */
  title: string;
  /** The sentence under it — what happened and what it means. */
  detail: string;
  /** Whether this was fixed automatically (acknowledge) or is a choice. */
  auto: boolean;
  /** The player this is about, for the fitness and availability warnings. */
  playerId?: number;
  /** Who came in, for an automatic replacement. */
  replacementId?: number;
}

export interface PreMatchCheck {
  warnings: PreMatchWarning[];
  /** The XI to actually start, after every automatic fix. */
  lineup: (number | null)[];
  /** The formation to actually start, after any fallback. */
  formationId: string;
  /** Unfit men the manager may choose to risk — see `riskedPlayerIds`. */
  riskyIds: number[];
}

/** Best bench player available to come in, preferring a like-for-like slot. */
function bestReplacement(state: GameState, clubId: number, out: Player | undefined, taken: Set<number>): Player | null {
  const bench = availableSquad(state, clubId)
    .filter((p) => !taken.has(p.id))
    .sort((a, b) => effectiveRating(b) - effectiveRating(a));
  if (!bench.length) return null;
  const like = bench.filter((p) => p.pos === out?.pos);
  return (like.length ? like : bench)[0];
}

export function runPreMatchChecks(state: GameState): PreMatchCheck {
  const clubId = state.userClubId;
  const warnings: PreMatchWarning[] = [];
  const riskyIds: number[] = [];

  let formationId = state.formationId;
  let lineup = [...state.lineup];

  /* --- 1. Tactics. A formation we can't resolve, or an XI that isn't eleven
     distinct players, can't be sent out — fall back and auto-pick. --- */
  const squadIds = new Set(availableSquad(state, clubId).map((p) => p.id));
  const seen = new Set<number>();
  const holes = lineup.filter((id) => {
    if (id === null || seen.has(id)) return true;
    seen.add(id);
    return false;
  }).length;
  const formation = getFormation(formationId);
  const wrongSize = lineup.length !== formation.slots.length || lineup.length !== 11;

  if (holes > 0 || wrongSize) {
    formationId = FALLBACK_FORMATION;
    lineup = autoPickLineup(state, clubId, getFormation(formationId));
    warnings.push({
      kind: 'tactics',
      title: '⚠️ No tactic selected!',
      detail: `Your lineup has ${wrongSize ? 'the wrong number of players' : `${holes} empty position${holes === 1 ? '' : 's'}`}. Using default ${FALLBACK_FORMATION} with your strongest available XI. Confirm?`,
      auto: true,
    });
  }

  /* --- 2. Availability. Suspensions and injuries picked up since the XI was
     set are forced substitutions — there is no "play him anyway" option. --- */
  const taken = new Set(lineup.filter((id): id is number => id !== null));
  for (let i = 0; i < lineup.length; i++) {
    const id = lineup[i];
    if (id === null) continue;
    const p = state.players[id];
    if (!p) continue;
    const suspended = isSuspended(p);
    const injured = p.injuryWeeks > 0;
    if (!suspended && !injured) continue;

    const sub = bestReplacement(state, clubId, p, taken);
    if (sub) {
      taken.delete(id);
      taken.add(sub.id);
      lineup[i] = sub.id;
    } else {
      taken.delete(id);
      lineup[i] = null;
    }
    warnings.push({
      kind: 'unavailable',
      title: `⚠️ ${p.name} is ${suspended ? 'suspended' : 'injured'}!`,
      detail: sub
        ? `${suspended ? suspensionLabel(p) : `Out for ${p.injuryWeeks} week${p.injuryWeeks === 1 ? '' : 's'}`}. Auto-substituting with ${sub.name}.`
        : `${suspended ? suspensionLabel(p) : 'Injured'}, and there is nobody fit on the bench to replace him — you will start a man short.`,
      auto: true,
      playerId: p.id,
      replacementId: sub?.id,
    });
  }

  /* --- 3. Fitness. Legal to play, unwise to play — the manager's call. --- */
  for (const id of lineup) {
    if (id === null) continue;
    const p = state.players[id];
    if (!p || p.fitness >= FITNESS_FLOOR) continue;
    riskyIds.push(p.id);
    warnings.push({
      kind: 'fitness',
      title: `⚠️ ${p.name} is fatigued!`,
      detail: `${p.name} is at ${Math.round(p.fitness)}% fitness. Playing him risks a long-term injury. Confirm or substitute?`,
      auto: false,
      playerId: p.id,
    });
  }

  return { warnings, lineup, formationId, riskyIds };
}

/** Whether anything needs the manager's eyes before kick-off. */
export function hasPreMatchWarnings(check: PreMatchCheck): boolean {
  return check.warnings.length > 0;
}

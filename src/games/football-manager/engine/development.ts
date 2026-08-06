import type { GameState, Player, DevPlan, Position } from './types';
import { clamp, marketValue } from './utils';
import { pushInbox } from './inbox';

/** Detailed roles by broad position, used only to estimate how far a
 *  position-conversion plan has to travel — not a full role definition
 *  system (that already exists in lib/playerRoles.ts). */
const ROLE_GROUP: Record<string, Position> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', WB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD',
};

const ROLE_DISTANCE: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

/** Detailed roles a position-conversion plan can target, for the picker in
 *  PlayerModal. Excludes GK — outfield players don't retrain as keepers. */
export const CONVERTIBLE_ROLES = Object.keys(ROLE_GROUP).filter((r) => r !== 'GK');

/** How many weeks a position-conversion plan should take: further apart on
 *  the pitch and older players take longer. Simple heuristic — there is no
 *  existing ETA logic elsewhere in the engine to match. */
export function estimateConversionWeeks(player: Player, targetPos: string): number {
  const fromGroup = ROLE_GROUP[player.role] ?? player.pos;
  const toGroup = ROLE_GROUP[targetPos] ?? player.pos;
  const dist = Math.abs(ROLE_DISTANCE[fromGroup] - ROLE_DISTANCE[toGroup]);
  const base = 4 + dist * 4; // adjacent group: 8wk, two groups away: 12wk, same group: 4wk
  const ageMult = player.age <= 21 ? 0.75 : player.age <= 27 ? 1 : 1.4;
  return Math.max(3, Math.round(base * ageMult));
}

/** Set (or clear, with `null`) a player's development plan. Position-mode
 *  plans get `weeksRemaining` seeded from `estimateConversionWeeks`. */
export function setDevPlan(state: GameState, playerId: number, plan: DevPlan | null): GameState {
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  if (!p) return s;
  if (!plan) {
    delete p.devPlan;
    return s;
  }
  if (plan.mode === 'position' && plan.targetPos) {
    p.devPlan = { ...plan, weeksRemaining: estimateConversionWeeks(p, plan.targetPos) };
  } else {
    p.devPlan = { ...plan };
  }
  return s;
}

const STAT_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const;
type StatKey = (typeof STAT_KEYS)[number];

/**
 * Weekly resolution for every squad player with an active plan. Called from
 * `playRound` alongside the existing generic per-player training roll —
 * players without a plan are untouched here and keep rolling on the
 * existing balanced/attack/defense/fitness logic.
 */
export function applyDevPlans(state: GameState): void {
  const s = state;
  const userClub = s.clubs.find((c) => c.id === s.userClubId);
  if (!userClub) return;
  for (const id of userClub.playerIds) {
    const p = s.players[id];
    if (!p || !p.devPlan) continue;
    const plan = p.devPlan;

    if (plan.mode === 'stat' && plan.statFocus) {
      if (p.rating < 90 && Math.random() < 0.06) {
        const key = plan.statFocus as StatKey;
        p[key] = clamp(p[key] + 1, 1, 99);
        p.rating++;
        p.value = marketValue(p.rating, p.age);
      }
      continue;
    }

    if (plan.mode === 'position' && plan.targetPos) {
      plan.weeksRemaining = Math.max(0, (plan.weeksRemaining ?? 1) - 1);
      if (plan.weeksRemaining === 0) {
        if (!p.altPos.includes(plan.targetPos)) p.altPos = [...p.altPos, plan.targetPos];
        s.news.unshift(`${p.name} has completed his conversion to ${plan.targetPos}.`);
        pushInbox(s, {
          category: 'club',
          title: `${p.name} adds a new position`,
          body: `${p.name}'s development plan has paid off — he can now also play ${plan.targetPos}.`,
          playerId: p.id,
        });
        delete p.devPlan;
      }
      continue;
    }
    // 'balanced' plans are a no-op here; they fall back to the generic roll.
  }
}

export const DRILLS_PER_WEEK = 3;

export interface DrillResult {
  score: number;
  statGained: StatKey | null;
  sharpnessGained: number;
}

/**
 * Resolve one manual training drill for a player. `score` is 0-100 from the
 * mini-game UI. Higher scores scale the chance of a permanent +1 to the
 * player's dev-plan stat focus (or a random eligible stat without a plan),
 * plus a small sharpness bump — reuses the existing `sharpness` field
 * rather than adding a parallel one.
 */
export function applyDrillResult(state: GameState, playerId: number, score: number): { state: GameState; result: DrillResult } {
  const s: GameState = structuredClone(state);
  const used = s.drillsUsedThisWeek ?? 0;
  const p = s.players[playerId];
  const clampedScore = clamp(score, 0, 100);
  const sharpnessGained = Math.round(2 + (clampedScore / 100) * 6);
  let statGained: StatKey | null = null;

  if (p && used < DRILLS_PER_WEEK) {
    s.drillsUsedThisWeek = used + 1;
    p.sharpness = clamp(p.sharpness + sharpnessGained, 0, 100);
    const chance = (clampedScore / 100) * 0.5;
    if (p.rating < 99 && Math.random() < chance) {
      const focus = p.devPlan?.mode === 'stat' ? p.devPlan.statFocus : undefined;
      const key: StatKey = focus ?? STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
      p[key] = clamp(p[key] + 1, 1, 99);
      statGained = key;
      p.value = marketValue(p.rating, p.age);
    }
  }

  return { state: s, result: { score: clampedScore, statGained, sharpnessGained } };
}

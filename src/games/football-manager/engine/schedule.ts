import type { GameState, ScheduleDay } from './types';
import { clamp } from './utils';

/**
 * Career mode weekly planner (gap: the engine previously only had a single
 * club-wide `TrainingFocus`, no per-day granularity — see the note atop
 * TrainingScreen.tsx). Each day of the week is Training (sharpness up, small
 * fitness cost) or Recovery (fitness up, sharpness drifts down slightly).
 * Purely additive: a save without `weeklySchedule` behaves exactly as the
 * default split below, so nothing about the existing weekly tick changes
 * unless the user opens the new screen and edits it.
 */

export const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DEFAULT_SCHEDULE: ScheduleDay[] = [
  'training', 'training', 'training', 'training', 'training', 'recovery', 'recovery',
];

export function getSchedule(state: GameState): ScheduleDay[] {
  return state.weeklySchedule ?? DEFAULT_SCHEDULE;
}

export function setScheduleDay(state: GameState, index: number, day: ScheduleDay): GameState {
  const days = [...getSchedule(state)];
  if (index < 0 || index >= days.length) return state;
  days[index] = day;
  return { ...state, weeklySchedule: days };
}

export function setWholeSchedule(state: GameState, days: ScheduleDay[]): GameState {
  if (days.length !== 7) return state;
  return { ...state, weeklySchedule: days };
}

/** Applied once per week tick, on top of the existing per-club training
 *  focus and rest-day recovery. Training days build sharpness (boosted by a
 *  hired analyst coach); recovery days rebuild fitness faster (boosted by a
 *  hired fitness coach). Stacking too many training days back to back is
 *  overtraining: fitness stops keeping pace and injury risk climbs. */
export function applyWeeklySchedule(state: GameState): void {
  const club = state.clubs.find((c) => c.id === state.userClubId);
  if (!club) return;

  const days = getSchedule(state);
  const trainingDays = days.filter((d) => d === 'training').length;
  const recoveryDays = 7 - trainingDays;
  const fs = state.facilities;
  const analyst = fs?.coaches.find((c) => c.role === 'analyst');
  const fitnessCoach = fs?.coaches.find((c) => c.role === 'fitness');

  const sharpnessGain = trainingDays * 1.5 + (analyst ? analyst.quality / 20 : 0);
  const sharpnessDecay = recoveryDays * 0.8;
  const fitnessGain = recoveryDays * 2.5 + (fitnessCoach ? fitnessCoach.quality / 15 : 0);
  const fitnessCost = trainingDays * 1.5;

  // Overtraining: five or more training days in a week starts eating into
  // the squad's fitness faster than recovery restores it, and raises injury
  // risk. A fitness coach dampens (but never removes) that risk.
  const overtraining = trainingDays >= 5;
  const overtrainRisk = overtraining ? 0.008 * (trainingDays - 4) * (1 - (fitnessCoach ? fitnessCoach.quality / 250 : 0)) : 0;

  for (const id of club.playerIds) {
    const p = state.players[id];
    if (!p || p.injuryWeeks > 0) continue;
    p.sharpness = clamp(p.sharpness + sharpnessGain - sharpnessDecay, 0, 100);
    p.fitness = clamp(p.fitness + fitnessGain - fitnessCost, 15, 100);
    if (overtrainRisk > 0 && Math.random() < overtrainRisk) {
      p.injuryWeeks = 1;
      p.injuryDays = 7;
      p.injuryType = 'overtraining strain';
      state.news.unshift(`${p.name} picks up a knock after a heavy training week.`);
    }
  }
}

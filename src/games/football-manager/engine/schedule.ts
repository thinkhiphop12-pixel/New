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

/** Per-day-type constants the weekly aggregate below is built from — shared
 *  with `applyScheduleDay` (engine/dailyTick.ts's per-day counterpart) so the
 *  two can never drift apart into disagreeing about what a training or
 *  recovery day is worth. */
export const SCHEDULE_RATES = {
  trainSharpnessGain: 1.5,
  recoverySharpnessDecay: 0.8,
  recoveryFitnessGain: 2.5,
  trainFitnessCost: 1.5,
  /** Flat weekly bonus, not per-day — see `applyScheduleDay` for how it's
   *  fractioned across the week's matching days. */
  analystSharpnessBonus: (quality: number) => quality / 20,
  fitnessCoachBonus: (quality: number) => quality / 15,
  overtrainRiskPerDay: (trainingDays: number, fitnessCoachQuality: number | null) =>
    0.008 * (trainingDays - 4) * (1 - (fitnessCoachQuality != null ? fitnessCoachQuality / 250 : 0)),
} as const;

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

  const sharpnessGain = trainingDays * SCHEDULE_RATES.trainSharpnessGain + (analyst ? SCHEDULE_RATES.analystSharpnessBonus(analyst.quality) : 0);
  const sharpnessDecay = recoveryDays * SCHEDULE_RATES.recoverySharpnessDecay;
  const fitnessGain = recoveryDays * SCHEDULE_RATES.recoveryFitnessGain + (fitnessCoach ? SCHEDULE_RATES.fitnessCoachBonus(fitnessCoach.quality) : 0);
  const fitnessCost = trainingDays * SCHEDULE_RATES.trainFitnessCost;

  // Overtraining: five or more training days in a week starts eating into
  // the squad's fitness faster than recovery restores it, and raises injury
  // risk. A fitness coach dampens (but never removes) that risk.
  const overtraining = trainingDays >= 5;
  const overtrainRisk = overtraining ? SCHEDULE_RATES.overtrainRiskPerDay(trainingDays, fitnessCoach?.quality ?? null) : 0;

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

/**
 * Single-day counterpart to `applyWeeklySchedule`, used by the live daily
 * loop (engine/dailyTick.ts) so sharpness/fitness move visibly every day
 * instead of arriving in one lump on matchday.
 *
 * Flat weekly bonuses (analyst, fitness coach) are fractioned across the
 * week's matching days so the two functions agree on a week's total effect —
 * `applyScheduleDay` called once for each of the week's seven days produces
 * (up to rounding) the same aggregate change as one `applyWeeklySchedule`
 * call. Overtraining risk is likewise fractioned across training days so the
 * *expected* number of rolls in a week matches the aggregate version rather
 * than firing once per day.
 */
export function applyScheduleDay(state: GameState, dayIdx: number): void {
  const club = state.clubs.find((c) => c.id === state.userClubId);
  if (!club) return;

  const week = getSchedule(state);
  const today = week[dayIdx] ?? 'recovery';
  const trainingDays = week.filter((d) => d === 'training').length;
  const recoveryDays = 7 - trainingDays;
  const fs = state.facilities;
  const analyst = fs?.coaches.find((c) => c.role === 'analyst');
  const fitnessCoach = fs?.coaches.find((c) => c.role === 'fitness');

  const isTraining = today === 'training';
  const sharpnessDelta = isTraining
    ? SCHEDULE_RATES.trainSharpnessGain + (analyst && trainingDays > 0 ? SCHEDULE_RATES.analystSharpnessBonus(analyst.quality) / trainingDays : 0)
    : -SCHEDULE_RATES.recoverySharpnessDecay;
  const fitnessDelta = isTraining
    ? -SCHEDULE_RATES.trainFitnessCost
    : SCHEDULE_RATES.recoveryFitnessGain + (fitnessCoach && recoveryDays > 0 ? SCHEDULE_RATES.fitnessCoachBonus(fitnessCoach.quality) / recoveryDays : 0);

  const overtraining = trainingDays >= 5;
  const overtrainRiskToday = overtraining && isTraining
    ? SCHEDULE_RATES.overtrainRiskPerDay(trainingDays, fitnessCoach?.quality ?? null) / trainingDays
    : 0;

  for (const id of club.playerIds) {
    const p = state.players[id];
    if (!p || p.injuryWeeks > 0) continue;
    p.sharpness = clamp(p.sharpness + sharpnessDelta, 0, 100);
    p.fitness = clamp(p.fitness + fitnessDelta, 15, 100);
    if (overtrainRiskToday > 0 && Math.random() < overtrainRiskToday) {
      p.injuryWeeks = 1;
      p.injuryDays = 7;
      p.injuryType = 'overtraining strain';
      state.news.unshift(`${p.name} picks up a knock after a heavy training week.`);
    }
  }
}

/** Live projection for the Weekly Schedule screen: what a *full week* of the
 *  current plan would do to squad averages, without mutating state. Pure —
 *  applies the same per-unit constants `applyWeeklySchedule` uses, summed
 *  over the week, against the current squad's average sharpness/fitness. */
export function projectWeeklySchedule(state: GameState): { sharpnessDelta: number; fitnessDelta: number; overtrainRisk: number } {
  const days = getSchedule(state);
  const trainingDays = days.filter((d) => d === 'training').length;
  const recoveryDays = 7 - trainingDays;
  const fs = state.facilities;
  const analyst = fs?.coaches.find((c) => c.role === 'analyst');
  const fitnessCoach = fs?.coaches.find((c) => c.role === 'fitness');

  const sharpnessDelta =
    trainingDays * SCHEDULE_RATES.trainSharpnessGain + (analyst ? SCHEDULE_RATES.analystSharpnessBonus(analyst.quality) : 0)
    - recoveryDays * SCHEDULE_RATES.recoverySharpnessDecay;
  const fitnessDelta =
    recoveryDays * SCHEDULE_RATES.recoveryFitnessGain + (fitnessCoach ? SCHEDULE_RATES.fitnessCoachBonus(fitnessCoach.quality) : 0)
    - trainingDays * SCHEDULE_RATES.trainFitnessCost;
  const overtrainRisk = trainingDays >= 5 ? SCHEDULE_RATES.overtrainRiskPerDay(trainingDays, fitnessCoach?.quality ?? null) : 0;

  return { sharpnessDelta, fitnessDelta, overtrainRisk };
}

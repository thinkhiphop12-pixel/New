import type { Coach, GameState, ScheduleDay } from './types';
import { getSquad } from './teamManagement';
import { daysUntilMatchDay } from './calendar';
import { getSchedule, SCHEDULE_PRESETS } from './schedule';

/**
 * The Assistant Manager: a hireable Coach role (`role: 'assistant'`, see
 * StaffHubScreen) whose entire job is to make "why does this matter"
 * legible without the player having to know the underlying formulas. Phase
 * 2's first use of him is Weekly Schedule advice; Staff Hub, transfer
 * valuations and team talks are natural places to extend the same voice
 * later, not separate systems.
 */

export function getAssistant(state: GameState): Coach | undefined {
  return state.facilities?.coaches.find((c) => c.role === 'assistant');
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export interface ScheduleAdvice {
  /** What the assistant actually says — a first-person quote, so it reads
   *  as a person with an opinion rather than a system message. */
  quote: string;
  /** A preset from SCHEDULE_PRESETS worth applying, or null if the current
   *  schedule already looks right and there's nothing to suggest. */
  suggestion: { id: string; label: string; days: ScheduleDay[] } | null;
}

/**
 * A simple, explainable heuristic — not a hidden formula the player has to
 * reverse-engineer. Fatigue takes priority over sharpness (an injured or
 * exhausted squad can't use sharpness anyway), then sharpness ahead of a
 * near match, then a general overtraining caution; anything else is judged
 * fine as it stands.
 */
export function assistantScheduleAdvice(state: GameState): ScheduleAdvice {
  const assistant = getAssistant(state);
  const name = assistant?.name ?? 'Your coaching staff';
  const days = getSchedule(state);
  const trainingDays = days.filter((d) => d === 'training').length;
  const squad = getSquad(state, state.userClubId);
  const avgFitness = avg(squad.map((p) => p.fitness));
  const avgSharpness = avg(squad.map((p) => p.sharpness));
  const untilMatch = daysUntilMatchDay(state);

  const preset = (id: string) => SCHEDULE_PRESETS.find((p) => p.id === id)!;

  if (avgFitness < 65) {
    return {
      quote: `"We're running on empty, boss. ${Math.round(avgFitness)} average fitness is too low — ease off training or we'll pick up more knocks than we can afford."`,
      suggestion: preset('light'),
    };
  }
  if (avgSharpness < 60 && untilMatch <= 3) {
    return {
      quote: `"We're short on sharpness with the game only ${untilMatch === 0 ? 'today' : untilMatch === 1 ? 'tomorrow' : `${untilMatch} days`} away. Push the training up now or we'll be underprepared."`,
      suggestion: preset('match-sharp'),
    };
  }
  if (trainingDays >= 6) {
    return {
      quote: `"Six or seven training days a week catches up with a squad, boss. I'd bring it back to a balanced split before it costs us an injury."`,
      suggestion: preset('balanced'),
    };
  }
  return {
    quote: assistant
      ? `"${name} thinks the balance looks right — fitness ${Math.round(avgFitness)}, sharpness ${Math.round(avgSharpness)}. No changes needed."`
      : `"Looks about right to me, boss — fitness ${Math.round(avgFitness)}, sharpness ${Math.round(avgSharpness)}."`,
    suggestion: null,
  };
}

'use client';

import type { GameState, TeamDrill } from '@/engine/types';
import { getSquad } from '@/engine/teamManagement';
import { nextUserFixture } from '@/engine/seasonProgression';
import {
  SESSION_LABELS, TEAM_DRILLS, drillDef, getSessions, projectTeamSessions, setSession,
} from '@/engine/training';
import {
  WEEK_DAY_LABELS, getSchedule, projectWeeklySchedule, setScheduleDay, setWholeSchedule,
} from '@/engine/schedule';
import { assistantScheduleAdvice } from '@/engine/assistant';
import { Icon, type IconName } from './Icon';

/**
 * Team training.
 *
 * The club works together twice a week and the manager picks what each of
 * those two sessions is for. That is the whole interaction, and it is the
 * half of training that applies to everybody — individual work has its own
 * screen next door.
 *
 * The drills are deliberately the categories the FIFA-style training
 * mini-games will sit behind. Those aren't built yet, so a session resolves
 * in the weekly tick (engine/training.ts `applyWeeklyTraining`) rather than
 * being played; picking the drill is the decision either way, and the
 * mini-game will slot in underneath without this screen changing shape.
 *
 * The seven-day intensity strip underneath used to be its own screen
 * (Weekly Schedule) that no tab pointed at. It is the same engine
 * (engine/schedule.ts) — how hard the week is, as opposed to what it's
 * spent on — so it belongs here, compressed to one row.
 */

const DRILL_ICON: Record<TeamDrill, IconName> = {
  attacking: 'attack',
  defending: 'defense',
  possession: 'balanced',
  'set-pieces': 'corner',
  fitness: 'fitness',
  'match-prep': 'target',
};

function signed(n: number, digits = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function toneOf(n: number): string {
  return n > 0.05 ? 'var(--green)' : n < -0.05 ? 'var(--red)' : 'var(--muted)';
}

export default function TrainingScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const sessions = getSessions(state);
  const squad = getSquad(state, state.userClubId);
  const days = getSchedule(state);
  const advice = assistantScheduleAdvice(state);
  const intensity = projectWeeklySchedule(state);
  const drills = projectTeamSessions(state);

  const avgFitness = squad.length ? Math.round(squad.reduce((s, p) => s + p.fitness, 0) / squad.length) : 0;
  const avgSharpness = squad.length ? Math.round(squad.reduce((s, p) => s + p.sharpness, 0) / squad.length) : 0;
  const injured = squad.filter((p) => p.injuryWeeks > 0).length;
  const hasMatch = nextUserFixture(state) !== null;

  // What a full week of the current plan does, both halves combined.
  const weekSharpness = intensity.sharpnessDelta + drills.sharpness;
  const weekFitness = intensity.fitnessDelta + drills.fitness;

  return (
    <>
      {/* --- The two sessions ------------------------------------------- */}
      {([0, 1] as const).map((slot) => {
        const active = sessions[slot];
        return (
          <div key={slot} className="fm-mod">
            <div className="fm-mod__head">
              <h2 className="fm-mod__title">{SESSION_LABELS[slot]}</h2>
              <span className="fm-actiondock__spacer" />
              <span className="fm-hint" style={{ margin: 0 }}>{drillDef(active).blurb}</span>
            </div>
            <div className="fm-drillrow">
              {TEAM_DRILLS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`fm-drill${active === d.id ? ' active' : ''}`}
                  onClick={() => onChange(setSession(state, slot, d.id))}
                  title={d.blurb}
                >
                  <Icon name={DRILL_ICON[d.id]} size={18} />
                  <span className="fm-drill__label">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* --- How hard the week is --------------------------------------- */}
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">Week intensity</h2>
          <span className="fm-actiondock__spacer" />
          <span className="fm-hint" style={{ margin: 0 }}>
            {days.filter((d) => d === 'training').length} on, {days.filter((d) => d === 'recovery').length} off
          </span>
        </div>
        <div className="fm-dayrow">
          {WEEK_DAY_LABELS.map((label, i) => {
            const training = days[i] === 'training';
            const matchDay = i === 5 && hasMatch;
            return (
              <button
                key={label}
                type="button"
                className={`fm-day${training ? ' is-training' : ''}${matchDay ? ' is-match' : ''}`}
                onClick={() => onChange(setScheduleDay(state, i, training ? 'recovery' : 'training'))}
                title={matchDay ? 'Match day' : training ? 'Training — tap for recovery' : 'Recovery — tap for training'}
              >
                <span className="fm-day__label">{label}</span>
                <Icon name={matchDay ? 'fixtures' : training ? 'training' : 'person'} size={15} />
              </button>
            );
          })}
        </div>

        <div className="fm-projrow">
          <span>Sharpness <b style={{ color: toneOf(weekSharpness) }}>{signed(weekSharpness)}</b>/wk</span>
          <span>Fitness <b style={{ color: toneOf(weekFitness) }}>{signed(weekFitness)}</b>/wk</span>
          <span>
            Injury risk{' '}
            <b style={{ color: intensity.overtrainRisk > 0 ? 'var(--red)' : 'var(--green)' }}>
              {intensity.overtrainRisk > 0 ? `${(intensity.overtrainRisk * 100).toFixed(1)}%` : 'normal'}
            </b>
          </span>
        </div>

        <div className="fm-advice">
          <span className="fm-advice__icon"><Icon name="mic" size={14} /></span>
          <p className="fm-advice__quote">{advice.quote}</p>
          {advice.suggestion && (
            <button
              type="button"
              className="fm-btn fm-btn--secondary fm-btn--small"
              onClick={() => onChange(setWholeSchedule(state, advice.suggestion!.days))}
            >
              Use {advice.suggestion.label}
            </button>
          )}
        </div>
      </div>

      {/* --- Where the squad is ----------------------------------------- */}
      <div className="fm-mod">
        <div className="fm-mod__head"><h2 className="fm-mod__title">Condition</h2></div>
        <div className="fm-condgrid">
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: avgFitness >= 75 ? 'var(--green)' : avgFitness >= 55 ? 'var(--gold)' : 'var(--red)' }}>{avgFitness}%</span>
            <span className="fm-condgrid__lbl">Average fitness</span>
          </div>
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: avgSharpness >= 70 ? 'var(--green)' : avgSharpness >= 50 ? 'var(--gold)' : 'var(--red)' }}>{avgSharpness}%</span>
            <span className="fm-condgrid__lbl">Average sharpness</span>
          </div>
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: injured > 2 ? 'var(--red)' : 'var(--text)' }}>{injured}</span>
            <span className="fm-condgrid__lbl">In the treatment room</span>
          </div>
        </div>
        {[...squad]
          .filter((p) => p.injuryWeeks === 0)
          .sort((a, b) => a.fitness - b.fitness)
          .slice(0, 5)
          .map((p) => (
            <div key={p.id} className="fm-meter-row">
              <div className="fm-meter-row__head">
                <span>{p.name}</span>
                <span className="fm-meter-row__value" style={{ color: p.fitness >= 75 ? 'var(--green)' : p.fitness >= 50 ? 'var(--gold)' : 'var(--red)' }}>
                  {Math.round(p.fitness)}%
                </span>
              </div>
              <div className="fm-meter-row__track">
                <div
                  className="fm-meter-row__fill"
                  style={{ width: `${Math.round(p.fitness)}%`, background: p.fitness >= 75 ? 'var(--green)' : p.fitness >= 50 ? 'var(--gold)' : 'var(--red)' }}
                />
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

'use client';

import { useMemo } from 'react';
import type { GameState } from '@/engine/types';
import { getSquad } from '@/engine/teamManagement';
import { WEEK_DAY_LABELS, getSchedule, setScheduleDay, setWholeSchedule } from '@/engine/schedule';
import { Icon } from './Icon';

/**
 * Career mode weekly planner: pick Training or Recovery for each day. Training
 * builds match sharpness (faster with a hired analyst coach); Recovery rebuilds
 * fitness (faster with a hired fitness coach). Too many training days in a row
 * is overtraining — fitness stops keeping pace and injury risk climbs.
 */
export default function WeeklyScheduleScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const days = getSchedule(state);
  const trainingDays = days.filter((d) => d === 'training').length;
  const recoveryDays = 7 - trainingDays;
  const overtraining = trainingDays >= 5;

  const squad = useMemo(() => getSquad(state, state.userClubId), [state]);
  const avgSharpness = squad.length ? Math.round(squad.reduce((s, p) => s + p.sharpness, 0) / squad.length) : 0;
  const avgFitness = squad.length ? Math.round(squad.reduce((s, p) => s + p.fitness, 0) / squad.length) : 0;

  const analyst = state.facilities?.coaches.find((c) => c.role === 'analyst');
  const fitnessCoach = state.facilities?.coaches.find((c) => c.role === 'fitness');

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Weekly Schedule</p>
        <p className="fm-club-line">
          Plan each day as Training (sharpness) or Recovery (fitness). {overtraining && (
            <strong style={{ color: 'var(--red)' }}>Five or more training days is overtraining — injury risk rises.</strong>
          )}
        </p>
        <div className="fm-form-strip">
          <div className="fm-form-dot">
            <span className="fm-hint">Squad sharpness</span>
            <span>{avgSharpness}/100</span>
          </div>
          <div className="fm-form-dot">
            <span className="fm-hint">Squad fitness</span>
            <span>{avgFitness}/100</span>
          </div>
          <div className="fm-form-dot">
            <span className="fm-hint">Training : Recovery</span>
            <span>{trainingDays} : {recoveryDays}</span>
          </div>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>This Week</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WEEK_DAY_LABELS.map((label, i) => {
            const day = days[i];
            return (
              <button
                key={label}
                type="button"
                className={`fm-btn fm-btn--small${day === 'training' ? ' fm-btn--primary' : ' fm-btn--secondary'}`}
                style={{ flex: '1 1 60px', flexDirection: 'column', gap: 2 }}
                onClick={() => onChange(setScheduleDay(state, i, day === 'training' ? 'recovery' : 'training'))}
                title={day === 'training' ? 'Training day — tap for Recovery' : 'Recovery day — tap for Training'}
              >
                <span>{label}</span>
                <Icon name={day === 'training' ? 'training' : 'fitness'} size={13} />
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={() => onChange(setWholeSchedule(state, ['training', 'training', 'training', 'training', 'training', 'recovery', 'recovery']))}
          >
            Balanced (5:2)
          </button>
          <button
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={() => onChange(setWholeSchedule(state, ['training', 'training', 'training', 'recovery', 'training', 'training', 'recovery']))}
          >
            Match-sharp (6:1)
          </button>
          <button
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={() => onChange(setWholeSchedule(state, ['training', 'recovery', 'training', 'recovery', 'training', 'recovery', 'recovery']))}
          >
            Light (3:4)
          </button>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Backroom effect</p>
        <p className="fm-club-line">
          Analyst coach: {analyst ? `${analyst.name} (quality ${analyst.quality}) — boosts sharpness gained per training day.` : 'vacant — hire one from the Staff hub.'}
        </p>
        <p className="fm-club-line">
          Fitness coach: {fitnessCoach ? `${fitnessCoach.name} (quality ${fitnessCoach.quality}) — speeds recovery and softens overtraining risk.` : 'vacant — hire one from the Staff hub.'}
        </p>
      </div>
    </>
  );
}

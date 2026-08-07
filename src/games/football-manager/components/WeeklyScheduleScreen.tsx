'use client';

import { useMemo, useState } from 'react';
import type { GameState } from '@/engine/types';
import { getSquad } from '@/engine/teamManagement';
import { WEEK_DAY_LABELS, getSchedule, setScheduleDay, setWholeSchedule, SCHEDULE_PRESETS, projectWeeklySchedule } from '@/engine/schedule';
import { assistantScheduleAdvice, getAssistant } from '@/engine/assistant';
import { Icon } from './Icon';

function fmtDelta(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? '+' : ''}${r}`;
}

/**
 * Career mode weekly planner: pick Training or Recovery for each day. Training
 * builds match sharpness (faster with a hired analyst coach); Recovery rebuilds
 * fitness (faster with a hired fitness coach). Too many training days in a row
 * is overtraining — fitness stops keeping pace and injury risk climbs.
 *
 * Previously this screen showed the current squad averages and nothing
 * about what a chosen split would actually do to them — a player toggled
 * days, waited a week, and had no way to attribute the result. The
 * projection panel below is the fix: `projectWeeklySchedule` runs the exact
 * formula `applyWeeklySchedule` will, live, against the *current* schedule
 * on screen, before it's committed to a single day.
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
  const assistant = getAssistant(state);
  const advice = assistantScheduleAdvice(state);

  const projection = projectWeeklySchedule(state);
  const projectedSharpness = Math.round(Math.min(100, Math.max(0, avgSharpness + projection.sharpnessDelta)));
  const projectedFitness = Math.round(Math.min(100, Math.max(0, avgFitness + projection.fitnessDelta)));

  const [showDays, setShowDays] = useState(false);
  const activePreset = SCHEDULE_PRESETS.find((p) => p.days.every((d, i) => d === days[i]));

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Weekly Schedule</p>
        <p className="fm-club-line">
          Plan each day as Training (sharpness) or Recovery (fitness). {overtraining && (
            <strong style={{ color: 'var(--red)' }}>Five or more training days is overtraining — injury risk rises.</strong>
          )}
        </p>
        <div className="fm-stat-strip">
          <div className="fm-stat-dot">
            <span className="fm-hint">Squad sharpness</span>
            <span>{avgSharpness}/100</span>
          </div>
          <div className="fm-stat-dot">
            <span className="fm-hint">Squad fitness</span>
            <span>{avgFitness}/100</span>
          </div>
          <div className="fm-stat-dot">
            <span className="fm-hint">Training : Recovery</span>
            <span>{trainingDays} : {recoveryDays}</span>
          </div>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>This Week</p>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 10px' }}>
          Pick an approach — everyone on the squad follows it, no per-player setup needed.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SCHEDULE_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`fm-btn fm-btn--small${activePreset?.id === p.id ? ' fm-btn--primary' : ' fm-btn--secondary'}`}
              onClick={() => onChange(setWholeSchedule(state, p.days))}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="fm-btn fm-btn--ghost fm-btn--small"
          style={{ marginTop: 10 }}
          onClick={() => setShowDays((v) => !v)}
        >
          {showDays ? 'Hide day-by-day' : 'Customize day-by-day'}
        </button>
        {showDays && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
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
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Projected — end of week</p>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 10px' }}>
          What this schedule will do to the squad by Sunday, if nothing else changes.
        </p>
        <div className="fm-stat-strip">
          <div className="fm-stat-dot">
            <span className="fm-hint">Sharpness</span>
            <span>
              {avgSharpness} → {projectedSharpness}{' '}
              <strong style={{ color: projection.sharpnessDelta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                ({fmtDelta(projection.sharpnessDelta)})
              </strong>
            </span>
          </div>
          <div className="fm-stat-dot">
            <span className="fm-hint">Fitness</span>
            <span>
              {avgFitness} → {projectedFitness}{' '}
              <strong style={{ color: projection.fitnessDelta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                ({fmtDelta(projection.fitnessDelta)})
              </strong>
            </span>
          </div>
          <div className="fm-stat-dot">
            <span className="fm-hint">Injury risk</span>
            <span style={{ color: projection.overtrainRisk > 0 ? 'var(--red)' : 'var(--green)' }}>
              {projection.overtrainRisk > 0 ? `+${Math.round(projection.overtrainRisk * 1000) / 10}%/player` : 'Normal'}
            </span>
          </div>
        </div>
        {projectedFitness < 60 && (
          <p className="fm-club-line" style={{ color: 'var(--red)', marginTop: 8 }}>
            <Icon name="warning" size={13} /> Fitness would drop below 60 by Sunday — that's below matchday-ready for most of the squad.
          </p>
        )}
      </div>

      <div className="fm-panel" style={{ borderColor: advice.suggestion ? 'var(--gold)' : undefined }}>
        <p className="fm-label" style={{ marginTop: 0 }}>
          Assistant Manager{assistant ? ` — ${assistant.name}` : ''}
        </p>
        <p className="fm-club-line">{advice.quote}</p>
        {advice.suggestion && (
          <button
            className="fm-btn fm-btn--secondary fm-btn--small"
            onClick={() => onChange(setWholeSchedule(state, advice.suggestion!.days))}
          >
            Apply suggestion — {advice.suggestion.label}
          </button>
        )}
        {!assistant && (
          <p className="fm-hint" style={{ textAlign: 'left', margin: '8px 0 0' }}>
            No Assistant Manager hired — advice above is a rough read from the general coaching staff. Hire one from the Staff hub for a sharper eye.
          </p>
        )}
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

'use client';

import type { GameState } from '@/engine/types';
import { upgradeAcademy } from '@/engine/seasonProgression';
import { ACADEMY_UPGRADE_COST } from '@/engine/gameRules';
import {
  ACADEMY_PROJECT_COST, ACADEMY_REPUTATION_CAP, MEDICAL_UPGRADE_COST, TRAINING_UPGRADE_COST,
  newFacilities, startFacilityProject,
} from '@/engine/facilities';
import { formatMoney } from '@/engine/utils';

export default function FacilitiesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const fs = state.facilities ?? newFacilities(state);

  if (!state.facilities) {
    onChange({ ...state, facilities: fs });
  }

  const activeProjects = fs.projects.filter((p) => !p.complete);

  return (
    <FacilitiesTabs state={state} onChange={onChange} fs={fs} activeProjects={activeProjects} />
  );
}

function FacilitiesTabs({
  state,
  onChange,
  fs,
  activeProjects,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  fs: NonNullable<GameState['facilities']>;
  activeProjects: NonNullable<GameState['facilities']>['projects'];
}) {
  return (
    <>
      {activeProjects.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Projects underway</p>
          {activeProjects.map((p) => (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="fm-club-line">{p.label}</span>
                <span className="fm-hint">
                  wk {p.weeksElapsed}/{p.durationWeeks} · started S{p.startYear} wk{p.startWeek}
                </span>
              </div>
              <div className="fm-bar">
                <div className="fm-bar__fill good" style={{ width: `${(p.weeksElapsed / p.durationWeeks) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Training Ground</p>
        <p className="fm-club-line">Level {fs.trainingLevel}/5 — faster player development.</p>
        <div className="fm-bar">
          <div className="fm-bar__fill good" style={{ width: `${(fs.trainingLevel / 5) * 100}%` }} />
        </div>
        {fs.trainingLevel < 5 && (
          <button
            className="fm-btn fm-btn--secondary fm-btn--small"
            style={{ marginTop: 8 }}
            disabled={
              TRAINING_UPGRADE_COST[fs.trainingLevel + 1] > state.budget ||
              fs.projects.some((p) => p.kind === 'training' && !p.complete)
            }
            onClick={() => onChange(startFacilityProject({ ...state, facilities: fs }, 'training'))}
          >
            Start project level {fs.trainingLevel + 1} — {formatMoney(TRAINING_UPGRADE_COST[fs.trainingLevel + 1])}
          </button>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Rehab &amp; Medical Centre</p>
        <p className="fm-club-line">Level {fs.medicalLevel}/5 — shorter injury layoffs.</p>
        <div className="fm-bar">
          <div className="fm-bar__fill good" style={{ width: `${(fs.medicalLevel / 5) * 100}%` }} />
        </div>
        {fs.medicalLevel < 5 && (
          <button
            className="fm-btn fm-btn--secondary fm-btn--small"
            style={{ marginTop: 8 }}
            disabled={
              MEDICAL_UPGRADE_COST[fs.medicalLevel + 1] > state.budget ||
              fs.projects.some((p) => p.kind === 'medical' && !p.complete)
            }
            onClick={() => onChange(startFacilityProject({ ...state, facilities: fs }, 'medical'))}
          >
            Start project level {fs.medicalLevel + 1} — {formatMoney(MEDICAL_UPGRADE_COST[fs.medicalLevel + 1])}
          </button>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Academy</p>
        <p className="fm-club-line">
          Reputation {fs.academyReputation}/{ACADEMY_REPUTATION_CAP} — higher reputation raises prospect
          interest chance and intake quality. Intake count still scales with academy level ({state.academyLevel}/3).
        </p>
        <div className="fm-bar">
          <div className="fm-bar__fill good" style={{ width: `${(fs.academyReputation / ACADEMY_REPUTATION_CAP) * 100}%` }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {fs.academyReputation < ACADEMY_REPUTATION_CAP && (
            <button
              className="fm-btn fm-btn--secondary fm-btn--small"
              disabled={
                ACADEMY_PROJECT_COST > state.budget ||
                fs.projects.some((p) => p.kind === 'academy' && !p.complete)
              }
              onClick={() => onChange(startFacilityProject({ ...state, facilities: fs }, 'academy'))}
            >
              Reputation drive (+15) — {formatMoney(ACADEMY_PROJECT_COST)}
            </button>
          )}
          {state.academyLevel < 3 && (
            <button
              className="fm-btn fm-btn--ghost fm-btn--small"
              disabled={state.budget < (ACADEMY_UPGRADE_COST[state.academyLevel + 1] ?? 0)}
              onClick={() => onChange(upgradeAcademy(state))}
            >
              Legacy intake upgrade → level {state.academyLevel + 1} — {ACADEMY_UPGRADE_COST[state.academyLevel + 1] ? formatMoney(ACADEMY_UPGRADE_COST[state.academyLevel + 1]) : '—'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

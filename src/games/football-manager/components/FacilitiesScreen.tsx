'use client';

import { useEffect, useState } from 'react';
import type { GameState, StandId } from '@/engine/types';
import {
  getStadiumLevel, getStaff, upgradeAcademy, upgradeStadium, upgradeStaff,
} from '@/engine/seasonProgression';
import {
  ACADEMY_UPGRADE_COST, STADIUM_UPGRADE_COST, STAFF_MAX_LEVEL, STAFF_UPGRADE_COST,
} from '@/engine/gameRules';
import {
  ACADEMY_PROJECT_COST, ACADEMY_REPUTATION_CAP, MEDICAL_UPGRADE_COST, TRAINING_UPGRADE_COST,
  fireCoach, hireCoach, newFacilities, startFacilityProject, startStandProject, tickFacilitiesWeek,
} from '@/engine/facilities';
import { formatMoney } from '@/engine/utils';
import StadiumBuilder from './StadiumBuilder';

export default function FacilitiesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [selectedStand, setSelectedStand] = useState<StandId | null>(null);
  const fs = state.facilities ?? newFacilities(state);

  // Catch up any weeks that passed since this screen was last open — projects
  // and scout assignments only progress while this weekly tick runs (see
  // tickFacilitiesWeek's doc comment: this module doesn't own
  // seasonProgression.ts's own weekly loop, so screens drive the catch-up).
  const lastTickWeekKey = `${state.seasonYear}-${state.week}`;
  useEffect(() => {
    if (!state.facilities) {
      onChange({ ...state, facilities: fs });
      return;
    }
    const anyInFlight = fs.projects.some((p) => !p.complete);
    if (anyInFlight) onChange(tickFacilitiesWeek(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTickWeekKey]);

  const stadiumLevel = getStadiumLevel(state);
  const stadiumCost = STADIUM_UPGRADE_COST[stadiumLevel + 1];
  const academyCost = ACADEMY_UPGRADE_COST[state.academyLevel + 1];
  const staff = getStaff(state);

  const staffLabels: Record<'coach' | 'physio' | 'scout', string> = {
    coach: 'Backroom coaching (legacy)',
    physio: 'Backroom medical (legacy)',
    scout: 'Backroom scouting (legacy)',
  };

  const activeProjects = fs.projects.filter((p) => !p.complete);

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Club Facilities</p>
        <p className="fm-club-line">
          Every upgrade below is now a timed project — spend more to build faster (2–10 weeks), track
          progress here, and the effect only lands once the project completes.
        </p>
      </div>

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

      <StadiumBuilder
        state={state}
        selected={selectedStand}
        onSelect={setSelectedStand}
        onStartProject={(standId) => onChange(startStandProject({ ...state, facilities: fs }, standId))}
      />

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
            Start project → level {fs.trainingLevel + 1} — {formatMoney(TRAINING_UPGRADE_COST[fs.trainingLevel + 1])}
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
            Start project → level {fs.medicalLevel + 1} — {formatMoney(MEDICAL_UPGRADE_COST[fs.medicalLevel + 1])}
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
              disabled={!academyCost || academyCost > state.budget}
              onClick={() => onChange(upgradeAcademy(state))}
            >
              Legacy intake upgrade → level {state.academyLevel + 1} — {academyCost ? formatMoney(academyCost) : '—'}
            </button>
          )}
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Named Coaches</p>
        <p className="fm-club-line">
          A head coach's quality feeds the tactical drilling multiplier and player development speed.
        </p>
        {(['head', 'fitness', 'goalkeeping'] as const).map((role) => {
          const coach = fs.coaches.find((c) => c.role === role);
          return (
            <div key={role} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fm-label" style={{ margin: 0, textTransform: 'capitalize' }}>{role} coach</span>
                {coach ? (
                  <span className="fm-hint">{coach.name} · quality {coach.quality} · {formatMoney(coach.wage)}/wk</span>
                ) : (
                  <span className="fm-hint">Vacant</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[45, 65, 85].map((q) => (
                  <button
                    key={q}
                    className="fm-btn fm-btn--ghost fm-btn--small"
                    onClick={() => onChange(hireCoach({ ...state, facilities: fs }, role, q))}
                  >
                    Hire (qual {q})
                  </button>
                ))}
                {coach && (
                  <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => onChange(fireCoach({ ...state, facilities: fs }, coach.id))}>
                    Release
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Legacy Backroom Levels</p>
        <p className="fm-club-line">
          Kept for backwards compatibility with existing saves; hiring a named head coach above overrides
          the coaching figure automatically.
        </p>
        {(['coach', 'physio', 'scout'] as const).map((role) => {
          const level = staff[role];
          const cost = STAFF_UPGRADE_COST[level + 1];
          const maxed = level >= STAFF_MAX_LEVEL;
          return (
            <div key={role} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="fm-club-line">{staffLabels[role]}</span>
                <span className="fm-hint">Level {level}/{STAFF_MAX_LEVEL}</span>
              </div>
              {!maxed && (
                <button
                  className="fm-btn fm-btn--ghost fm-btn--small"
                  style={{ marginTop: 6 }}
                  disabled={(cost ?? 0) > state.budget}
                  onClick={() => onChange(upgradeStaff(state, role))}
                >
                  Upgrade → level {level + 1} — {cost ? formatMoney(cost) : '—'}
                </button>
              )}
            </div>
          );
        })}
        {stadiumLevel < 3 && (
          <button
            className="fm-btn fm-btn--ghost fm-btn--small"
            disabled={!stadiumCost || stadiumCost > state.budget}
            onClick={() => onChange(upgradeStadium(state))}
          >
            Legacy instant stadium upgrade → level {stadiumLevel + 1} — {stadiumCost ? formatMoney(stadiumCost) : '—'}
          </button>
        )}
      </div>
    </>
  );
}

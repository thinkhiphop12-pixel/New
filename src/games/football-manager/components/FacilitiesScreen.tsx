'use client';

import { useEffect, useState } from 'react';
import type { GameState, Coach, StandId } from '@/engine/types';
import {
  gateIncome, getStadiumLevel, getStaff, upgradeAcademy, upgradeStadium, upgradeStaff,
} from '@/engine/seasonProgression';
import {
  ACADEMY_UPGRADE_COST, STADIUM_UPGRADE_COST, STAFF_MAX_LEVEL, STAFF_UPGRADE_COST,
} from '@/engine/gameRules';
import {
  ACADEMY_PROJECT_COST, ACADEMY_REPUTATION_CAP, MEDICAL_UPGRADE_COST, TRAINING_UPGRADE_COST,
  fireCoach, hireCoach, newFacilities, startFacilityProject, startStandProject, tickFacilitiesWeek,
} from '@/engine/facilities';
import { formatMoney } from '@/engine/utils';
import { Icon } from './Icon';
import StadiumBuilder from './StadiumBuilder';
import StaffProfileModal from './StaffProfileModal';

export default function FacilitiesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [tab, setTab] = useState<'stadium' | 'staff'>('stadium');
  const [selectedStand, setSelectedStand] = useState<StandId | null>(null);
  const [profileCoachId, setProfileCoachId] = useState<number | null>(null);
  const fs = state.facilities ?? newFacilities(state);

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

  const activeProjects = fs.projects.filter((p) => !p.complete);
  const userClub = state.clubs.find((c) => c.id === state.userClubId)!;

  return (
    <>
      <div className="fm-subnav__tabs" role="tablist" aria-label="Facilities sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stadium'}
          className={`fm-subtab${tab === 'stadium' ? ' active' : ''}`}
          onClick={() => setTab('stadium')}
        >
          <Icon name="stadium" size={14} className="fm-subtab__icon" />
          <span className="fm-subtab__label">Stadium &amp; Facilities</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'staff'}
          className={`fm-subtab${tab === 'staff' ? ' active' : ''}`}
          onClick={() => setTab('staff')}
        >
          <Icon name="staff" size={14} className="fm-subtab__icon" />
          <span className="fm-subtab__label">Staff</span>
          {getStaff(state) && <span className="fm-subtab__badge" />}
        </button>
      </div>

      {tab === 'stadium' && (
        <StadiumTab
          state={state}
          onChange={onChange}
          fs={fs}
          activeProjects={activeProjects}
          selectedStand={selectedStand}
          onSelectStand={setSelectedStand}
          userClub={userClub}
        />
      )}

      {tab === 'staff' && (
        <StaffTab
          state={state}
          onChange={onChange}
          fs={fs}
          staff={getStaff(state)}
          onSelectCoach={(id) => setProfileCoachId(id)}
        />
      )}
    {profileCoachId !== null && fs.coaches.find((c) => c.id === profileCoachId) && (
      <StaffProfileModal
        state={state}
        coach={fs.coaches.find((c) => c.id === profileCoachId)!}
        onClose={() => setProfileCoachId(null)}
        onChange={(next) => { onChange(next); setProfileCoachId(null); }}
      />
    )}
    </>
  );
}

function StadiumTab({
  state,
  onChange,
  fs,
  activeProjects,
  selectedStand,
  onSelectStand,
  userClub,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  fs: NonNullable<GameState['facilities']>;
  activeProjects: NonNullable<GameState['facilities']>['projects'];
  selectedStand: StandId | null;
  onSelectStand: (id: StandId | null) => void;
  userClub: NonNullable<GameState['clubs']>[number];
}) {
  const gate = gateIncome(state);

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
        onSelect={onSelectStand}
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

function StaffTab({
  state,
  onChange,
  fs,
  staff,
  onSelectCoach,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  fs: NonNullable<GameState['facilities']>;
  staff: NonNullable<GameState['staff']>;
  onSelectCoach: (id: number) => void;
}) {
  const staffLabels: Record<'coach' | 'physio' | 'scout', string> = {
    coach: 'Backroom coaching (legacy)',
    physio: 'Backroom medical (legacy)',
    scout: 'Backroom scouting (legacy)',
  };

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Named Coaches</p>
        {fs.coaches.length === 0 ? (
          <p className="fm-hint">No named coaches hired yet. Hire below to override the legacy backroom levels.</p>
        ) : (
          <div className="fm-staff-list">
            {fs.coaches.map((coach) => (
              <StaffRow
                key={coach.id}
                coach={coach}
                onClick={() => onSelectCoach(coach.id)}
              />
            ))}
          </div>
        )}
        {(['head', 'fitness', 'goalkeeping'] as const).map((role) => {
          const coach = fs.coaches.find((c) => c.role === role);
          const roleLabel = role === 'head' ? 'Head Coach' : role === 'fitness' ? 'Fitness Coach' : 'Goalkeeping Coach';
          return (
            <div key={role} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fm-label" style={{ margin: 0, textTransform: 'capitalize' }}>{roleLabel}</span>
                {coach ? (
                  <>
                    <span
                      className="fm-hint"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectCoach(coach.id)}
                      title="View profile"
                    >
                      {coach.name} · quality {coach.quality} · {formatMoney(coach.wage)}/wk
                    </span>
                    <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => onChange(fireCoach({ ...state, facilities: fs }, coach.id))}>
                      Release
                    </button>
                  </>
                ) : (
                  <span className="fm-hint">Vacant</span>
                )}
              </div>
              {!coach && (
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
                </div>
              )}
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
                  Upgrade level {level + 1} — {cost ? formatMoney(cost) : '—'}
                </button>
              )}
            </div>
          );
        })}
        {getStadiumLevel(state) < 3 && (
        <button
          className="fm-btn fm-btn--ghost fm-btn--small"
          disabled={!STADIUM_UPGRADE_COST[getStadiumLevel(state) + 1] || STADIUM_UPGRADE_COST[getStadiumLevel(state) + 1] > state.budget}
          onClick={() => onChange(upgradeStadium(state))}
        >
          Legacy instant stadium upgrade to level {getStadiumLevel(state) + 1} — {STADIUM_UPGRADE_COST[getStadiumLevel(state) + 1] ? formatMoney(STADIUM_UPGRADE_COST[getStadiumLevel(state) + 1]) : '—'}
        </button>
      )}
      </div>
    </>
  );
}

function StaffRow({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  const qualityPct = Math.round((coach.quality / 99) * 100);
  return (
    <div className="fm-staff-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          className="fm-staff-row__rating"
          style={{
            background: `conic-gradient(var(--green) ${qualityPct}%, var(--panel-2) 0)`,
            color: 'var(--text)',
          }}
        >
          {coach.quality}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="fm-staff-row__name">{coach.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="fm-staff-row__role">{coach.role.replace(/_/g, ' ')}</span>
            <span className="fm-staff-row__quality">quality {coach.quality}/99</span>
            <span className="fm-staff-row__badge">
              <Icon name="finances" size={10} /> {formatMoney(coach.wage)}/wk
            </span>
          </div>
        </div>
      </div>
      <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={onClick}>
        Profile
      </button>
    </div>
  );
}

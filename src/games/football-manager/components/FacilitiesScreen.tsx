'use client';

import type { GameState } from '@/engine/types';
import {
  getStadiumLevel, upgradeStadium, getStaff, upgradeStaff, upgradeAcademy,
} from '@/engine/seasonProgression';
import {
  ACADEMY_UPGRADE_COST, STADIUM_UPGRADE_COST, STAFF_UPGRADE_COST, STAFF_MAX_LEVEL,
} from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { StatTile } from './visuals';

const FACILITY_DESCRIPTIONS: Record<string, { current: string; benefit: string }> = {
  stadium: {
    current: 'Determines matchday gate income. Each level increases capacity by 25%.',
    benefit: 'Gate income increases 25% per level',
  },
  academy: {
    current: 'Youth academy quality determines how many prospects graduate each season.',
    benefit: 'One graduate per season at level 1-2, two at level 3',
  },
  training: {
    current: 'Quality of training ground affects player development speed.',
    benefit: 'Faster player development',
  },
  medical: {
    current: 'Medical facility quality affects injury recovery time.',
    benefit: 'Reduced injury duration',
  },
};

export default function FacilitiesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const stadiumLevel = getStadiumLevel(state);
  const stadiumCost = STADIUM_UPGRADE_COST[stadiumLevel + 1];
  const academyCost = ACADEMY_UPGRADE_COST[state.academyLevel + 1];
  const staff = getStaff(state);

  const facilities = [
    {
      name: 'Stadium',
      level: stadiumLevel,
      maxLevel: 3,
      current: `Level ${stadiumLevel}/3`,
      upgradeCost: stadiumCost,
      affordable: stadiumCost ? stadiumCost <= state.budget : false,
      onUpgrade: () => onChange(upgradeStadium(state)),
      icon: '🏟️',
    },
    {
      name: 'Academy',
      level: state.academyLevel,
      maxLevel: 3,
      current: `Level ${state.academyLevel}/3`,
      upgradeCost: academyCost,
      affordable: academyCost ? academyCost <= state.budget : false,
      onUpgrade: () => onChange(upgradeAcademy(state)),
      icon: '🎓',
    },
  ];

  const staffLabels: Record<string, { name: string; icon: string; key: 'training' | 'medical' | string }> = {
    coach: { name: 'Training Ground', icon: '🏃', key: 'training' },
    physio: { name: 'Medical Centre', icon: '⛑️', key: 'medical' },
    scout: { name: 'Scouting Network', icon: '🔭', key: 'scouting' },
  };

  const upcoming = [
    ...facilities
      .filter((f) => f.level < f.maxLevel)
      .map((f) => ({ label: `${f.name} → Level ${f.level + 1}`, cost: f.upgradeCost as number })),
    ...(['coach', 'physio', 'scout'] as const)
      .filter((role) => staff[role] < STAFF_MAX_LEVEL)
      .map((role) => ({
        label: `${staffLabels[role].name} → Level ${staff[role] + 1}`,
        cost: STAFF_UPGRADE_COST[staff[role] + 1],
      })),
  ].sort((a, b) => a.cost - b.cost);

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Club Facilities
        </p>
        <p className="fm-club-line">Invest in facilities to improve team performance and income.</p>
      </div>

      {upcoming.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            Upcoming upgrades
          </p>
          <ul className="fm-news">
            {upcoming.map((u, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{u.label}</span>
                <span style={{ color: u.cost <= state.budget ? 'var(--green)' : 'var(--muted)' }}>
                  {formatMoney(u.cost)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {facilities.map((facility) => {
        const maxed = facility.level >= facility.maxLevel;
        const costLabel = facility.upgradeCost ? formatMoney(facility.upgradeCost) : '—';

        return (
          <div key={facility.name} className="fm-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{facility.icon}</span>
              <div>
                <p className="fm-label" style={{ margin: 0 }}>
                  {facility.name}
                </p>
                <p className="fm-club-line" style={{ margin: 0 }}>
                  {facility.current}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="fm-bar">
              <div
                className="fm-bar__fill good"
                style={{ width: `${(facility.level / facility.maxLevel) * 100}%` }}
              />
            </div>

            <p className="fm-hint" style={{ textAlign: 'left', margin: '8px 0 0 0', fontSize: '12px' }}>
              {FACILITY_DESCRIPTIONS[facility.name.toLowerCase()]?.benefit}
            </p>

            {!maxed && (
              <button
                className="fm-btn fm-btn--secondary fm-btn--small"
                style={{ marginTop: '10px' }}
                disabled={!facility.affordable}
                onClick={facility.onUpgrade}
              >
                Upgrade to Level {facility.level + 1} — {costLabel}
              </button>
            )}

            {maxed && (
              <p className="fm-hint" style={{ textAlign: 'left', marginTop: '10px', marginBottom: 0 }}>
                ✓ Fully upgraded
              </p>
            )}
          </div>
        );
      })}

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Training Ground, Medical &amp; Scouting Staff
        </p>
        <p className="fm-club-line">
          These backroom levels are this club&apos;s equivalent of a training ground and medical
          centre: the coach speeds up development, the physio cuts injury time, the scout sharpens
          leads.
        </p>

        {(['coach', 'physio', 'scout'] as const).map((role) => {
          const level = staff[role];
          const cost = STAFF_UPGRADE_COST[level + 1];
          const maxed = level >= STAFF_MAX_LEVEL;
          const labels: Record<string, string> = {
            coach: 'Training Ground (Coach)',
            physio: 'Medical Centre (Physio)',
            scout: 'Scouting Network (Chief Scout)',
          };

          return (
            <div key={role} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p className="fm-label" style={{ margin: 0 }}>
                  {labels[role]}
                </p>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Level {level}/{STAFF_MAX_LEVEL}
                </span>
              </div>

              <div className="fm-bar">
                <div
                  className="fm-bar__fill good"
                  style={{ width: `${(level / STAFF_MAX_LEVEL) * 100}%` }}
                />
              </div>

              {!maxed && (
                <button
                  className="fm-btn fm-btn--secondary fm-btn--small"
                  style={{ marginTop: '6px' }}
                  disabled={(cost ?? 0) > state.budget}
                  onClick={() => onChange(upgradeStaff(state, role))}
                >
                  Upgrade to Level {level + 1} — {cost ? formatMoney(cost) : '—'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Facility Benefits
        </p>
        <ul className="fm-news">
          <li>Upgraded stadium increases matchday gate income by 25%</li>
          <li>Quality coaching staff speeds up player development</li>
          <li>Better physio reduces average injury recovery time</li>
          <li>Experienced scouts find better scouting leads</li>
        </ul>
      </div>
    </>
  );
}

'use client';

import type { GameState } from '@/engine/types';
import {
  getStadiumLevel, upgradeStadium, getStaff, upgradeStaff,
} from '@/engine/seasonProgression';
import { STADIUM_UPGRADE_COST, STAFF_UPGRADE_COST, STAFF_MAX_LEVEL } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { StatTile } from './visuals';

const FACILITY_DESCRIPTIONS: Record<string, { current: string; benefit: string }> = {
  stadium: {
    current: 'Determines matchday gate income. Each level increases capacity by 25%.',
    benefit: 'Gate income increases 25% per level',
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
  ];

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Club Facilities
        </p>
        <p className="fm-club-line">Invest in facilities to improve team performance and income.</p>
      </div>

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
          Backroom Staff Facilities
        </p>
        <p className="fm-club-line">Upgrade coaching staff to improve training quality and player development.</p>

        {(['coach', 'physio', 'scout'] as const).map((role) => {
          const level = staff[role];
          const cost = STAFF_UPGRADE_COST[level + 1];
          const maxed = level >= STAFF_MAX_LEVEL;
          const labels: Record<string, string> = {
            coach: 'Assistant Coach',
            physio: 'Physiotherapist',
            scout: 'Chief Scout',
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

'use client';

import { useState, useMemo } from 'react';
import type { GameState, TrainingFocus } from '@/engine/types';
import { getSquad } from '@/engine/teamManagement';
import { getStaff } from '@/engine/seasonProgression';
import { StatTile } from './visuals';

const TRAINING_TYPES: { id: TrainingFocus; label: string; icon: string; desc: string }[] = [
  { id: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Develop all aspects equally' },
  { id: 'attack', label: 'Attack', icon: '⚽', desc: 'Focus on attacking play' },
  { id: 'defense', label: 'Defense', icon: '🛡️', desc: 'Focus on defensive stability' },
  { id: 'fitness', label: 'Fitness', icon: '💪', desc: 'Improve physical conditioning' },
];

type StaffTab = 'general' | 'attackers' | 'defenders' | 'keepers';

export default function TrainingScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [staffTab, setStaffTab] = useState<StaffTab>('general');
  const squad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);
  const staff = getStaff(state);

  const injuredCount = squad.filter((p) => p.injuryWeeks > 0).length;
  const atRiskCount = squad.filter((p) => p.unhappy).length;

  const displayedSquad = useMemo(() => {
    switch (staffTab) {
      case 'attackers':
        return squad.filter((p) => p.pos === 'FWD');
      case 'defenders':
        return squad.filter((p) => p.pos === 'DEF');
      case 'keepers':
        return squad.filter((p) => p.pos === 'GK');
      default:
        return squad.slice(0, 10);
    }
  }, [squad, staffTab]);

  const bestPlayers = displayedSquad.sort((a, b) => b.rating - a.rating).slice(0, 5);
  const worstPlayers = displayedSquad.sort((a, b) => a.rating - b.rating).slice(0, 3);

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          This Week's Training Focus
        </p>
        <p className="fm-club-line" style={{ marginBottom: '12px' }}>
          Current: <strong>{state.training.toUpperCase()}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {TRAINING_TYPES.map((t) => (
            <button
              key={t.id}
              className={`fm-pill${state.training === t.id ? ' active' : ''}`}
              onClick={() => onChange({ ...state, training: t.id })}
              style={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Squad Overview
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <StatTile icon="👥" value={squad.length} label="Total Players" />
          <StatTile icon="🏥" value={injuredCount} label="Injured" />
          <StatTile icon="⚠️" value={atRiskCount} label="At Risk" />
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Backroom Staff
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
          <div style={{ background: 'var(--panel-2)', padding: '10px', borderRadius: 'var(--r-md)' }}>
            <p className="fm-label" style={{ marginTop: 0 }}>Coach</p>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '700' }}>Level {staff.coach}/3</p>
          </div>
          <div style={{ background: 'var(--panel-2)', padding: '10px', borderRadius: 'var(--r-md)' }}>
            <p className="fm-label" style={{ marginTop: 0 }}>Physio</p>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '700' }}>Level {staff.physio}/3</p>
          </div>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Squad Performance
        </p>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto' }}>
          {(['general', 'attackers', 'defenders', 'keepers'] as const).map((t) => (
            <button
              key={t}
              className={`fm-pill${staffTab === t ? ' active' : ''}`}
              onClick={() => setStaffTab(t)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {t === 'general' ? 'All' : t === 'attackers' ? 'Forwards' : t === 'defenders' ? 'Defenders' : 'Keepers'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-soft)' }}>
          <p className="fm-label" style={{ marginTop: 0, marginBottom: '6px' }}>
            Top Performers
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {bestPlayers.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  background: 'var(--panel-2)',
                  borderRadius: 'var(--r-md)',
                  fontSize: '12px',
                }}
              >
                <span>
                  {i + 1}. {p.name}
                </span>
                <span style={{ fontWeight: '700', color: 'var(--green)' }}>{p.rating}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="fm-label" style={{ marginTop: 0, marginBottom: '6px' }}>
            Players Needing Support
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {worstPlayers.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  background: 'var(--panel-2)',
                  borderRadius: 'var(--r-md)',
                  fontSize: '12px',
                }}
              >
                <span>{p.name}</span>
                <span style={{ fontWeight: '700', color: 'var(--red)' }}>{p.rating}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Training Tips
        </p>
        <ul className="fm-news">
          <li>Balanced training develops all player attributes evenly</li>
          <li>Attack focus improves shooting and dribbling skills</li>
          <li>Defense focus improves defensive awareness</li>
          <li>Fitness focus builds stamina and physical attributes</li>
          <li>Better coaching staff speeds up player development</li>
          <li>Injured players recover faster with quality physio</li>
        </ul>
      </div>
    </>
  );
}

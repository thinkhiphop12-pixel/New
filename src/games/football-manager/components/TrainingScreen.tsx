'use client';

import { useMemo, useState } from 'react';
import type { GameState, Player, TrainingFocus } from '@/engine/types';
import { getSquad } from '@/engine/teamManagement';
import { getStaff, upgradeStaff } from '@/engine/seasonProgression';
import { STAFF_MAX_LEVEL, STAFF_UPGRADE_COST } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { StatTile } from './visuals';

const TRAINING_TYPES: { id: TrainingFocus; label: string; icon: string; desc: string }[] = [
  { id: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Develop all aspects equally' },
  { id: 'attack', label: 'Attack', icon: '⚽', desc: 'Focus on attacking play (MID/FWD)' },
  { id: 'defense', label: 'Defense', icon: '🛡️', desc: 'Focus on defensive stability (GK/DEF)' },
  { id: 'fitness', label: 'Fitness', icon: '💪', desc: 'Faster injury recovery, no growth focus' },
];
// Prose moved to `title` tooltips only — the pills' icon + label plus the
// intensity donut already carry the same information.

/** Presentational emphasis breakdown for the currently-selected training focus.
 *  This is a pure function of `state.training`, not simulated per-week history
 *  (the engine only tracks a single weekly focus, not per-attribute intensity). */
const INTENSITY_WEIGHTS: Record<TrainingFocus, { label: string; value: number; color: string }[]> = {
  balanced: [
    { label: 'Attack', value: 25, color: 'var(--red)' },
    { label: 'Defense', value: 25, color: 'var(--blue)' },
    { label: 'Passing', value: 25, color: 'var(--green)' },
    { label: 'Recovery', value: 25, color: 'var(--gold)' },
  ],
  attack: [
    { label: 'Attack', value: 50, color: 'var(--red)' },
    { label: 'Defense', value: 10, color: 'var(--blue)' },
    { label: 'Passing', value: 25, color: 'var(--green)' },
    { label: 'Recovery', value: 15, color: 'var(--gold)' },
  ],
  defense: [
    { label: 'Attack', value: 10, color: 'var(--red)' },
    { label: 'Defense', value: 50, color: 'var(--blue)' },
    { label: 'Passing', value: 20, color: 'var(--green)' },
    { label: 'Recovery', value: 20, color: 'var(--gold)' },
  ],
  fitness: [
    { label: 'Attack', value: 10, color: 'var(--red)' },
    { label: 'Defense', value: 10, color: 'var(--blue)' },
    { label: 'Passing', value: 15, color: 'var(--green)' },
    { label: 'Recovery', value: 65, color: 'var(--gold)' },
  ],
};

function IntensityDonut({ focus }: { focus: TrainingFocus }) {
  const slices = INTENSITY_WEIGHTS[focus];
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 15.9155; // circumference ≈ 100 with this radius, so % maps directly to dasharray
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 40 40" width={120} height={120} role="img" aria-label="Training intensity breakdown">
        <circle cx="20" cy="20" r={r} fill="transparent" stroke="var(--panel-2)" strokeWidth="6" />
        {slices.map((s, i) => {
          const pct = (s.value / total) * 100;
          const dash = `${pct} ${100 - pct}`;
          const el = (
            <circle
              key={i}
              cx="20"
              cy="20"
              r={r}
              fill="transparent"
              stroke={s.color}
              strokeWidth="6"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 20 20)"
            />
          );
          offset += pct;
          return el;
        })}
        <text x="20" y="20" textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="var(--text)" fontWeight={800}>
          8wk
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {slices.map((s) => (
          <span key={s.label} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
            {s.label} — {s.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

type StaffTab = 'general' | 'attackers' | 'defenders' | 'goalkeepers';

const STAFF_TAB_LABEL: Record<StaffTab, string> = {
  general: 'General',
  attackers: 'Attackers',
  defenders: 'Defenders',
  goalkeepers: 'Goalkeepers',
};

function playerRow(p: Player, tone: 'good' | 'bad') {
  return (
    <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`}>
      <span className="fm-player-row__badge">{p.role}</span>
      <span className="fm-player-row__name">
        {p.name}
        <span className="fm-player-row__sub">
          {p.pos} · {p.age}y
        </span>
      </span>
      <span />
      <span
        className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}
        style={tone === 'bad' ? { background: 'var(--red-soft)', color: 'var(--red)' } : undefined}
      >
        {p.rating}
      </span>
    </div>
  );
}

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
  // "At risk" here means squad-happiness risk (a real engine flag: players
  // stuck out of the XI who are growing unhappy and attracting transfer
  // interest) — not a fabricated injury-risk model.
  const atRiskCount = squad.filter((p) => p.unhappy).length;

  const displayedSquad = useMemo(() => {
    switch (staffTab) {
      case 'attackers':
        return squad.filter((p) => p.pos === 'FWD');
      case 'defenders':
        return squad.filter((p) => p.pos === 'DEF');
      case 'goalkeepers':
        return squad.filter((p) => p.pos === 'GK');
      default:
        return squad;
    }
  }, [squad, staffTab]);

  const [squadView, setSquadView] = useState<'best' | 'worst'>('best');
  const bestPlayers = [...displayedSquad].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const worstPlayers = [...displayedSquad].sort((a, b) => a.rating - b.rating).slice(0, 5);
  const shownPlayers = squadView === 'best' ? bestPlayers : worstPlayers;

  return (
    <>
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">Focus: {state.training}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {TRAINING_TYPES.map((t) => (
            <button
              key={t.id}
              className={`fm-pill${state.training === t.id ? ' active' : ''}`}
              onClick={() => onChange({ ...state, training: t.id })}
              style={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              title={t.desc}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fm-mod">
        <div className="fm-mod__head"><h2 className="fm-mod__title">8-week intensity</h2></div>
        <IntensityDonut focus={state.training} />
      </div>

      <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatTile icon="👥" value={squad.length} label="Total squad" />
        <StatTile icon="🏥" value={injuredCount} label="Injured" />
        <StatTile icon="⚠️" value={atRiskCount} label="Unhappy" />
      </div>

      <div className="fm-mod">
        <div className="fm-mod__head"><h2 className="fm-mod__title">Staff</h2></div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto' }}>
          {(Object.keys(STAFF_TAB_LABEL) as StaffTab[]).map((t) => (
            <button
              key={t}
              className={`fm-pill${staffTab === t ? ' active' : ''}`}
              onClick={() => setStaffTab(t)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {STAFF_TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['coach', 'physio'] as const).map((role) => {
            const level = staff[role];
            const cost = STAFF_UPGRADE_COST[level + 1];
            const maxed = level >= STAFF_MAX_LEVEL;
            const label = role === 'coach' ? 'Assistant coach' : 'Physio';
            return (
              <div key={role} style={{ background: 'var(--panel-2)', padding: 10, borderRadius: 'var(--r-md)' }}>
                <p className="fm-label" style={{ marginTop: 0 }} title="Serves the whole squad — no separate per-position coaches.">
                  {label}
                </p>
                <p style={{ margin: '4px 0 8px', fontSize: 14, fontWeight: 700 }}>
                  Level {level}/{STAFF_MAX_LEVEL}
                </p>
                {maxed ? (
                  <p className="fm-hint" style={{ textAlign: 'left', margin: 0 }}>
                    ✓ Fully upgraded
                  </p>
                ) : (
                  <button
                    className="fm-btn fm-btn--secondary fm-btn--small"
                    disabled={cost > state.budget}
                    onClick={() => onChange(upgradeStaff(state, role))}
                  >
                    Upgrade — {formatMoney(cost)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">{STAFF_TAB_LABEL[staffTab]}</h2>
          <span className="fm-actiondock__spacer" />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`fm-pill${squadView === 'best' ? ' active' : ''}`} onClick={() => setSquadView('best')}>Best</button>
            <button className={`fm-pill${squadView === 'worst' ? ' active' : ''}`} onClick={() => setSquadView('worst')}>Needs work</button>
          </div>
        </div>
        {shownPlayers.length === 0 ? (
          <p className="fm-hint">No players in this group.</p>
        ) : (
          <div className="fm-player-list">{shownPlayers.map((p) => playerRow(p, squadView === 'worst' ? 'bad' : 'good'))}</div>
        )}
      </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import type { Coach, GameState } from '@/engine/types';
import { fireCoach, hireCoach, newFacilities } from '@/engine/facilities';
import { staffWageBill } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';
import { Icon } from './Icon';
import StaffProfileModal from './StaffProfileModal';
import { Pulse, toneFor } from './SectionHub';

const ROLES: { id: Coach['role']; label: string; blurb: string }[] = [
  { id: 'attack', label: 'Attack Coach', blurb: 'Speeds development for forwards and attacking midfielders.' },
  { id: 'midfield', label: 'Midfield Coach', blurb: 'Speeds development for central midfielders.' },
  { id: 'defense', label: 'Defense Coach', blurb: 'Speeds development for defenders.' },
  { id: 'goalkeeping', label: 'Goalkeeping Coach', blurb: 'Speeds development for goalkeepers.' },
  { id: 'fitness', label: 'Fitness Coach', blurb: 'Faster fitness recovery, softer overtraining injury risk.' },
  { id: 'analyst', label: 'Performance Analyst', blurb: 'More sharpness gained per Weekly Schedule training day.' },
  { id: 'head', label: 'Head Coach', blurb: 'Overall tactical drilling speed (legacy backroom level).' },
];

/**
 * Backroom Staff hub: hire named coaches into every role the club can carry,
 * paid out of the same wage bill the rest of the finances model reads
 * (`staffWageBill`). Positional coaches speed up development for their
 * position group (engine/seasonProgression.ts training tick); the fitness and
 * analyst coaches hook into the Weekly Schedule mechanic
 * (engine/schedule.ts). Reuses the existing Coach model and hire/fire calls
 * from engine/facilities.ts — no parallel staff system.
 */
export default function StaffHubScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [profileCoachId, setProfileCoachId] = useState<number | null>(null);
  const fs = state.facilities ?? newFacilities(state);
  if (!state.facilities) onChange({ ...state, facilities: fs });

  const wageBill = staffWageBill(state);
  const hired = ROLES.map((r) => fs.coaches.find((c) => c.role === r.id)).filter(Boolean) as Coach[];
  const filled = hired.length;
  const avgQuality = filled ? Math.round(hired.reduce((n, c) => n + c.quality, 0) / filled) : 0;

  return (
    <>
      <Pulse
        items={[
          { icon: 'staff', label: 'Roles filled', value: `${filled}/${ROLES.length}`, tone: toneFor(filled, 2, ROLES.length - 1), meter: filled / ROLES.length },
          { icon: 'money-out', label: 'Wage bill', value: `${formatMoney(wageBill)}/wk` },
          { icon: 'star', label: 'Avg quality', value: filled ? String(avgQuality) : '—', tone: filled ? toneFor(avgQuality, 45, 70) : 'plain' },
          { icon: 'target', label: 'Open roles', value: String(ROLES.length - filled), tone: filled === ROLES.length ? 'green' : 'gold' },
        ]}
      />

      <div className="fm-panel">
        {ROLES.map((role) => {
          const coach = fs.coaches.find((c) => c.role === role.id);
          return (
            <div key={role.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <span className="fm-label" style={{ margin: 0 }}>{role.label}</span>
                  <p className="fm-hint" style={{ margin: '2px 0 0' }}>{role.blurb}</p>
                </div>
                {coach ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="fm-btn fm-btn--ghost fm-btn--small"
                      onClick={() => setProfileCoachId(coach.id)}
                    >
                      <Icon name="staff" size={12} /> {coach.name} · Q{coach.quality} · {formatMoney(coach.wage)}/wk
                    </button>
                    <button
                      className="fm-btn fm-btn--ghost fm-btn--small"
                      onClick={() => onChange(fireCoach({ ...state, facilities: fs }, coach.id))}
                    >
                      Release
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[40, 60, 80].map((q) => (
                      <button
                        key={q}
                        className="fm-btn fm-btn--secondary fm-btn--small"
                        onClick={() => onChange(hireCoach({ ...state, facilities: fs }, role.id, q))}
                      >
                        Hire (Q{q})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

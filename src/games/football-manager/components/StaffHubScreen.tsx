'use client';

import { useEffect, useState } from 'react';
import type { Coach, GameState } from '@/engine/types';
import { fireCoach, hireCoach, newFacilities } from '@/engine/facilities';
import {
  COACH_ROLE_LABEL, approvalFor, coachWageFor, consumeApproval, cooldownWeeksLeft,
  requestStaffSanction,
} from '@/engine/boardRequests';
import { staffWageBill } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';
import { Icon, type IconName } from './Icon';
import StaffProfileModal from './StaffProfileModal';
import { Pulse, toneFor } from './SectionHub';

/**
 * Backroom staff.
 *
 * The old screen was eight stacked rows, each carrying a sentence of
 * explanation and three identical `Hire (Q40) / Hire (Q60) / Hire (Q80)`
 * buttons — twenty-four buttons and eight paragraphs on one screen, with
 * nothing to distinguish any of them and no reason attached to picking a
 * number. Hiring was free of consequence: you bought whoever you liked with
 * club money and nobody ever said no.
 *
 * Now every appointment goes through the board (engine/boardRequests.ts).
 * You ask for a role, the chairman answers with a quality he'll fund or a
 * reason he won't, and you make one appointment against that sanction. The
 * card that used to carry a paragraph carries the chairman's answer instead
 * — the only text on the screen that changes anything.
 */

type RoleDef = { id: Coach['role']; effect: string; icon: IconName };

/** Three or four words each. What the coach *does*, not a description of the
 *  system he plugs into. */
const ROLES: RoleDef[] = [
  { id: 'assistant', effect: 'Advises on training & the academy', icon: 'mic' },
  { id: 'attack', effect: 'Develops forwards', icon: 'attack' },
  { id: 'midfield', effect: 'Develops midfielders', icon: 'balanced' },
  { id: 'defense', effect: 'Develops defenders', icon: 'defense' },
  { id: 'goalkeeping', effect: 'Develops keepers', icon: 'net' },
  { id: 'fitness', effect: 'Faster recovery, fewer strains', icon: 'fitness' },
  { id: 'analyst', effect: 'More sharpness per session', icon: 'stat' },
  { id: 'head', effect: 'Faster tactical drilling', icon: 'tactics' },
];

function qualityTone(q: number): string {
  return q >= 75 ? 'var(--green)' : q >= 50 ? 'var(--gold)' : 'var(--muted)';
}

export default function StaffHubScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [profileCoachId, setProfileCoachId] = useState<number | null>(null);
  const fs = state.facilities ?? newFacilities(state);
  // Same lazy-init-after-render fix as ScoutingScreen — an onChange during
  // render triggers a React setState warning for any save predating facilities.
  useEffect(() => {
    if (!state.facilities) onChange({ ...state, facilities: fs });
  }, [state, fs, onChange]);

  const wageBill = staffWageBill(state);
  const hired = ROLES.map((r) => fs.coaches.find((c) => c.role === r.id)).filter(Boolean) as Coach[];
  const filled = hired.length;
  const avgQuality = filled ? Math.round(hired.reduce((n, c) => n + c.quality, 0) / filled) : 0;
  const sanctioned = ROLES.filter((r) => approvalFor(state, 'staff', r.id)).length;

  const appoint = (role: Coach['role'], quality: number) => {
    const withCoach = hireCoach({ ...state, facilities: fs }, role, quality);
    onChange(consumeApproval(withCoach, 'staff', role));
  };

  return (
    <>
      <Pulse
        items={[
          { icon: 'staff', label: 'Appointed', value: `${filled}/${ROLES.length}`, tone: toneFor(filled, 2, ROLES.length - 1), meter: filled / ROLES.length },
          { icon: 'money-out', label: 'Wage bill', value: `${formatMoney(wageBill)}/wk` },
          { icon: 'star', label: 'Avg quality', value: filled ? String(avgQuality) : '—', tone: filled ? toneFor(avgQuality, 45, 70) : 'plain' },
          { icon: 'check', label: 'Sanctioned', value: String(sanctioned), tone: sanctioned > 0 ? 'green' : 'plain' },
        ]}
      />

      <div className="fm-staffgrid" data-tour="staff-grid">
        {ROLES.map((role) => {
          const coach = fs.coaches.find((c) => c.role === role.id);
          const approval = approvalFor(state, 'staff', role.id);
          const blocked = cooldownWeeksLeft(state, 'staff', role.id);
          const label = COACH_ROLE_LABEL[role.id];

          return (
            <div
              key={role.id}
              className={`fm-staffcard${coach ? ' is-filled' : ''}`}
              /* The onboarding tour points here by name — it is the one
                 appointment a new manager is walked through. */
              data-tour={role.id === 'assistant' ? 'staff-assistant' : undefined}
            >
              <span className="fm-staffcard__icon">
                <Icon name={role.icon} size={18} />
              </span>
              <div className="fm-staffcard__head">
                <span className="fm-staffcard__role">{label}</span>
                <span className="fm-staffcard__effect">{role.effect}</span>
              </div>

              {coach ? (
                <>
                  <button
                    type="button"
                    className="fm-staffcard__person"
                    onClick={() => setProfileCoachId(coach.id)}
                  >
                    <span className="fm-staffcard__name">{coach.name}</span>
                    <span className="fm-staffcard__meta">
                      <b style={{ color: qualityTone(coach.quality) }}>Q{coach.quality}</b>
                      {' · '}{formatMoney(coach.wage)}/wk
                    </span>
                  </button>
                  <button
                    type="button"
                    className="fm-btn fm-btn--ghost fm-btn--small fm-staffcard__action"
                    onClick={() => onChange(fireCoach({ ...state, facilities: fs }, coach.id))}
                  >
                    Release
                  </button>
                </>
              ) : approval ? (
                <>
                  <p className="fm-staffcard__quote">&ldquo;{approval.reason}&rdquo;</p>
                  <button
                    type="button"
                    className="fm-btn fm-btn--primary fm-btn--small fm-staffcard__action"
                    onClick={() => appoint(role.id, approval.tier ?? 40)}
                  >
                    Appoint Q{approval.tier} — {formatMoney(coachWageFor(approval.tier ?? 40))}/wk
                  </button>
                </>
              ) : blocked > 0 ? (
                <>
                  <p className="fm-staffcard__quote fm-staffcard__quote--cold">
                    The board turned this down. They&rsquo;ll hear it again in {blocked} week{blocked === 1 ? '' : 's'}.
                  </p>
                  <button type="button" className="fm-btn fm-btn--ghost fm-btn--small fm-staffcard__action" disabled>
                    Refused
                  </button>
                </>
              ) : (
                <>
                  <p className="fm-staffcard__quote fm-staffcard__quote--empty">Vacant.</p>
                  <button
                    type="button"
                    className="fm-btn fm-btn--secondary fm-btn--small fm-staffcard__action"
                    onClick={() => onChange(requestStaffSanction(state, role.id))}
                  >
                    <Icon name="target" size={12} /> Ask the board
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="fm-hint">
        Every appointment needs board approval first. A confident board funds a better coach; one that has
        already signed off on spending this season, or is watching the club lose money, funds less.
      </p>

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

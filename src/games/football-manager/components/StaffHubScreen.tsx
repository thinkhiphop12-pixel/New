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
import { QualityRating, qualityGrade } from './visuals';
import AssistantLine from './assistant/AssistantLine';
import CoachPortrait from './assistant/CoachPortrait';

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
  { id: 'assistant', effect: 'Tells you what needs doing', icon: 'mic' },
  { id: 'attack', effect: 'Makes your strikers better', icon: 'attack' },
  { id: 'midfield', effect: 'Makes your midfielders better', icon: 'balanced' },
  { id: 'defense', effect: 'Makes your defenders better', icon: 'defense' },
  { id: 'goalkeeping', effect: 'Makes your keepers better', icon: 'net' },
  { id: 'fitness', effect: 'Fewer injuries, quicker recovery', icon: 'fitness' },
  { id: 'analyst', effect: 'Training sessions count for more', icon: 'stat' },
  { id: 'head', effect: 'Players learn tactics quicker', icon: 'tactics' },
];

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
          { icon: 'staff', label: 'Coaches you have', value: `${filled} of ${ROLES.length}`, tone: toneFor(filled, 2, ROLES.length - 1), meter: filled / ROLES.length },
          { icon: 'money-out', label: 'They cost', value: `${formatMoney(wageBill)} a week` },
          { icon: 'star', label: 'How good they are', value: filled ? qualityGrade(avgQuality).word : 'No coaches yet', tone: filled ? toneFor(avgQuality, 45, 70) : 'plain' },
          { icon: 'check', label: 'Ready to hire', value: sanctioned > 0 ? `${sanctioned} ${sanctioned === 1 ? 'job' : 'jobs'}` : 'None', tone: sanctioned > 0 ? 'green' : 'plain' },
        ]}
      />

      {/* --- How this screen works --------------------------------------
          This was a paragraph at the bottom of the screen explaining board
          sanction in one long sentence, below eight cards nobody could use
          until they'd read it. It is two steps, so it is two numbered steps,
          and they go above the thing they explain. */}
      <div className="fm-steps">
        <p className="fm-steps__lead">
          Coaches make your players better. You need two steps to get one:
        </p>
        <ol className="fm-steps__list">
          <li>
            <span className="fm-steps__num">1</span>
            <span>
              <b>Ask the board.</b>{' '}
              They say yes or no, and if it&rsquo;s yes they tell you how good a coach they&rsquo;ll pay for.
            </span>
          </li>
          <li>
            <span className="fm-steps__num">2</span>
            <span>
              <b>Hire your coach.</b>{' '}
              One coach per job. A happy board pays for a better one.
            </span>
          </li>
        </ol>
      </div>

      <AssistantLine state={state} route="staff" />

      <div className="fm-staffgrid">
        {ROLES.map((role) => {
          const coach = fs.coaches.find((c) => c.role === role.id);
          const approval = approvalFor(state, 'staff', role.id);
          const blocked = cooldownWeeksLeft(state, 'staff', role.id);
          const label = COACH_ROLE_LABEL[role.id];

          // Eight vacant cards look identical and nothing says which to do
          // first. The assistant is the one that pays off immediately — he's
          // the voice on every screen — so on an empty backroom he's marked
          // as the place to start, and the mark disappears once you've hired
          // anyone at all.
          const startHere = role.id === 'assistant' && filled === 0;

          return (
            <div
              key={role.id}
              className={`fm-staffcard${coach ? ' is-filled' : ''}${approval ? ' is-ready' : ''}${startHere ? ' is-start' : ''}`}
            >
              <span className="fm-staffcard__icon">
                <Icon name={role.icon} size={18} />
              </span>
              <div className="fm-staffcard__head">
                <span className="fm-staffcard__role">
                  {label}
                  {startHere && <span className="fm-staffcard__flag">Start here</span>}
                  {approval && <span className="fm-staffcard__flag fm-staffcard__flag--go">Board said yes</span>}
                </span>
                <span className="fm-staffcard__effect">{role.effect}</span>
              </div>

              {coach ? (
                <>
                  {/* A hired coach is a person on the card, not a name and a
                      wage. Same procedural portrait the Assistant panel uses,
                      so it costs no art and stays stable across saves. */}
                  <button
                    type="button"
                    className="fm-staffcard__person"
                    onClick={() => setProfileCoachId(coach.id)}
                  >
                    <CoachPortrait coachId={coach.id} size={40} />
                    <span className="fm-staffcard__id">
                      <span className="fm-staffcard__name">{coach.name}</span>
                      <span className="fm-staffcard__meta">
                        <QualityRating quality={coach.quality} />
                        <span className="fm-staffcard__wage">{formatMoney(coach.wage)}/wk</span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="fm-btn fm-btn--ghost fm-btn--small fm-staffcard__action"
                    onClick={() => onChange(fireCoach({ ...state, facilities: fs }, coach.id))}
                  >
                    Let him go
                  </button>
                </>
              ) : approval ? (
                <>
                  <p className="fm-staffcard__quote">
                    <span className="fm-staffcard__who">The board says</span>
                    &ldquo;{approval.reason}&rdquo;
                  </p>
                  <button
                    type="button"
                    className="fm-btn fm-btn--primary fm-btn--small fm-staffcard__action"
                    onClick={() => appoint(role.id, approval.tier ?? 40)}
                  >
                    <Icon name="check" size={12} /> Step 2 — hire a {qualityGrade(approval.tier ?? 40).word.toLowerCase()} coach
                    <span className="fm-staffcard__price">{formatMoney(coachWageFor(approval.tier ?? 40))}/wk</span>
                  </button>
                </>
              ) : blocked > 0 ? (
                <>
                  <p className="fm-staffcard__quote fm-staffcard__quote--cold">
                    <span className="fm-staffcard__who">The board says</span>
                    &ldquo;No.&rdquo; You can ask again in {blocked} week{blocked === 1 ? '' : 's'}.
                  </p>
                  <button type="button" className="fm-btn fm-btn--ghost fm-btn--small fm-staffcard__action" disabled>
                    Waiting
                  </button>
                </>
              ) : (
                <>
                  <p className="fm-staffcard__quote fm-staffcard__quote--empty">Nobody in this job.</p>
                  <button
                    type="button"
                    className="fm-btn fm-btn--secondary fm-btn--small fm-staffcard__action"
                    onClick={() => onChange(requestStaffSanction(state, role.id))}
                  >
                    <Icon name="target" size={12} /> Step 1 — ask the board
                  </button>
                </>
              )}
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

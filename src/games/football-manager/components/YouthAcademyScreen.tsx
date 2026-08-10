'use client';

import { useState } from 'react';
import type { AcademyTrialist, GameState, Player } from '@/engine/types';
import { getIntake, getYouthSquad, promoteYouthPlayer, releaseTrialist, signTrialist } from '@/engine/youthAcademy';
import { getAssistant } from '@/engine/assistant';
import { MAX_SQUAD_SIZE } from '@/engine/gameRules';
import { Icon } from './Icon';
import PlayerModal from './PlayerModal';
import { Pulse, toneFor } from './SectionHub';

/**
 * The academy.
 *
 * Two things live here, in the order they matter. **This year's intake** is
 * a decision with a deadline: six or seven kids reported for pre-season and
 * every one of them is either signed or released. **The youth squad** is
 * everyone you kept, waiting to be promoted.
 *
 * The old screen had only the second half, because the first half didn't
 * exist — the engine simply handed you one or two finished prospects each
 * summer with their exact potential printed beside their name. There was
 * nothing to weigh and nothing to get wrong.
 *
 * Potential is now shown as a *range*, not a number, and the assistant
 * manager's verdict sits next to it. Both get more reliable as the academy's
 * reputation and the assistant's own quality go up, which is what makes
 * investing in either worth doing.
 */

function Stars({ n }: { n: number }) {
  return (
    <span className="fm-stars" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" size={12} className={i < n ? 'fm-stars__on' : 'fm-stars__off'} />
      ))}
    </span>
  );
}

const VERDICT_LABEL: Record<AcademyTrialist['verdict'], string> = {
  sign: 'Sign him',
  maybe: 'Your call',
  pass: 'Let him go',
};

export default function YouthAcademyScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [detailId, setDetailId] = useState<number | null>(null);

  const club = state.clubs.find((c) => c.id === state.userClubId);
  const intake = getIntake(state);
  const youth = getYouthSquad(state, state.userClubId).sort((a, b) => b.potential - a.potential);
  const detail: Player | undefined = detailId != null ? state.players[detailId] : undefined;
  const firstTeamSize = club?.playerIds.length ?? 0;
  const squadFull = firstTeamSize >= MAX_SQUAD_SIZE;

  const academyRep = state.facilities?.academyReputation ?? 20;
  const assistant = getAssistant(state);

  return (
    <>
      <Pulse
        items={[
          { icon: 'document', label: 'On trial', value: String(intake.length), tone: intake.length ? 'gold' : 'plain' },
          { icon: 'sprout', label: 'Youth squad', value: String(youth.length), tone: youth.length ? 'green' : 'plain' },
          { icon: 'star', label: 'Reputation', value: `${academyRep}/100`, tone: toneFor(academyRep, 25, 60), meter: academyRep / 100 },
          { icon: 'squad', label: 'First team', value: `${firstTeamSize}/${MAX_SQUAD_SIZE}`, tone: squadFull ? 'red' : 'plain' },
        ]}
      />

      {/* --- This year's class ------------------------------------------ */}
      {intake.length > 0 && (
        <div className="fm-mod">
          <div className="fm-mod__head">
            <h2 className="fm-mod__title">This year&rsquo;s intake</h2>
            <span className="fm-actiondock__spacer" />
            <span className="fm-hint" style={{ margin: 0 }}>
              {assistant ? `${assistant.name}'s report` : 'No assistant manager — these reads are rough'}
            </span>
          </div>

          <div className="fm-intakegrid" data-tour="academy-intake">
            {intake.map(({ trialist: t, player: p }) => (
              <div key={p.id} className={`fm-trialist fm-trialist--${t.verdict}`}>
                <button type="button" className="fm-trialist__id" onClick={() => setDetailId(p.id)}>
                  <span>
                    <span className="fm-trialist__name">{p.name}</span>
                    <span className="fm-trialist__meta">{p.role} · {p.age}y · {p.rating} now</span>
                  </span>
                </button>

                <div className="fm-trialist__read">
                  <Stars n={t.stars} />
                  <span className="fm-trialist__band">
                    Predicted ceiling {t.potentialLow}–{t.potentialHigh}
                  </span>
                </div>

                <p className="fm-trialist__quote">&ldquo;{t.note}&rdquo;</p>
                <span className={`fm-trialist__verdict fm-trialist__verdict--${t.verdict}`}>
                  {VERDICT_LABEL[t.verdict]}
                </span>

                <div className="fm-trialist__actions">
                  <button
                    type="button"
                    className="fm-btn fm-btn--primary fm-btn--small"
                    onClick={() => onChange(signTrialist(state, p.id))}
                  >
                    Sign
                  </button>
                  <button
                    type="button"
                    className="fm-btn fm-btn--ghost fm-btn--small"
                    onClick={() => onChange(releaseTrialist(state, p.id))}
                  >
                    Release
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="fm-hint">
            The band is a prediction, not a promise — a better academy and a better assistant narrow it.
            Anyone left undecided when next season&rsquo;s class arrives leaves the club.
          </p>
        </div>
      )}

      {/* --- Everyone you kept ------------------------------------------ */}
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">Youth squad</h2>
          {squadFull && (
            <>
              <span className="fm-actiondock__spacer" />
              <span className="fm-hint" style={{ margin: 0, color: 'var(--red)' }}>
                <Icon name="warning" size={12} /> First team full
              </span>
            </>
          )}
        </div>
        <div className="fm-player-list">
          {youth.length === 0 && (
            <p className="fm-hint">
              {intake.length > 0
                ? 'Nobody signed yet — start with the class above.'
                : 'Empty. The next intake reports in pre-season.'}
            </p>
          )}
          {youth.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`fm-player-row fm-pos-${p.pos}`}
              onClick={() => setDetailId(detailId === p.id ? null : p.id)}
            >
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">{p.age}y · ceiling {p.potential}</span>
              </span>
              <span className="fm-player-row__rating">{p.rating}</span>
              <span
                className="fm-btn fm-btn--secondary fm-btn--small"
                style={{ marginLeft: 8, opacity: squadFull ? 0.5 : 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!squadFull) onChange(promoteYouthPlayer(state, p.id));
                }}
              >
                Promote
              </span>
            </button>
          ))}
        </div>
      </div>

      {detail && (
        <PlayerModal
          state={state}
          player={detail}
          club={state.clubs.find((c) => c.id === detail.clubId)}
          onChange={onChange}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}

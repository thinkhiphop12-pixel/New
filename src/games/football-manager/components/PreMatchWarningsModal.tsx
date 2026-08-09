'use client';

import { useState, type CSSProperties } from 'react';
import type { PreMatchCheck, PreMatchWarning } from '@/engine/preMatch';
import type { GameState } from '@/engine/types';
import { Icon, type IconName } from './Icon';

const KIND_ICON: Record<PreMatchWarning['kind'], IconName> = {
  tactics: 'tactics',
  unavailable: 'injury',
  fitness: 'warning',
};

/**
 * FM21-style pre-kickoff gate. `engine/preMatch.ts` has already resolved
 * everything it can resolve on its own — a broken lineup gets the default
 * formation, a suspended or injured starter gets auto-subbed — this modal's
 * job is to show the manager what happened before it becomes fact, and to
 * hand over the one decision that actually is a decision: whether to risk a
 * fatigued player.
 *
 * Fitness warnings are interactive (bench inline, right here — no need to
 * leave for Squad/Tactics and lose the flow); tactics/unavailable warnings
 * are informational, since there's nothing left to choose about them.
 */
export default function PreMatchWarningsModal({
  state,
  check,
  onConfirm,
  onOpenLineup,
  onCancel,
}: {
  state: GameState;
  check: PreMatchCheck;
  /** Kick off with this lineup/formation and this set of risked players. */
  onConfirm: (lineup: (number | null)[], formationId: string, riskyIds: number[]) => void;
  /** Bail out to fix the XI by hand instead. */
  onOpenLineup: () => void;
  onCancel: () => void;
}) {
  // Local copy so benching a fatigued player from inside the modal doesn't
  // need a round trip through GameState — it only matters if the manager
  // goes on to confirm.
  const [lineup, setLineup] = useState(check.lineup);
  const [risky, setRisky] = useState(new Set(check.riskyIds));

  const benchRisky = (playerId: number) => {
    const out = state.players[playerId];
    const taken = new Set(lineup.filter((id): id is number => id !== null));
    const userClub = state.clubs.find((c) => c.id === state.userClubId);
    if (!userClub) return;
    const bench = userClub.playerIds
      .map((id) => state.players[id])
      .filter((p): p is NonNullable<typeof p> => !!p && !taken.has(p.id) && p.injuryWeeks === 0 && !(p.suspendedMatches ?? 0))
      .sort((a, b) => b.rating * b.form - a.rating * a.form);
    const like = bench.filter((p) => p.pos === out?.pos);
    const sub = (like.length ? like : bench)[0];
    if (!sub) return; // nobody to bring on — leave him in, still risky
    setLineup((cur) => cur.map((id) => (id === playerId ? sub.id : id)));
    setRisky((cur) => {
      const next = new Set(cur);
      next.delete(playerId);
      return next;
    });
  };

  const tacticsWarnings = check.warnings.filter((w) => w.kind === 'tactics');
  const unavailableWarnings = check.warnings.filter((w) => w.kind === 'unavailable');
  const fitnessWarnings = check.warnings.filter((w) => w.kind === 'fitness');

  return (
    <div className="fm-matchx-modal" onClick={onCancel}>
      <div className="fm-matchx-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="fm-matchx-modal__head">
          <span className="fm-matchx-modal__title">Before you kick off</span>
          <button className="fm-matchx-modal__close" onClick={onCancel} aria-label="Close">
            <Icon name="cross" size={15} />
          </button>
        </div>

        <div className="fm-prematch-list">
          {[...tacticsWarnings, ...unavailableWarnings].map((w, i) => (
            <div key={`fixed-${i}`} className="fm-prematch-row">
              <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': 'var(--gold)' } as CSSProperties}>
                <Icon name={KIND_ICON[w.kind]} size={15} />
              </span>
              <div className="fm-prematch-row__body">
                <span className="fm-prematch-row__title">{w.title}</span>
                <span className="fm-prematch-row__detail">{w.detail}</span>
              </div>
            </div>
          ))}

          {fitnessWarnings.map((w, i) => {
            const stillRisky = w.playerId !== undefined && risky.has(w.playerId);
            return (
              <div key={`fit-${i}`} className="fm-prematch-row">
                <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': 'var(--red)' } as CSSProperties}>
                  <Icon name="warning" size={15} />
                </span>
                <div className="fm-prematch-row__body">
                  <span className="fm-prematch-row__title">{w.title}</span>
                  <span className="fm-prematch-row__detail">
                    {stillRisky ? w.detail : 'Benched for this match — a fresh player takes his place.'}
                  </span>
                </div>
                {stillRisky && w.playerId !== undefined && (
                  <button
                    type="button"
                    className="fm-btn fm-btn--ghost fm-btn--small"
                    onClick={() => {
                      if (w.playerId !== undefined) benchRisky(w.playerId);
                    }}
                  >
                    Substitute
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="fm-actions" style={{ marginTop: 4 }}>
          <button type="button" className="fm-btn fm-btn--ghost" onClick={onOpenLineup}>
            Edit lineup
          </button>
          <button
            type="button"
            className="fm-btn fm-btn--primary"
            onClick={() => onConfirm(lineup, check.formationId, [...risky])}
          >
            <Icon name="play" size={14} /> Confirm — kick off
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, type CSSProperties } from 'react';
import type { PreMatchCheck, PreMatchWarning } from '@/engine/preMatch';
import type { GameState } from '@/engine/types';
import { getFormation } from '@/engine/gameRules';
import { Icon, type IconName } from './Icon';

const KIND_ICON: Record<PreMatchWarning['kind'], IconName> = {
  tactics: 'tactics',
  unavailable: 'injury',
  fitness: 'warning',
};

const MENTALITY_LABEL: Record<string, string> = {
  'ultra-defensive': 'Ultra defensive',
  defensive: 'Defensive',
  balanced: 'Balanced',
  attacking: 'Attacking',
  'ultra-attacking': 'Ultra attacking',
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
    const bench = state.clubs
      .find((c) => c.id === state.userClubId)!
      .playerIds
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

        {/* Nothing wrong with the XI still deserves a beat. This gate used to
            open only when something needed fixing, so a manager with a valid
            side went from "proceed to match" straight into kickoff and was
            never once asked about his tactics — the shape and the mentality
            he is sending out were decided several screens ago and never put
            in front of him. The team sheet is that question. */}
        {check.warnings.length === 0 && (
          <div className="fm-teamsheet">
            <p className="fm-teamsheet__lead">This is the side you&rsquo;re sending out.</p>
            <div className="fm-teamsheet__meta">
              <span className="fm-teamsheet__stat">
                <span className="fm-teamsheet__stat-label">Formation</span>
                <span className="fm-teamsheet__stat-value">{getFormation(check.formationId).name}</span>
              </span>
              <span className="fm-teamsheet__stat">
                <span className="fm-teamsheet__stat-label">Mentality</span>
                <span className="fm-teamsheet__stat-value">
                  {MENTALITY_LABEL[state.tactics?.mentality ?? 'balanced'] ?? 'Balanced'}
                </span>
              </span>
            </div>
            <ol className="fm-teamsheet__xi">
              {lineup.map((id, i) => {
                const p = id === null ? null : state.players[id];
                const slot = getFormation(check.formationId).slots[i];
                return (
                  <li key={i} className="fm-teamsheet__player">
                    <span className="fm-teamsheet__pos">{slot?.pos ?? ''}</span>
                    <span className="fm-teamsheet__name">{p?.name ?? '—'}</span>
                    <span className="fm-teamsheet__rating">{p?.rating ?? ''}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

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
                    onClick={() => benchRisky(w.playerId!)}
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
            <Icon name="tactics" size={14} /> Change tactics
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

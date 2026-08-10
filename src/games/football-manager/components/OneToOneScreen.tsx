'use client';

import { useState } from 'react';
import type { GameState, Player, Position } from '@/engine/types';
import { getSquad, isOnLoan } from '@/engine/teamManagement';
import { ONE_TO_ONE_SLOTS, SLOT_LABEL, getOneToOne, oneToOneRate, setOneToOne } from '@/engine/training';
import { DRILLS_PER_WEEK } from '@/engine/development';
import { Icon, type IconName } from './Icon';
import TrainingDrillModal from './TrainingDrillModal';
import { Pulse } from './SectionHub';

/**
 * One-to-one training.
 *
 * Four individual sessions a week, one per position group. A booked player
 * gets guaranteed progress toward his ceiling every week he keeps the slot
 * (`Player.oneToOneXp`, engine/training.ts) rather than the squad-wide coin
 * flip the old single training focus rolled for everyone at once — which
 * meant a manager could pick "Attack" for a season and never see a single
 * player visibly improve because of it.
 *
 * The bookings persist week to week, so this is a screen you set once and
 * revisit when somebody plateaus, not a weekly chore.
 */

const SLOT_ICON: Record<Position, IconName> = {
  GK: 'net',
  DEF: 'defense',
  MID: 'balanced',
  FWD: 'attack',
};

/** Weeks of individual work before this player's next attribute point. */
function weeksToNext(state: GameState, p: Player): number | null {
  const rate = oneToOneRate(state, p);
  if (rate <= 0) return null;
  return Math.max(1, Math.ceil((1 - (p.oneToOneXp ?? 0)) / rate));
}

export default function OneToOneScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [pickingSlot, setPickingSlot] = useState<Position | null>(null);
  const [drillPlayer, setDrillPlayer] = useState<Player | null>(null);

  const squad = getSquad(state, state.userClubId);
  const booked = getOneToOne(state);
  const filled = ONE_TO_ONE_SLOTS.filter((pos) => booked[pos] != null).length;
  const drillsLeft = DRILLS_PER_WEEK - (state.drillsUsedThisWeek ?? 0);

  // How much raw development the current four bookings buy per week — the
  // one number that says whether this screen is being used well.
  const weeklyYield = ONE_TO_ONE_SLOTS.reduce((sum, pos) => {
    const id = booked[pos];
    const p = id != null ? state.players[id] : undefined;
    return sum + (p ? oneToOneRate(state, p) : 0);
  }, 0);

  const candidates = (pos: Position) =>
    squad
      .filter((p) => p.pos === pos && !isOnLoan(p))
      .sort((a, b) => oneToOneRate(state, b) - oneToOneRate(state, a));

  return (
    <>
      <Pulse
        items={[
          { icon: 'person', label: 'Slots used', value: `${filled}/4`, tone: filled === 4 ? 'green' : filled > 0 ? 'gold' : 'red', meter: filled / 4 },
          { icon: 'trend', label: 'Growth/wk', value: weeklyYield > 0 ? `${(weeklyYield * 100).toFixed(0)}%` : '—', tone: weeklyYield > 1.2 ? 'green' : weeklyYield > 0 ? 'gold' : 'red' },
          { icon: 'training', label: 'Manual drills', value: `${drillsLeft} left`, tone: drillsLeft > 0 ? 'plain' : 'gold' },
        ]}
      />

      <div className="fm-slotgrid" data-tour="o2o-slots">
        {ONE_TO_ONE_SLOTS.map((pos) => {
          const id = booked[pos];
          const p = id != null ? state.players[id] : undefined;
          const weeks = p ? weeksToNext(state, p) : null;
          const progress = p ? (p.oneToOneXp ?? 0) : 0;

          return (
            <div key={pos} className={`fm-o2o${p ? ' is-booked' : ''}`}>
              <div className="fm-o2o__head">
                <span className="fm-o2o__icon"><Icon name={SLOT_ICON[pos]} size={16} /></span>
                <span className="fm-o2o__slot">{SLOT_LABEL[pos]}</span>
              </div>

              {p ? (
                <>
                  <div className="fm-o2o__player">
                    <div>
                      <span className="fm-o2o__name">{p.name}</span>
                      <span className="fm-o2o__meta">
                        {p.age}y · {p.rating} OVR · ceiling {p.potential}
                      </span>
                    </div>
                  </div>

                  <div className="fm-o2o__track" aria-label="Progress to next attribute point">
                    <div className="fm-o2o__fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
                  </div>
                  <p className="fm-o2o__note">
                    {p.injuryWeeks > 0
                      ? `Injured — no sessions for ${p.injuryWeeks} week${p.injuryWeeks === 1 ? '' : 's'}.`
                      : weeks == null
                        ? 'At his ceiling. Sharpness only.'
                        : `Next improvement in about ${weeks} week${weeks === 1 ? '' : 's'}.`}
                  </p>

                  <div className="fm-o2o__actions">
                    <button
                      type="button"
                      className="fm-btn fm-btn--ghost fm-btn--small"
                      onClick={() => setPickingSlot(pos)}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className="fm-btn fm-btn--secondary fm-btn--small"
                      disabled={drillsLeft <= 0 || p.injuryWeeks > 0}
                      onClick={() => setDrillPlayer(p)}
                      title={drillsLeft <= 0 ? 'No manual drills left this week' : 'Take the session yourself'}
                    >
                      Run session
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="fm-o2o__note fm-o2o__note--empty">
                    Nobody booked. A wasted session every week.
                  </p>
                  <button
                    type="button"
                    className="fm-btn fm-btn--primary fm-btn--small"
                    onClick={() => setPickingSlot(pos)}
                  >
                    Pick a {SLOT_LABEL[pos].toLowerCase()}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="fm-hint">
        Sessions run every week until you change them. Young players a long way short of their ceiling
        improve fastest, and a position coach on the staff speeds the whole group up.
      </p>

      {pickingSlot && (
        <div className="fm-modal-backdrop" onClick={() => setPickingSlot(null)}>
          <div
            className="fm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Choose a ${SLOT_LABEL[pickingSlot].toLowerCase()}`}
            style={{ maxWidth: 460 }}
          >
            <div className="fm-modal__header">
              <h2 style={{ margin: 0, fontSize: 16 }}>{SLOT_LABEL[pickingSlot]} — individual sessions</h2>
            </div>
            <div className="fm-player-list" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              {candidates(pickingSlot).length === 0 && (
                <p className="fm-hint">Nobody available in this position group.</p>
              )}
              {candidates(pickingSlot).map((p) => {
                const weeks = weeksToNext(state, p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`fm-player-row fm-pos-${p.pos}${booked[pickingSlot] === p.id ? ' is-active' : ''}`}
                    onClick={() => {
                      onChange(setOneToOne(state, pickingSlot, p.id));
                      setPickingSlot(null);
                    }}
                  >
                    <span className="fm-player-row__name">
                      {p.name}
                      <span className="fm-player-row__sub">
                        {p.age}y · ceiling {p.potential} · {weeks == null ? 'no headroom' : `+1 in ~${weeks}w`}
                      </span>
                    </span>
                    <span className="fm-player-row__rating">{p.rating}</span>
                  </button>
                );
              })}
            </div>
            <div className="fm-actions" style={{ marginBottom: 0, justifyContent: 'space-between' }}>
              <button
                type="button"
                className="fm-btn fm-btn--ghost fm-btn--small"
                onClick={() => {
                  onChange(setOneToOne(state, pickingSlot, null));
                  setPickingSlot(null);
                }}
              >
                Leave empty
              </button>
              <button type="button" className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => setPickingSlot(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {drillPlayer && (
        <TrainingDrillModal
          state={state}
          player={drillPlayer}
          onChange={onChange}
          onClose={() => setDrillPlayer(null)}
        />
      )}
    </>
  );
}

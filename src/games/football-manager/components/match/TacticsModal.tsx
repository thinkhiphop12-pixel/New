'use client';

import { useState } from 'react';
import type { Player } from '@/engine/types';
import { ALL_FORMATIONS, getFormation } from '@/engine/gameRules';
import { MENTALITIES, MENTALITY_ORDER, type MentalityId } from '@/engine/tickEngine/tacticsData';

export interface TacticsSelection {
  formationId: string;
  mentality: MentalityId;
  lineup: (number | null)[];
}

/**
 * In-match (and pre-match) tactics editor: mentality presets, the full
 * formation grid, and a positions mini-pitch with tap-to-swap player tokens.
 */
export default function TacticsModal({
  formationId,
  mentality,
  lineup,
  players,
  ratings,
  onApply,
  onClose,
}: {
  formationId: string;
  mentality: MentalityId;
  lineup: (number | null)[];
  players: Record<number, Player>;
  /** Live match ratings (in-match only). */
  ratings?: Record<number, number>;
  onApply: (sel: TacticsSelection) => void;
  onClose: () => void;
}) {
  const [selFormation, setSelFormation] = useState(formationId);
  const [selMentality, setSelMentality] = useState<MentalityId>(mentality);
  const [selLineup, setSelLineup] = useState<(number | null)[]>([...lineup]);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);

  const formation = getFormation(selFormation);

  const tapSlot = (i: number) => {
    if (swapFrom === null) {
      setSwapFrom(i);
      return;
    }
    if (swapFrom !== i) {
      setSelLineup((cur) => {
        const next = [...cur];
        [next[swapFrom], next[i]] = [next[i], next[swapFrom]];
        return next;
      });
    }
    setSwapFrom(null);
  };

  const ratingClass = (r: number) => (r >= 7.5 ? ' good' : r < 6 ? ' poor' : '');

  return (
    <div className="fm-matchx-modal" onClick={onClose}>
      <div className="fm-matchx-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="fm-matchx-modal__head">
          <span className="fm-matchx-modal__title">Tactics</span>
          <button className="fm-matchx-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="fm-label">Mentality</p>
        <div className="fm-mentality-row">
          {MENTALITY_ORDER.map((m) => (
            <button
              key={m}
              className={`fm-mentality-card${selMentality === m ? ' active' : ''}`}
              onClick={() => setSelMentality(m)}
            >
              {MENTALITIES[m].short}
            </button>
          ))}
        </div>

        <p className="fm-label">Formation</p>
        <div className="fm-formation-grid">
          {ALL_FORMATIONS.map((f) => (
            <button
              key={f.id}
              className={`fm-formation-tile${selFormation === f.id ? ' active' : ''}`}
              onClick={() => setSelFormation(f.id)}
            >
              {f.id}
            </button>
          ))}
        </div>

        <p className="fm-label">Positions — tap a player, then another to swap</p>
        <div className="fm-mini-pitch">
          {formation.slots.map((slot, i) => {
            const id = selLineup[i];
            const p = id !== null && id !== undefined ? players[id] : null;
            const r = p && ratings ? ratings[p.id] : undefined;
            return (
              <button
                key={i}
                className={`fm-mini-slot${swapFrom === i ? ' selected' : ''}`}
                style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                onClick={() => tapSlot(i)}
              >
                <span className="fm-mini-slot__token">{slot.label}</span>
                <span className="fm-mini-slot__name">
                  {p ? p.name.split(' ').slice(-1)[0] : '—'}
                  {r !== undefined && <em className={`fm-mini-slot__rating${ratingClass(r)}`}> {r.toFixed(1)}</em>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="fm-actions">
          <button
            className="fm-btn fm-btn--primary"
            onClick={() => onApply({ formationId: selFormation, mentality: selMentality, lineup: selLineup })}
          >
            Apply
          </button>
          <button className="fm-btn fm-btn--ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

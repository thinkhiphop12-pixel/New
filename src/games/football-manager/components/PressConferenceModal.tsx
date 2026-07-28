'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { respondPress, type PressResult, type PressTone } from '@/engine/seasonProgression';
import Modal from './Modal';

const OPTIONS: { tone: PressTone; label: string; hint: string }[] = [
  { tone: 'confident', label: 'We can get a result', hint: 'Lifts squad morale, fans respond well.' },
  { tone: 'cautious', label: 'Respect the opposition', hint: 'Low risk — the board likes a measured tone.' },
  { tone: 'bullish', label: 'We should win this', hint: 'Big morale and fan boost — the board expects you to deliver.' },
];

export default function PressConferenceModal({
  state,
  opponentName,
  onChange,
  onClose,
}: {
  state: GameState;
  opponentName: string;
  onChange: (next: GameState) => void;
  onClose: () => void;
}) {
  const [result, setResult] = useState<PressResult | null>(null);

  const pick = (tone: PressTone) => {
    const { state: next, result: r } = respondPress(state, tone, opponentName);
    onChange(next);
    setResult(r);
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy="fm-press-title"
      className="fm-matchx-modal"
      panelClassName="fm-matchx-modal__panel fm-matchx-modal__panel--narrow"
    >
        <div className="fm-matchx-modal__head">
          <span className="fm-matchx-modal__title" id="fm-press-title">Press Conference</span>
          <button className="fm-matchx-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {!result ? (
          <>
            <p className="fm-hint" style={{ textAlign: 'left', marginTop: 0 }}>
              &quot;Ahead of the visit of {opponentName}, how are you feeling about this one, boss?&quot;
            </p>
            <div className="fm-press-options">
              {OPTIONS.map((o) => (
                <button key={o.tone} className="fm-press-option" onClick={() => pick(o.tone)}>
                  <span className="fm-press-option__label">{o.label}</span>
                  <span className="fm-press-option__hint">{o.hint}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="fm-press-quote">{result.quote}</p>
            <p className="fm-hint" style={{ textAlign: 'left' }}>{result.reaction}</p>
            <div className="fm-actions">
              <button className="fm-btn fm-btn--primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
    </Modal>
  );
}

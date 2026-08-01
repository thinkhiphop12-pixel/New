'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import type { GameState } from '@/engine/types';
import { respondPress, type PressResult, type PressTone } from '@/engine/seasonProgression';
import ManagerAvatar from './ManagerAvatar';

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
    <div className="fm-matchx-modal" onClick={onClose}>
      <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="fm-matchx-modal__head">
          <span className="fm-matchx-modal__title">Press Conference</span>
          <button className="fm-matchx-modal__close" onClick={onClose} aria-label="Close"><Icon name="cross" size={15} /></button>
        </div>
        {!result ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {state.managerProfile && (
                <ManagerAvatar
                  config={state.managerProfile.avatarConfig}
                  size={36}
                  title={state.managerProfile.name}
                  style={{ borderRadius: '50%', flexShrink: 0 }}
                />
              )}
              <p className="fm-hint" style={{ textAlign: 'left', marginTop: 0, marginBottom: 0 }}>
                &quot;Ahead of the visit of {opponentName}, how are you feeling about this one, boss?&quot;
              </p>
            </div>
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
      </div>
    </div>
  );
}

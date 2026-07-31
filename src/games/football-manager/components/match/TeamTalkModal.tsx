'use client';

import { useState } from 'react';
import { Icon } from '../Icon';
import { teamTalkEffect, type TeamTalkOutcome, type TeamTalkTone } from '@/engine/teamTalk';

const OPTIONS: { tone: TeamTalkTone; label: string; hint: string }[] = [
  { tone: 'encourage', label: 'Encourage them', hint: 'Reliable lift — a vote of confidence.' },
  { tone: 'calm', label: 'Stay calm', hint: 'Low risk, low reward — steady as she goes.' },
  { tone: 'demand', label: 'Demand more', hint: 'Big swing if you need it — risky if you’re already on top.' },
];

export default function TeamTalkModal({
  moment,
  scoreDiff,
  onApply,
  onClose,
}: {
  moment: 'pre' | 'ht';
  scoreDiff: number;
  onApply: (outcome: TeamTalkOutcome) => void;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<TeamTalkOutcome | null>(null);

  const pick = (tone: TeamTalkTone) => {
    const result = teamTalkEffect(tone, scoreDiff);
    setOutcome(result);
    onApply(result);
  };

  return (
    <div className="fm-matchx-modal" onClick={onClose}>
      <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="fm-matchx-modal__head">
          <span className="fm-matchx-modal__title">{moment === 'pre' ? 'Pre-Match Talk' : 'Half-Time Talk'}</span>
          <button className="fm-matchx-modal__close" onClick={onClose} aria-label="Close"><Icon name="cross" size={15} /></button>
        </div>
        {!outcome ? (
          <>
            <p className="fm-hint" style={{ textAlign: 'left', marginTop: 0 }}>
              The dressing room waits — how do you address the players?
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
            <p className="fm-press-quote">{outcome.quote}</p>
            <p className="fm-hint" style={{ textAlign: 'left' }}>{outcome.reaction}</p>
            <div className="fm-actions">
              <button className="fm-btn fm-btn--primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import type { ScenarioId } from '@/engine/types';
import { SCENARIOS } from '@/engine/scenarios';

export default function ScenarioPickScreen({
  onPick,
  onSkip,
  onBack,
}: {
  onPick: (id: ScenarioId) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <div className="fm-scenario-pick">
      <p className="fm-label" style={{ marginTop: 0, textAlign: 'center' }}>Starting Challenge</p>
      <p className="fm-hint" style={{ textAlign: 'center', marginBottom: 14 }}>
        Optional — pick a scripted premise to build a career around, or start a normal career.
      </p>
      <div className="fm-scenario-grid">
        {SCENARIOS.map((s) => (
          <button key={s.id} className="fm-scenario-card" onClick={() => onPick(s.id)}>
            <span className="fm-scenario-card__icon">{s.icon}</span>
            <span className="fm-scenario-card__name">{s.name}</span>
            <span className="fm-scenario-card__tagline">{s.tagline}</span>
          </button>
        ))}
      </div>
      <div className="fm-scenario-pick__actions">
        <button className="fm-btn fm-btn--ghost" onClick={onBack}>Back</button>
        <button className="fm-btn fm-btn--primary" onClick={onSkip}>Play Normally</button>
      </div>
    </div>
  );
}

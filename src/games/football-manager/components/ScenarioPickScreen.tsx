'use client';

import type { ScenarioId } from '@/engine/types';
import { SCENARIOS } from '@/engine/scenarios';
import { Icon, type IconName } from './Icon';

// Scenario data stays UI-agnostic (plain semantic keys, no dependency on this
// component's icon set) — this map is the only place that couples the two.
const SCENARIO_ICON: Record<string, IconName> = {
  warning: 'warning',
  movie: 'movie',
  'money-out': 'money-out',
  'money-in': 'money-in',
  sprout: 'sprout',
  trophy: 'trophy',
  block: 'block',
};

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
      <p className="fm-label" style={{ marginTop: 0, textAlign: 'center', marginBottom: 14 }}>Starting Challenge</p>
      <div className="fm-scenario-grid">
        {SCENARIOS.map((s) => (
          <button key={s.id} className="fm-scenario-card" onClick={() => onPick(s.id)}>
            <span className="fm-scenario-card__icon"><Icon name={SCENARIO_ICON[s.icon] ?? 'target'} size={22} /></span>
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

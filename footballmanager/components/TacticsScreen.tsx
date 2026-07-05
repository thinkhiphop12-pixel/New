'use client';

import { useState } from 'react';
import type { GameState, Pressing, TacticStyle, Tempo, Width } from '@/engine/types';
import { FORMATIONS, getFormation } from '@/engine/gameRules';
import { autoPickLineup } from '@/engine/teamManagement';

export default function TacticsScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [expandedSection, setExpandedSection] = useState<string>('formations');

  const update = (patch: Partial<GameState>) => onChange({ ...state, ...patch });

  // Get current formations (legacy or dual)
  const currentIPFormation = state.dualFormation?.inPossessionId || state.formationId;
  const currentOOPFormation = state.dualFormation?.outOfPossessionId || state.formationId;

  const setIPFormation = (id: string) => {
    const f = getFormation(id);
    // Only update lineup if we're switching from legacy to dual mode
    const newLineup = state.dualFormation ? state.lineup : autoPickLineup(state, state.userClubId, f);
    update({
      dualFormation: { ...state.dualFormation, inPossessionId: id },
      lineup: newLineup,
      formationId: id, // legacy
    });
  };

  const setOOPFormation = (id: string) => {
    update({
      dualFormation: { ...state.dualFormation, outOfPossessionId: id },
    });
  };

  const setStyle = (style: TacticStyle) => {
    update({ tactics: { ...state.tactics, style } });
  };

  const setPressing = (pressing: Pressing) => {
    update({ tactics: { ...state.tactics, pressing } });
  };

  const setTempo = (tempo: Tempo) => {
    update({ tactics: { ...state.tactics, tempo } });
  };

  const setWidth = (width: Width) => {
    update({ tactics: { ...state.tactics, width } });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  return (
    <div className="fm-panel fm-tactics">
      {/* Dual Formations Section */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('formations')}
          aria-expanded={expandedSection === 'formations'}
        >
          <span className="fm-tactics__title">Formations</span>
          <span className="fm-tactics__indicator">{expandedSection === 'formations' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'formations' && (
          <div className="fm-tactics__content">
            <div className="fm-tactics__formation-group">
              <label className="fm-label fm-label--sm">In Possession</label>
              <div className="fm-pills fm-pills--mobile">
                {FORMATIONS.map((f) => (
                  <button
                    key={f.id}
                    className={`fm-pill${currentIPFormation === f.id ? ' active' : ''}`}
                    onClick={() => setIPFormation(f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="fm-tactics__formation-group">
              <label className="fm-label fm-label--sm">Out of Possession</label>
              <div className="fm-pills fm-pills--mobile">
                {FORMATIONS.map((f) => (
                  <button
                    key={f.id}
                    className={`fm-pill${currentOOPFormation === f.id ? ' active' : ''}`}
                    onClick={() => setOOPFormation(f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <p className="fm-hint">Switch when defending to adjust shape and positioning.</p>
            </div>
          </div>
        )}
      </div>

      {/* Style Section */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('style')}
          aria-expanded={expandedSection === 'style'}
        >
          <span className="fm-tactics__title">Play Style</span>
          <span className="fm-tactics__indicator">{expandedSection === 'style' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'style' && (
          <div className="fm-tactics__content">
            <div className="fm-pills">
              {(['defensive', 'balanced', 'attacking'] as TacticStyle[]).map((s) => (
                <button
                  key={s}
                  className={`fm-pill${state.tactics.style === s ? ' active' : ''}`}
                  onClick={() => setStyle(s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pressing Section */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('pressing')}
          aria-expanded={expandedSection === 'pressing'}
        >
          <span className="fm-tactics__title">Pressing</span>
          <span className="fm-tactics__indicator">{expandedSection === 'pressing' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'pressing' && (
          <div className="fm-tactics__content">
            <div className="fm-pills">
              {(['low', 'mid', 'high'] as Pressing[]).map((p) => (
                <button
                  key={p}
                  className={`fm-pill${state.tactics.pressing === p ? ' active' : ''}`}
                  onClick={() => setPressing(p)}
                >
                  {p === 'low' ? 'Low block' : p === 'mid' ? 'Standard' : 'High press'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tempo Section */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('tempo')}
          aria-expanded={expandedSection === 'tempo'}
        >
          <span className="fm-tactics__title">Tempo</span>
          <span className="fm-tactics__indicator">{expandedSection === 'tempo' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'tempo' && (
          <div className="fm-tactics__content">
            <div className="fm-pills">
              {(['slow', 'normal', 'fast'] as Tempo[]).map((t) => (
                <button
                  key={t}
                  className={`fm-pill${state.tactics.tempo === t ? ' active' : ''}`}
                  onClick={() => setTempo(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Width Section */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('width')}
          aria-expanded={expandedSection === 'width'}
        >
          <span className="fm-tactics__title">Width</span>
          <span className="fm-tactics__indicator">{expandedSection === 'width' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'width' && (
          <div className="fm-tactics__content">
            <div className="fm-pills">
              {(['narrow', 'standard', 'wide'] as Width[]).map((w) => (
                <button
                  key={w}
                  className={`fm-pill${state.tactics.width === w ? ' active' : ''}`}
                  onClick={() => setWidth(w)}
                >
                  {w[0].toUpperCase() + w.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

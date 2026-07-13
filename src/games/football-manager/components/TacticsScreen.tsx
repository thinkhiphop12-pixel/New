'use client';

import { useState } from 'react';
import type { GameState, Pressing, TacticStyle, Tempo, Width } from '@/engine/types';
import { ALL_FORMATIONS, getFormation } from '@/engine/gameRules';
import { autoPickLineup } from '@/engine/teamManagement';
import { MENTALITIES, MENTALITY_ORDER, normalizeMentality, type MentalityId } from '@/engine/tickEngine/tacticsData';
import { PitchMarkings, PlayerToken } from './visuals';

export default function TacticsScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [expandedSection, setExpandedSection] = useState<string>('formations');
  const [previewShape, setPreviewShape] = useState<'ip' | 'oop'>('ip');

  const update = (patch: Partial<GameState>) => onChange({ ...state, ...patch });

  // Get current formations (legacy or dual)
  const currentIPFormation = state.dualFormation?.inPossessionId || state.formationId;
  const currentOOPFormation = state.dualFormation?.outOfPossessionId || state.formationId;

  const setIPFormation = (id: string) => {
    const f = getFormation(id);
    // Only update lineup if we're switching from legacy to dual mode
    const newLineup = state.dualFormation ? state.lineup : autoPickLineup(state, state.userClubId, f);
    update({
      dualFormation: {
        inPossessionId: id,
        outOfPossessionId: state.dualFormation?.outOfPossessionId || id,
      },
      lineup: newLineup,
      formationId: id, // legacy
    });
  };

  const setOOPFormation = (id: string) => {
    update({
      dualFormation: {
        inPossessionId: state.dualFormation?.inPossessionId || state.formationId,
        outOfPossessionId: id,
      },
    });
  };

  const setMentality = (mentality: MentalityId) => {
    update({ tactics: { ...state.tactics, mentality } });
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

  const previewFormation = getFormation(previewShape === 'ip' ? currentIPFormation : currentOOPFormation);

  return (
    <div className="fm-panel fm-tactics">
      <div className="fm-pills" style={{ marginBottom: 8 }}>
        <button className={`fm-pill${previewShape === 'ip' ? ' active' : ''}`} onClick={() => setPreviewShape('ip')}>
          In possession
        </button>
        <button className={`fm-pill${previewShape === 'oop' ? ' active' : ''}`} onClick={() => setPreviewShape('oop')}>
          Out of possession
        </button>
      </div>
      <div className="fm-pitch" style={{ marginBottom: 14 }}>
        <PitchMarkings />
        {previewFormation.slots.map((slot, i) => (
          <div key={i} className="fm-slot fm-slot--live filled" style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}>
            <PlayerToken label={slot.label} pos={slot.pos} />
          </div>
        ))}
      </div>

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
              <div className="fm-formation-grid">
                {ALL_FORMATIONS.map((f) => (
                  <button
                    key={f.id}
                    className={`fm-formation-tile${currentIPFormation === f.id ? ' active' : ''}`}
                    onClick={() => setIPFormation(f.id)}
                  >
                    {f.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="fm-tactics__formation-group">
              <label className="fm-label fm-label--sm">Out of Possession</label>
              <div className="fm-formation-grid">
                {ALL_FORMATIONS.map((f) => (
                  <button
                    key={f.id}
                    className={`fm-formation-tile${currentOOPFormation === f.id ? ' active' : ''}`}
                    onClick={() => setOOPFormation(f.id)}
                  >
                    {f.id}
                  </button>
                ))}
              </div>
              <p className="fm-hint">Used only while defending.</p>
            </div>
          </div>
        )}
      </div>

      {/* Mentality Section */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('mentality')}
          aria-expanded={expandedSection === 'mentality'}
        >
          <span className="fm-tactics__title">Mentality</span>
          <span className="fm-tactics__indicator">{expandedSection === 'mentality' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'mentality' && (
          <div className="fm-tactics__content">
            <div className="fm-mentality-row">
              {MENTALITY_ORDER.map((m) => (
                <button
                  key={m}
                  className={`fm-mentality-card${normalizeMentality(state.tactics.mentality) === m ? ' active' : ''}`}
                  onClick={() => setMentality(m)}
                >
                  {MENTALITIES[m].short}
                </button>
              ))}
            </div>
            <p className="fm-hint">Sets the default match mentality — you can change it live from the touchline.</p>
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

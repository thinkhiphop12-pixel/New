'use client';

import { useState } from 'react';
import type { GameState, PlayStyle, Pressing, TacticStyle, Tempo, Width } from '@/engine/types';
import { ALL_FORMATIONS, getFormation, getLeague } from '@/engine/gameRules';
import { autoPickLineup } from '@/engine/teamManagement';
import {
  coachDrillMult, needsDrilling, projectedFamiliarity, seedFamiliarityForSwitch,
  styleExec, styleFamiliarity, weeksToDrill,
} from '@/engine/familiarity';
import { MENTALITIES, MENTALITY_ORDER, normalizeMentality, type MentalityId } from '@/engine/tickEngine/tacticsData';
import {
  CORNER_ROUTINES, cornerRoutineOf, setPieceTaker, setPieceXG,
  type CornerDefense, type CornerRoutine, type SPJob,
} from '@/engine/setPieces';
import { PitchMarkings, PlayerToken } from './visuals';

const ROUTINE_LABEL: Record<CornerRoutine, string> = {
  'near-post': 'Near Post',
  'far-post': 'Far Post',
  drilled: 'Drilled',
  short: 'Short',
  'edge-of-box': 'Edge of Box',
};

/** The four dead-ball jobs, with the attribute each is judged on — shown next
 *  to every name so the choice can be made without leaving the screen. */
const SP_ROLES: { job: SPJob; label: string; stat: 'pas' | 'sho' }[] = [
  { job: 'penalty', label: 'Penalties', stat: 'sho' },
  { job: 'corner', label: 'Corners', stat: 'pas' },
  { job: 'fkShoot', label: 'Free kicks (shoot)', stat: 'sho' },
  { job: 'fkDeliver', label: 'Free kicks (cross)', stat: 'pas' },
];

const SP_FIELD: Record<SPJob, string> = {
  penalty: 'penalties', corner: 'corners', fkShoot: 'fkShoot', fkDeliver: 'fkDeliver',
};

/** Presentation order: the two no-drill fallbacks first, then the identities
 *  that have to be worked on. */
const IDENTITY_ORDER: PlayStyle[] = [
  'balanced', 'parkbus', 'possession', 'tiki-taka', 'gegenpressing',
  'counter', 'direct', 'longball', 'catenaccio',
];

const IDENTITY_LABEL: Record<PlayStyle, string> = {
  balanced: 'Balanced',
  parkbus: 'Park the Bus',
  possession: 'Possession',
  'tiki-taka': 'Tiki-taka',
  gegenpressing: 'Gegenpressing',
  counter: 'Counter-attack',
  direct: 'Direct',
  longball: 'Long Ball',
  catenaccio: 'Catenaccio',
};

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

  /* --- Team identity ---------------------------------------------------- */
  const userClub = state.clubs.find((c) => c.id === state.userClubId)!;
  const currentStyle: PlayStyle = state.playStyle ?? userClub.playStyle ?? 'balanced';
  const level = getLeague(userClub.leagueId)?.level ?? 3;
  const coachMult = coachDrillMult(state);
  const xi = state.lineup
    .map((id) => (id == null ? null : state.players[id]))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  /* --- Set pieces ------------------------------------------------------- */
  const cornerTaker = setPieceTaker(xi, state.tactics, 'corner');
  const spThreat = setPieceXG(xi, state.tactics);

  const setSetPiece = (patch: Partial<NonNullable<typeof state.tactics.setPieces>>) => {
    update({ tactics: { ...state.tactics, setPieces: { ...state.tactics.setPieces, ...patch } } });
  };

  const setIdentity = (style: PlayStyle) => {
    if (style === currentStyle) return;
    // Carry familiarity across on the switch itself, so the number the card
    // quoted is the number the club actually lands on.
    //
    // tacFam has to be cloned, not spread: seedFamiliarityForSwitch mutates it,
    // and a shallow { ...club } would still share the same styles object with
    // the previous state — editing history rather than producing a new state.
    const clubs = state.clubs.map((c) =>
      c.id === state.userClubId
        ? {
            ...c,
            playStyle: style,
            tacFam: c.tacFam
              ? { ...c.tacFam, styles: { ...c.tacFam.styles }, formations: { ...c.tacFam.formations } }
              : c.tacFam,
          }
        : c,
    );
    const club = clubs.find((c) => c.id === state.userClubId)!;
    seedFamiliarityForSwitch(club, style);
    update({ playStyle: style, clubs });
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

      {/* Set Pieces — routine, defensive scheme and designated takers. */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('setpieces')}
          aria-expanded={expandedSection === 'setpieces'}
        >
          <span className="fm-tactics__title">Set Pieces</span>
          <span className="fm-tactics__indicator">{expandedSection === 'setpieces' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'setpieces' && (
          <div className="fm-tactics__content">
            <div className="fm-sp-label">Corner routine</div>
            <div className="fm-pills">
              {(Object.keys(CORNER_ROUTINES) as CornerRoutine[]).map((r) => (
                <button
                  key={r}
                  className={`fm-pill${cornerRoutineOf(state.tactics) === r ? ' active' : ''}`}
                  onClick={() => setSetPiece({ cornerRoutine: r })}
                >
                  {ROUTINE_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="fm-hint">
              Currently worth <strong>{spThreat.toFixed(2)}×</strong> on a corner — delivery from{' '}
              {cornerTaker?.name ?? 'nobody'} against the aerial threat of the men you send up.
              Short routines ignore height; far-post leans on it entirely.
            </p>

            <div className="fm-sp-label">Defending corners</div>
            <div className="fm-pills">
              {(['zonal', 'mixed', 'man'] as CornerDefense[]).map((d) => (
                <button
                  key={d}
                  className={`fm-pill${(state.tactics.setPieces?.cornerDefense ?? 'mixed') === d ? ' active' : ''}`}
                  onClick={() => setSetPiece({ cornerDefense: d })}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            <p className="fm-hint">
              Zonal concedes least from the delivery itself; man-marking concedes most but leaves
              you better placed for the second ball.
            </p>

            <div className="fm-sp-label">Takers</div>
            <div className="fm-sp-takers">
              {SP_ROLES.map(({ job, label, stat }) => {
                const current = setPieceTaker(xi, state.tactics, job);
                return (
                  <label key={job} className="fm-sp-taker">
                    <span className="fm-sp-taker__role">{label}</span>
                    <select
                      className="fm-sp-taker__select"
                      value={current?.id ?? ''}
                      onChange={(e) => setSetPiece({ [SP_FIELD[job]]: Number(e.target.value) })}
                    >
                      {[...xi]
                        .sort((a, b) => b[stat] - a[stat])
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p[stat]})
                          </option>
                        ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <p className="fm-hint">
              Defaults pick the best man on the pitch for each job. Anyone you name here takes it
              instead, as long as he is in the XI.
            </p>
          </div>
        )}
      </div>

      {/* Team Identity — the named play-style the squad is drilled in. */}
      <div className="fm-tactics__section">
        <button
          className="fm-tactics__header"
          onClick={() => toggleSection('identity')}
          aria-expanded={expandedSection === 'identity'}
        >
          <span className="fm-tactics__title">Team Identity</span>
          <span className="fm-tactics__indicator">{expandedSection === 'identity' ? '−' : '+'}</span>
        </button>

        {expandedSection === 'identity' && (
          <div className="fm-tactics__content">
            <div className="fm-identity-grid">
              {IDENTITY_ORDER.map((id) => {
                const active = currentStyle === id;
                const fam = active
                  ? styleFamiliarity(userClub, id)
                  : projectedFamiliarity(userClub, id);
                const weeks = weeksToDrill(userClub, id, 80, coachMult);
                // How well the squad could execute it if fully drilled — the
                // ability half of the gate, shown separately so a player can
                // tell "wrong squad" apart from "needs more time".
                const fit = Math.round(
                  styleExec(userClub, xi, id, level, undefined, { rawSkill: true }) * 100,
                );
                return (
                  <button
                    key={id}
                    className={`fm-identity-card${active ? ' active' : ''}`}
                    onClick={() => setIdentity(id)}
                  >
                    <span className="fm-identity-card__name">{IDENTITY_LABEL[id]}</span>
                    <span className="fm-identity-card__bar" aria-hidden>
                      <span
                        className="fm-identity-card__fill"
                        style={{ width: `${Math.round(fam)}%` }}
                      />
                    </span>
                    <span className="fm-identity-card__meta">
                      {active
                        ? `${Math.round(fam)}% drilled`
                        : weeks === 0
                          ? 'ready now'
                          : `${Math.round(fam)}% · ${weeks}w to drill`}
                    </span>
                    <span
                      className={`fm-identity-card__fit${fit >= 75 ? ' good' : fit >= 55 ? ' ok' : ' poor'}`}
                    >
                      squad fit {fit}%
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="fm-hint">
              {needsDrilling(currentStyle)
                ? `Your side is ${Math.round(styleFamiliarity(userClub, currentStyle))}% drilled in ${IDENTITY_LABEL[currentStyle]}. Familiarity builds each week and decays on styles you stop using — switching to a related style carries most of the work across.`
                : 'Balanced and Park the Bus need no drilling. Any other identity has to be worked on before it pays off.'}
            </p>
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
          <span className="fm-tactics__title">Approach</span>
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

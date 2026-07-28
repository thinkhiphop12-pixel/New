'use client';

import { useState } from 'react';
import type { GameState, Player, Pressing, TacticStyle, Tempo, TrainingFocus, Width } from '@/engine/types';
import { FORMATIONS, getFormation } from '@/engine/gameRules';
import { autoPickLineup, getSquad, isOnLoan, lineupStrength, setPlayerRole } from '@/engine/teamManagement';
import { getRole } from '@/lib/playerRoles';
import { PitchMarkings, PlayerToken } from './visuals';
import { PlayerFace } from './PlayerFace';
import PlayerModal from './PlayerModal';

function lastName(name: string): string {
  const parts = name.split(' ').filter((w) => !/^jr\.?$/i.test(w));
  return parts[parts.length - 1] ?? name;
}

function formTag(p: Player): React.ReactNode {
  if (isOnLoan(p)) return <span className="cold">On loan</span>;
  if (p.injuryWeeks > 0) return <span className="inj">INJ {p.injuryWeeks}w</span>;
  if (p.unhappy) return <span className="inj">Unhappy</span>;
  if (p.form >= 1.06) return <span className="hot">In form</span>;
  if (p.form <= 0.94) return <span className="cold">Poor form</span>;
  return null;
}

export default function SquadScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [tacticsOpen, setTacticsOpen] = useState(false);
  const formation = getFormation(state.formationId);
  const squad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);
  const strength = lineupStrength(state, state.lineup, formation, state.tactics, state.morale, state.chemistry);

  const update = (patch: Partial<GameState>) => onChange({ ...state, ...patch });

  const setFormation = (id: string) => {
    const f = getFormation(id);
    update({ formationId: id, lineup: autoPickLineup(state, state.userClubId, f) });
    setSelectedSlot(null);
  };

  const assignToSlot = (playerId: number) => {
    if (selectedSlot === null) return;
    const lineup = [...state.lineup];
    const existingIdx = lineup.indexOf(playerId);
    if (existingIdx >= 0) {
      // Player already in the XI — swap the two slots.
      [lineup[existingIdx], lineup[selectedSlot]] = [lineup[selectedSlot], lineup[existingIdx]];
    } else {
      lineup[selectedSlot] = playerId;
    }
    update({ lineup });
    setSelectedSlot(null);
  };

  const slotPlayer = (i: number): Player | null => {
    const id = state.lineup[i];
    return id !== null && id !== undefined ? state.players[id] : null;
  };

  const eligible = (p: Player): boolean => {
    if (selectedSlot === null) return false;
    if (p.injuryWeeks > 0 || isOnLoan(p)) return false;
    const slot = formation.slots[selectedSlot];
    return (p.pos === 'GK') === (slot.pos === 'GK');
  };

  const detail = detailId !== null ? state.players[detailId] : null;

  return (
    <>
      <div className="fm-panel">
        <button
          className="fm-pill active"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => setTacticsOpen((v) => !v)}
        >
          {formation.name} · {state.tactics.style[0].toUpperCase() + state.tactics.style.slice(1)} ·{' '}
          {state.tactics.pressing === 'low' ? 'Low block' : state.tactics.pressing === 'mid' ? 'Standard press' : 'High press'}
          {' '}{tacticsOpen ? '▲' : '▼'}
        </button>
        {tacticsOpen && (
          <>
            <p className="fm-label">Formation</p>
            <div className="fm-pills">
              {FORMATIONS.map((f) => (
                <button
                  key={f.id}
                  className={`fm-pill${state.formationId === f.id ? ' active' : ''}`}
                  onClick={() => setFormation(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <p className="fm-label">Style</p>
            <div className="fm-pills">
              {(['defensive', 'balanced', 'attacking'] as TacticStyle[]).map((s) => (
                <button
                  key={s}
                  className={`fm-pill${state.tactics.style === s ? ' active' : ''}`}
                  onClick={() => update({ tactics: { ...state.tactics, style: s } })}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <p className="fm-label">Pressing</p>
            <div className="fm-pills">
              {(['low', 'mid', 'high'] as Pressing[]).map((p) => (
                <button
                  key={p}
                  className={`fm-pill${state.tactics.pressing === p ? ' active' : ''}`}
                  onClick={() => update({ tactics: { ...state.tactics, pressing: p } })}
                >
                  {p === 'low' ? 'Low block' : p === 'mid' ? 'Standard' : 'High press'}
                </button>
              ))}
            </div>
            <p className="fm-label">Tempo</p>
            <div className="fm-pills">
              {(['slow', 'normal', 'fast'] as Tempo[]).map((t) => (
                <button
                  key={t}
                  className={`fm-pill${state.tactics.tempo === t ? ' active' : ''}`}
                  onClick={() => update({ tactics: { ...state.tactics, tempo: t } })}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <p className="fm-label">Width</p>
            <div className="fm-pills">
              {(['narrow', 'standard', 'wide'] as Width[]).map((w) => (
                <button
                  key={w}
                  className={`fm-pill${state.tactics.width === w ? ' active' : ''}`}
                  onClick={() => update({ tactics: { ...state.tactics, width: w } })}
                >
                  {w[0].toUpperCase() + w.slice(1)}
                </button>
              ))}
            </div>
            <p className="fm-label">Training focus</p>
            <div className="fm-pills">
              {(['balanced', 'attack', 'defense', 'fitness'] as TrainingFocus[]).map((t) => (
                <button
                  key={t}
                  className={`fm-pill${state.training === t ? ' active' : ''}`}
                  onClick={() => update({ training: t })}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="fm-hint" style={{ marginBottom: 0, marginTop: 12 }}>
          Attack {Math.round(strength.attack)} · Midfield {Math.round(strength.midfield)} · Defense{' '}
          {Math.round(strength.defense)} · Chemistry {state.chemistry}
        </p>
      </div>

      <div className="fm-pitch">
        <PitchMarkings />
        {formation.slots.map((slot, i) => {
          const p = slotPlayer(i);
          return (
            <button
              key={i}
              className={`fm-slot${p ? ' filled' : ''}${selectedSlot === i ? ' selected' : ''}`}
              style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
              onClick={() => setSelectedSlot(selectedSlot === i ? null : i)}
            >
              <PlayerToken label={slot.label} rating={p ? p.rating * p.form : undefined} pos={slot.pos} form={p?.form} />
              {p && <span className="fm-slot__name">{lastName(p.name)}</span>}
              {p?.tacticalRole && <span className="fm-slot__role-dot" title={getRole(p.tacticalRole)?.name} />}
            </button>
          );
        })}
      </div>

      <div className="fm-actions">
        <button
          className="fm-btn fm-btn--secondary fm-btn--small"
          onClick={() => {
            update({ lineup: autoPickLineup(state, state.userClubId, formation) });
            setSelectedSlot(null);
          }}
        >
          Auto-pick best XI
        </button>
      </div>

      <p className="fm-hint">
        {selectedSlot !== null ? `Pick a ${formation.slots[selectedSlot].label}.` : 'Tap a slot to change it, tap a player for details.'}
      </p>

      {detail && selectedSlot === null && (
        <PlayerModal
          state={state}
          player={detail}
          club={state.clubs.find((c) => c.id === detail.clubId)}
          onChange={onChange}
          onClose={() => setDetailId(null)}
        />
      )}

      <div className="fm-player-list">
        {squad.map((p) => {
          const inLineup = state.lineup.includes(p.id);
          const canPick = selectedSlot !== null && eligible(p);
          return (
            <button
              key={p.id}
              className={`fm-player-row fm-player-row--faced fm-pos-${p.pos}${canPick ? ' highlight' : ''}${inLineup ? ' in-lineup' : ''}`}
              disabled={selectedSlot !== null && !canPick}
              onClick={() =>
                selectedSlot !== null ? assignToSlot(p.id) : setDetailId(detailId === p.id ? null : p.id)
              }
            >
              <PlayerFace playerId={p.id} size={26} />
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">
                  {p.age}y{inLineup ? ' · XI' : ''}
                  {p.tacticalRole ? ` · ${getRole(p.tacticalRole)?.name}` : ''}
                  {p.contractYears <= 1 ? ' · ⚠ expiring' : ''}
                </span>
              </span>
              <span className="fm-player-row__tag">{formTag(p)}</span>
              <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                {p.rating}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

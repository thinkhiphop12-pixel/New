'use client';

import { useState } from 'react';
import type { GameState, Player, Pressing, TacticStyle } from '@/engine/types';
import { FORMATIONS, getFormation } from '@/engine/gameRules';
import { autoPickLineup, getSquad, lineupStrength } from '@/engine/teamManagement';

function lastName(name: string): string {
  const parts = name.split(' ').filter((w) => !/^jr\.?$/i.test(w));
  return parts[parts.length - 1] ?? name;
}

function formTag(p: Player): React.ReactNode {
  if (p.injuryWeeks > 0) return <span className="inj">INJ {p.injuryWeeks}w</span>;
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
  const formation = getFormation(state.formationId);
  const squad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);
  const strength = lineupStrength(state, state.lineup, formation, state.tactics, state.morale);

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
    if (p.injuryWeeks > 0) return false;
    const slot = formation.slots[selectedSlot];
    return (p.pos === 'GK') === (slot.pos === 'GK');
  };

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Formation
        </p>
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
        <p className="fm-hint" style={{ marginBottom: 0, marginTop: 12 }}>
          Attack {Math.round(strength.attack)} · Midfield {Math.round(strength.midfield)} · Defense{' '}
          {Math.round(strength.defense)}
        </p>
      </div>

      <div className="fm-pitch">
        {formation.slots.map((slot, i) => {
          const p = slotPlayer(i);
          return (
            <button
              key={i}
              className={`fm-slot${p ? ' filled' : ''}${selectedSlot === i ? ' selected' : ''}`}
              style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
              onClick={() => setSelectedSlot(selectedSlot === i ? null : i)}
            >
              <span className="fm-slot__chip">{p ? Math.round(p.rating * p.form) : slot.label}</span>
              <span className="fm-slot__pos">{slot.label}</span>
              {p && <span className="fm-slot__name">{lastName(p.name)}</span>}
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
        {selectedSlot !== null
          ? `Pick a player for the ${formation.slots[selectedSlot].label} slot below.`
          : 'Tap a slot on the pitch, then tap a player to assign them.'}
      </p>

      <div className="fm-player-list">
        {squad.map((p) => {
          const inLineup = state.lineup.includes(p.id);
          const canPick = selectedSlot !== null && eligible(p);
          return (
            <button
              key={p.id}
              className={`fm-player-row fm-pos-${p.pos}${canPick ? ' highlight' : ''}${inLineup ? ' in-lineup' : ''}`}
              disabled={selectedSlot !== null && !canPick}
              onClick={() => (selectedSlot !== null ? assignToSlot(p.id) : undefined)}
            >
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">
                  {p.nat} · {p.age}y{inLineup ? ' · Starting XI' : ''}
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

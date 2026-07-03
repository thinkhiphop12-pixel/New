'use client';

import { useState } from 'react';
import type { GameState, Player, Pressing, TacticStyle, Tempo, TrainingFocus, Width } from '@/engine/types';
import { FORMATIONS, getFormation } from '@/engine/gameRules';
import { autoPickLineup, getSquad, isOnLoan, lineupStrength } from '@/engine/teamManagement';
import { canLoanOut, loanOut, renewContract } from '@/engine/transferMarket';
import { traitNames } from '@/engine/traits';
import { formatMoney } from '@/engine/utils';

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

function avgRating(p: Player): number | null {
  if (!p.seasonRatingCount) return null;
  return Math.round((p.seasonRatingSum! / p.seasonRatingCount) * 10) / 10;
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
        <p className="fm-hint" style={{ marginBottom: 0, marginTop: 12 }}>
          Attack {Math.round(strength.attack)} · Midfield {Math.round(strength.midfield)} · Defense{' '}
          {Math.round(strength.defense)} · Chemistry {state.chemistry}
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
          : 'Tap a slot on the pitch to change the XI, or tap a player for details, contracts and loans.'}
      </p>

      {detail && selectedSlot === null && (
        <div className="fm-panel fm-player-detail">
          <p className="fm-label" style={{ marginTop: 0 }}>
            {detail.name} — {detail.role}, {detail.age}y
          </p>
          <p className="fm-club-line">
            {detail.rating} OVR · value {formatMoney(detail.value)} · {formatMoney(detail.wage)}/w ·{' '}
            {detail.contractYears}y contract · {detail.apps} apps, {detail.goals} goals this season
            {avgRating(detail) !== null ? ` · ${avgRating(detail)} avg rating` : ''}
            {detail.unhappy ? ' · ⚠ unhappy with game time' : ''}
          </p>
          {traitNames(detail).length > 0 && (
            <div className="fm-pills" style={{ marginBottom: 8 }}>
              {traitNames(detail).map((t) => (
                <span key={t} className="fm-trait">
                  {t}
                </span>
              ))}
            </div>
          )}
          {detail.career.length > 0 && (
            <>
              <p className="fm-label">Career history</p>
              <ul className="fm-news">
                {[...detail.career].reverse().slice(0, 6).map((c, i) => (
                  <li key={i}>
                    {c.year}/{(c.year + 1) % 100} {c.club}: {c.apps} apps, {c.goals} goals
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="fm-actions" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
            {detail.contractYears <= 1 && (
              <button
                className="fm-btn fm-btn--primary fm-btn--small"
                disabled={detail.wage * 10 > state.budget}
                onClick={() => onChange(renewContract(state, detail.id))}
              >
                Renew contract ({formatMoney(detail.wage * 10)} bonus)
              </button>
            )}
            {!isOnLoan(detail) && (
              <button
                className="fm-btn fm-btn--secondary fm-btn--small"
                disabled={!canLoanOut(state, detail.id).ok}
                onClick={() => onChange(loanOut(state, detail.id))}
              >
                Loan out for the season
              </button>
            )}
            <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => setDetailId(null)}>
              Close
            </button>
          </div>
          {detail.contractYears <= 1 && (
            <p className="fm-hint" style={{ textAlign: 'left', marginBottom: 0 }}>
              ⚠ Contract expiring — renew or he walks for free at the end of the season.
            </p>
          )}
        </div>
      )}

      <div className="fm-player-list">
        {squad.map((p) => {
          const inLineup = state.lineup.includes(p.id);
          const canPick = selectedSlot !== null && eligible(p);
          return (
            <button
              key={p.id}
              className={`fm-player-row fm-pos-${p.pos}${canPick ? ' highlight' : ''}${inLineup ? ' in-lineup' : ''}`}
              disabled={selectedSlot !== null && !canPick}
              onClick={() =>
                selectedSlot !== null ? assignToSlot(p.id) : setDetailId(detailId === p.id ? null : p.id)
              }
            >
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">
                  {p.nat} · {p.age}y · {p.contractYears}y deal · {formatMoney(p.wage)}/w
                  {inLineup ? ' · Starting XI' : ''}
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

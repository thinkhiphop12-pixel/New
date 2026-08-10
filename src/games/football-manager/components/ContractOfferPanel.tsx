'use client';

import { useState } from 'react';
import type { GameState, Player, SquadStatusKey } from '@/engine/types';
import { formatMoney } from '@/engine/utils';
import { SQUAD_STATUS, STATUS_ORDER } from '@/engine/negotiation';
import {
  MAX_RENEWAL_ROUNDS, abandonRenewalTalks, canOpenTalks, getTalk, renewalDemand,
  submitRenewalOffer, type RenewalOffer, type RenewalResponse,
} from '@/engine/contractTalks';
import { Icon } from './Icon';

/**
 * Contract renegotiation, as an actual negotiation.
 *
 * The old panel was five sliders feeding a hard-coded "Excellent offer —
 * likely to be accepted" string, and *Accept Offer* threw every number away
 * and called the engine's own auto-renewal — the player never saw what was
 * typed and never answered. This panel puts the offer to him for real
 * (engine/contractTalks.ts): he accepts, counters with his own number, or
 * ends the talk outright if the club is beneath him or the offer insults
 * him. A counter reopens the fields at his number so the manager is
 * negotiating against a moving target, not filling in a form once.
 */
export default function ContractOfferPanel({
  state,
  player: p,
  onChange,
  onClose,
}: {
  state: GameState;
  player: Player;
  onChange: (state: GameState) => void;
  onClose: () => void;
}) {
  const opening = canOpenTalks(state, p.id);
  const existingTalk = getTalk(state, p.id);
  const demand = renewalDemand(state, p.id);

  const [wage, setWage] = useState(existingTalk?.wantWage ?? demand.wage);
  const [years, setYears] = useState(existingTalk?.wantYears ?? demand.years);
  const [status, setStatus] = useState<SquadStatusKey | null>(existingTalk?.wantStatus ?? (p.promisedStatus as SquadStatusKey | null) ?? null);
  const [thread, setThread] = useState<{ from: 'club' | 'player'; text: string; verdict?: RenewalResponse['verdict'] }[]>(
    existingTalk ? [{ from: 'player', text: `Last time you spoke, he wanted ${formatMoney(existingTalk.wantWage)}/wk over ${existingTalk.wantYears}y.` }] : [],
  );
  const [ended, setEnded] = useState(false);
  const round = getTalk(state, p.id)?.round ?? 0;

  if (!opening.ok) {
    return (
      <div className="fm-renewal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="fm-renewal-panel" onClick={(e) => e.stopPropagation()}>
          <div className="fm-renewal-header">
            <div>
              <h2>{p.name}</h2>
              <p>{opening.error}</p>
            </div>
          </div>
          <div className="fm-actions" style={{ marginBottom: 0, justifyContent: 'flex-end' }}>
            <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const offer = (): RenewalOffer => ({ wage, years, status });

  const submit = () => {
    if (ended) return;
    const { state: next, response } = submitRenewalOffer(state, p.id, offer());
    onChange(next);
    setThread((t) => [
      ...t,
      { from: 'club', text: `${formatMoney(wage)}/wk, ${years}y${status ? ` as ${SQUAD_STATUS[status].label.toLowerCase()}` : ''}.` },
      { from: 'player', text: response.message, verdict: response.verdict },
    ]);
    if (response.verdict === 'accept' || response.verdict === 'reject') {
      setEnded(true);
    } else if (response.counter) {
      setWage(response.counter.wage);
      setYears(response.counter.years);
      setStatus(response.counter.status);
    }
  };

  const walkAway = () => {
    onChange(abandonRenewalTalks(state, p.id));
    onClose();
  };

  const remaining = state.budget - wage;
  const roundsLeft = Math.max(0, MAX_RENEWAL_ROUNDS - round);

  return (
    <div className="fm-renewal-overlay" role="dialog" aria-modal="true" aria-label="Contract negotiation" onClick={onClose}>
      <div className="fm-renewal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="fm-renewal-header">
          <div className="fm-contract-avatar">{p.name.slice(0, 1)}</div>
          <div>
            <h2>{p.name}</h2>
            <p>{p.pos} · {p.age}y · {p.rating} OVR · currently {formatMoney(p.wage)}/wk</p>
          </div>
        </div>

        {thread.length > 0 && (
          <div className="fm-renewal-thread">
            {thread.map((m, i) => (
              <div
                key={i}
                className={`fm-renewal-bubble${m.from === 'player' ? ' fm-renewal-bubble--player' : ''}${
                  m.verdict === 'accept' ? ' fm-renewal-bubble--accept' : m.verdict === 'reject' ? ' fm-renewal-bubble--reject' : ''
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
        )}

        {!ended && (
          <>
            <div className="fm-renewal-fields">
              <div className="fm-renewal-field">
                <label>Weekly wage</label>
                <span className="fm-contract-control">
                  <button type="button" onClick={() => setWage((w) => Math.max(0, w - 2500))}>−</button>
                  <input
                    aria-label="Weekly wage"
                    value={wage}
                    onChange={(e) => setWage(Math.max(0, Number(e.target.value.replace(/\D/g, ''))))}
                  />
                  <button type="button" onClick={() => setWage((w) => w + 2500)}>+</button>
                </span>
              </div>
              <div className="fm-renewal-field">
                <label>Contract length</label>
                <span className="fm-contract-control">
                  <button type="button" onClick={() => setYears((y) => Math.max(1, y - 1))}>−</button>
                  <input aria-label="Contract length" value={`${years}y`} readOnly />
                  <button type="button" onClick={() => setYears((y) => Math.min(6, y + 1))}>+</button>
                </span>
              </div>
              <div className="fm-renewal-field" style={{ gridColumn: '1 / -1' }}>
                <label>Promised role</label>
                <span className="fm-contract-control" style={{ padding: '0 10px' }}>
                  <select
                    aria-label="Promised role"
                    value={status ?? ''}
                    onChange={(e) => setStatus(e.target.value === '' ? null : (e.target.value as SquadStatusKey))}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', width: '100%', height: 36 }}
                  >
                    <option value="">No promise</option>
                    {STATUS_ORDER.slice().reverse().map((s) => (
                      <option key={s} value={s}>{SQUAD_STATUS[s].label}</option>
                    ))}
                  </select>
                </span>
              </div>
            </div>

            <p className="fm-renewal-meta">
              Wage budget remaining if signed: <strong style={{ color: remaining < 0 ? 'var(--red)' : 'var(--green)' }}>{formatMoney(remaining)}</strong>
              {' · '}{roundsLeft} offer{roundsLeft === 1 ? '' : 's'} left before he stops listening
            </p>

            <div className="fm-actions" style={{ marginBottom: 0, justifyContent: 'space-between' }}>
              <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={walkAway}>Walk away</button>
              <button className="fm-btn fm-btn--primary fm-btn--small" onClick={submit}>
                {thread.length === 0 ? 'Put offer to player' : 'Send counter'}
              </button>
            </div>
          </>
        )}

        {ended && (
          <div className="fm-actions" style={{ marginBottom: 0, justifyContent: 'flex-end' }}>
            <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={onClose}>
              <Icon name="check" size={12} /> Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

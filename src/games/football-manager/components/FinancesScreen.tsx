'use client';

import { useState } from 'react';
import type { GameState, KitOffer, SponsorOffer, SponsorSlotId, TicketTier } from '@/engine/types';
import { gateIncome, weeklyWageBill, staffWageBill } from '@/engine/seasonProgression';
import { SEASON_ROUNDS } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import {
  SPONSOR_SLOTS, TICKET_TIERS, acceptKitOffer, acceptSponsorOffer, canRequestBoardFunds,
  ffpStatus, financesView, genKitOffers, genSponsorOffers, requestBoardFunds, scrStatus,
  setTicketPricing, terminateSponsorDeal, terminationFee,
} from '@/engine/finances';

export default function FinancesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [openSlot, setOpenSlot] = useState<SponsorSlotId | 'kit' | null>(null);

  const fin = financesView(state);
  const gate = gateIncome(state);
  const playerWages = weeklyWageBill(state);
  const staffWages = staffWageBill(state);
  const weeklyBalance = gate - playerWages - staffWages;
  const weeksRemaining = Math.max(0, SEASON_ROUNDS - state.week + 1);
  const projectedSeasonBalance = weeklyBalance * weeksRemaining;

  const ffp = ffpStatus(state, fin);
  const scr = scrStatus(state, fin);
  const trend = fin.balanceHistory.slice(-24);
  const maxAbsBalance = Math.max(1, ...trend.map((p) => Math.abs(p.balance)));

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Current Budget</p>
        <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--green)', margin: '4px 0 0' }}>
          {formatMoney(state.budget)}
        </p>
        {scr.embargo && (
          <p className="fm-error-text" style={{ textAlign: 'left', marginTop: 6 }}>
            Transfer embargo — squad cost ratio has been over the {Math.round(scr.limit * 100)}% limit too long.
          </p>
        )}
      </div>

      {/* --- FFP / SCR status --------------------------------------------- */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Financial Fair Play</p>
        <div className="fm-ffp-row">
          <div>
            <span className="fm-hint">FFP (3-year rolling)</span>
            <p className={`fm-ffp-status fm-ffp-status--${ffp.ok ? 'ok' : 'bad'}`}>{ffp.label}</p>
            <p className="fm-hint">{formatMoney(ffp.rolling)} of {formatMoney(ffp.limit)} allowed</p>
          </div>
          <div>
            <span className="fm-hint">Squad Cost Ratio</span>
            <p className={`fm-ffp-status fm-ffp-status--${scr.scr <= scr.limit ? 'ok' : 'bad'}`}>
              {Math.round(scr.scr * 100)}%
            </p>
            <p className="fm-hint">limit {Math.round(scr.limit * 100)}% · wages+amort {formatMoney(scr.squadCost)} / revenue {formatMoney(scr.revenue)}</p>
          </div>
        </div>
      </div>

      {/* --- Sponsorship ---------------------------------------------------- */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Sponsorship</p>
        <div className="fm-sponsor-grid">
          {(Object.keys(SPONSOR_SLOTS) as SponsorSlotId[]).map((slot) => {
            const deal = fin[slot];
            const cfg = SPONSOR_SLOTS[slot];
            return (
              <div key={slot} className="fm-sponsor-card">
                <span className="fm-sponsor-card__label">{cfg.label}</span>
                {deal ? (
                  <>
                    <span className="fm-sponsor-card__name">{deal.name}</span>
                    <span className="fm-sponsor-card__value">{formatMoney(deal.weeklyValue)}/wk</span>
                    <span className="fm-hint">{deal.seasonsLeft} season{deal.seasonsLeft === 1 ? '' : 's'} left</span>
                    <button
                      className="fm-btn fm-btn--small fm-btn--ghost"
                      onClick={() => onChange(terminateSponsorDeal(state, slot))}
                    >
                      Terminate ({formatMoney(terminationFee(deal))})
                    </button>
                  </>
                ) : (
                  <button className="fm-btn fm-btn--small fm-btn--primary" onClick={() => setOpenSlot(slot)}>
                    Find a sponsor
                  </button>
                )}
              </div>
            );
          })}
          <div className="fm-sponsor-card">
            <span className="fm-sponsor-card__label">Kit Deal</span>
            {fin.kitDeal ? (
              <>
                <span className="fm-sponsor-card__name">{fin.kitDeal.name}</span>
                <span className="fm-sponsor-card__value">{formatMoney(fin.kitDeal.annualValue)}/season</span>
                <span className="fm-hint">{fin.kitDeal.seasonsLeft} season{fin.kitDeal.seasonsLeft === 1 ? '' : 's'} left</span>
              </>
            ) : (
              <button className="fm-btn fm-btn--small fm-btn--primary" onClick={() => setOpenSlot('kit')}>
                Find a kit maker
              </button>
            )}
          </div>
        </div>

        {openSlot && (
          <SponsorOfferPicker
            state={state}
            slot={openSlot}
            onPick={(next) => { onChange(next); setOpenSlot(null); }}
            onClose={() => setOpenSlot(null)}
          />
        )}
      </div>

      {/* --- Ticket pricing -------------------------------------------------- */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Ticket Pricing</p>
        <div className="fm-pills">
          {(Object.keys(TICKET_TIERS) as TicketTier[]).map((tier) => (
            <button
              key={tier}
              className={`fm-pill${fin.ticketPricing === tier ? ' active' : ''}`}
              onClick={() => onChange(setTicketPricing(state, tier))}
            >
              {TICKET_TIERS[tier].label}
            </button>
          ))}
        </div>
        <p className="fm-hint">{TICKET_TIERS[fin.ticketPricing].desc}</p>
      </div>

      {/* --- Weekly summary --------------------------------------------------- */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Weekly Financial Summary</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Gate & Sponsorship" value={gate} />
          <Row label="Player Wages" value={-playerWages} />
          {staffWages > 0 && <Row label="Staff Wages" value={-staffWages} />}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span className="fm-label">Weekly Balance</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: weeklyBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {weeklyBalance >= 0 ? '+' : ''}{formatMoney(weeklyBalance)}
            </span>
          </div>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Season Projection</p>
        <p className="fm-club-line">Remaining weeks: {weeksRemaining}</p>
        <p style={{ fontSize: 20, fontWeight: 900, margin: '4px 0 0', color: projectedSeasonBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {projectedSeasonBalance >= 0 ? '+' : ''}{formatMoney(projectedSeasonBalance)}
        </p>
        {canRequestBoardFunds(state) && (
          <button
            className="fm-btn fm-btn--small fm-btn--primary"
            style={{ marginTop: 8 }}
            onClick={() => onChange(requestBoardFunds(state).state)}
          >
            Request board funds
          </button>
        )}
      </div>

      {/* --- Balance trend ------------------------------------------------- */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Balance Trend</p>
        {trend.length < 2 ? (
          <p className="fm-hint">No balance history yet.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, padding: '4px 2px 0', borderBottom: '1px solid var(--border-soft)' }}>
            {trend.map((pt, i) => {
              const heightPct = Math.max(6, (Math.abs(pt.balance) / maxAbsBalance) * 100);
              return (
                <div
                  key={i}
                  title={`S${pt.year} wk${pt.week}: ${formatMoney(pt.balance)}`}
                  style={{ flex: 1, minWidth: 3, height: `${Math.min(100, heightPct)}%`, borderRadius: 2, background: 'var(--green-600)' }}
                />
              );
            })}
          </div>
        )}
        <p className="fm-hint" style={{ margin: '6px 0 0' }}>Balance over time, oldest → newest ({trend.length} points).</p>
      </div>

      {/* --- Season breakdown ------------------------------------------------ */}
      {fin.history.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Season History</p>
          <table className="fm-finance-table">
            <thead>
              <tr><th>Year</th><th>Pos</th><th>Income</th><th>Expenses</th><th>Profit</th></tr>
            </thead>
            <tbody>
              {[...fin.history].reverse().map((h) => (
                <tr key={h.year}>
                  <td>{h.year}</td>
                  <td>{h.position || '—'}</td>
                  <td>{formatMoney(h.income)}</td>
                  <td>{formatMoney(h.expenses)}</td>
                  <td className={h.profit >= 0 ? 'in' : 'out'}>{h.profit >= 0 ? '+' : ''}{formatMoney(h.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Recent Transactions</p>
        {state.ledger.length > 0 ? (
          <ul className="fm-ledger">
            {state.ledger.slice(0, 15).map((e, i) => (
              <li key={i}>
                <span className="wk">W{e.week}</span>
                <span>{e.desc}</span>
                <span className={e.amount >= 0 ? 'in' : 'out'}>{e.amount >= 0 ? '+' : ''}{formatMoney(e.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fm-hint">No transactions yet</p>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="fm-club-line">{label}</span>
      <span style={{ color: value >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
        {value >= 0 ? '+' : ''}{formatMoney(value)}
      </span>
    </div>
  );
}

function SponsorOfferPicker({
  state,
  slot,
  onPick,
  onClose,
}: {
  state: GameState;
  slot: SponsorSlotId | 'kit';
  onPick: (next: GameState) => void;
  onClose: () => void;
}) {
  const sponsorOffers = slot === 'kit' ? [] : genSponsorOffers(state, slot);
  const kitOffers = slot === 'kit' ? genKitOffers(state) : [];
  const label = slot === 'kit' ? 'Kit Deal' : SPONSOR_SLOTS[slot].label;
  return (
    <div className="fm-sponsor-offers">
      <div className="fm-sponsor-offers__header">
        <span className="fm-label">Offers for {label}</span>
        <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={onClose}>Close</button>
      </div>
      {slot === 'kit'
        ? kitOffers.map((offer: KitOffer, i) => (
            <div key={i} className="fm-sponsor-offers__row">
              <span className="fm-sponsor-offers__name">{offer.name}</span>
              <span className="fm-hint">{formatMoney(offer.annualValue)}/season · {offer.termSeasons}y</span>
              <button className="fm-btn fm-btn--small fm-btn--primary" onClick={() => onPick(acceptKitOffer(state, offer))}>
                Sign
              </button>
            </div>
          ))
        : sponsorOffers.map((offer: SponsorOffer, i) => (
            <div key={i} className="fm-sponsor-offers__row">
              <span className="fm-sponsor-offers__name">{offer.name}</span>
              <span className="fm-hint">{formatMoney(offer.weeklyValue)}/wk · {offer.termSeasons}y</span>
              <button className="fm-btn fm-btn--small fm-btn--primary" onClick={() => onPick(acceptSponsorOffer(state, slot as SponsorSlotId, offer))}>
                Sign
              </button>
            </div>
          ))}
    </div>
  );
}

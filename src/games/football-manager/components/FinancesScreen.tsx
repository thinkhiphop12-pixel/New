'use client';

import { useState } from 'react';
import type { GameState, KitOffer, SponsorOffer, SponsorSlotId, TicketTier, FinanceState } from '@/engine/types';
import { gateIncome, weeklyWageBill, staffWageBill, userLeagueId, userPosition, userLeague } from '@/engine/seasonProgression';
import { SEASON_ROUNDS, leagueName } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { totalCapacity } from '@/engine/facilities';
import { ReputationStars, Bar, ordinalSuffix } from './visuals';
import { Icon } from './Icon';
import {
  SPONSOR_SLOTS, TICKET_TIERS, acceptKitOffer, acceptSponsorOffer, canRequestBoardFunds,
  ffpStatus, financesView, genKitOffers, genSponsorOffers, requestBoardFunds, scrStatus,
  setTicketPricing, shiftBudgetToWages, terminateSponsorDeal, terminationFee,
  wagesFromTransferMoney,
} from '@/engine/finances';
import { wageCeiling } from '@/engine/teamManagement';

/** Chunks the board will shift between the two budgets in one go. */
const SPLIT_STEPS = [500_000, 2_000_000];

export default function FinancesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [openSlot, setOpenSlot] = useState<SponsorSlotId | 'kit' | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);

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

      {/* ── Income & Expenditure bars ── */}
      <IncomeExpenseBars fin={fin} />

      {/* ── Stadium attendance ── */}
      <StadiumAttendance state={state} fin={fin} />

      {/* ── Board confidence ── */}
      <BoardConfidence state={state} />

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

      {/* --- Transfer / wage split -------------------------------------------- */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Adjust Budget</p>
        <div className="fm-split-row">
          <div>
            <span className="fm-label">Transfer Budget</span>
            <p className="fm-split-figure">{formatMoney(state.budget)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="fm-label">Wage Budget</span>
            <p className="fm-split-figure">{formatMoney(wageCeiling(state))}<span className="fm-split-unit">/wk</span></p>
          </div>
        </div>
        <p className="fm-hint" style={{ marginTop: 0 }}>
          The board will move money between the two. A season costs 52 weeks of wages, so
          {' '}{formatMoney(SPLIT_STEPS[0])} of transfer money is worth{' '}
          {formatMoney(wagesFromTransferMoney(SPLIT_STEPS[0]))}/wk on the wage bill.
        </p>
        <div className="fm-pills">
          {SPLIT_STEPS.map((step) => (
            <button
              key={`to-wages-${step}`}
              className="fm-pill"
              onClick={() => {
                const r = shiftBudgetToWages(state, step);
                setSplitError(r.ok ? null : r.error ?? null);
                if (r.ok) onChange(r.state);
              }}
            >
              {formatMoney(step)} &rarr; wages
            </button>
          ))}
          {SPLIT_STEPS.map((step) => (
            <button
              key={`to-transfer-${step}`}
              className="fm-pill"
              onClick={() => {
                const r = shiftBudgetToWages(state, -step);
                setSplitError(r.ok ? null : r.error ?? null);
                if (r.ok) onChange(r.state);
              }}
            >
              wages &rarr; {formatMoney(step)}
            </button>
          ))}
        </div>
        {splitError && <p className="fm-hint" style={{ color: 'var(--red)' }}>{splitError}</p>}
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
        <p className="fm-hint" style={{ margin: '6px 0 0' }}>Balance over time, oldest to newest ({trend.length} points).</p>
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


type CatDef = { key: string; label: string; color: string };

const INCOME_CATS: CatDef[] = [
  { key: 'tv', label: 'TV', color: 'var(--green)' },
  { key: 'matchday', label: 'Matchday', color: 'var(--green-600)' },
  { key: 'sponsorship', label: 'Sponsorship', color: 'var(--green)' },
  { key: 'merchandise', label: 'Merch', color: 'var(--gold)' },
  { key: 'prizes', label: 'Prizes', color: 'var(--gold-2)' },
  { key: 'sales', label: 'Sales', color: 'var(--gold)' },
];

const EXPENSE_CATS: CatDef[] = [
  { key: 'wages', label: 'Wages', color: 'var(--red)' },
  { key: 'staff', label: 'Staff', color: 'var(--red)' },
  { key: 'transfers', label: 'Transfers', color: 'var(--red)' },
  { key: 'agentFees', label: 'Agent fees', color: 'var(--red)' },
  { key: 'academyUpkeep', label: 'Academy', color: 'var(--red)' },
  { key: 'stadiumMaint', label: 'Stadium', color: 'var(--red)' },
];

function finVal(fin: FinanceState, isIncome: boolean, key: string): number {
  const src = isIncome ? fin.seasonIncome : fin.seasonExpenses;
  return (src as unknown as Record<string, number>)[key] ?? 0;
}

function IncomeExpenseBars({ fin }: { fin: FinanceState }) {
  const incomeTotal = fin.seasonIncome.tv + fin.seasonIncome.matchday + fin.seasonIncome.sponsorship
    + fin.seasonIncome.merchandise + fin.seasonIncome.prizes + fin.seasonIncome.sales;
  const expenseTotal = fin.seasonExpenses.wages + fin.seasonExpenses.staff + fin.seasonExpenses.transfers
    + fin.seasonExpenses.agentFees + fin.seasonExpenses.academyUpkeep + fin.seasonExpenses.stadiumMaint;
  const maxIncome = Math.max(1, ...INCOME_CATS.map((c) => finVal(fin, true, c.key)));
  const maxExpense = Math.max(1, ...EXPENSE_CATS.map((c) => finVal(fin, false, c.key)));

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>Season Income &amp; Expenditure</p>
      <p className="fm-hint" style={{ textAlign: 'left', marginTop: 0 }}>Season to date — sorted by size</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 10px', marginTop: 10 }}>
        <div>
          <p className="fm-label">Income</p>
          {[...INCOME_CATS].sort((a, b) => finVal(fin, true, b.key) - finVal(fin, true, a.key)).map((c) => (
            <div key={c.key} className="fm-cat-bar">
              <span className="fm-cat-bar__label">{c.label}</span>
              <div className="fm-cat-bar__track">
                <div className="fm-cat-bar__fill" style={{
                  width: `${Math.min(100, (finVal(fin, true, c.key) / maxIncome) * 100)}%`,
                  background: c.color,
                }} />
              </div>
              <span className="fm-cat-bar__value">{formatMoney(finVal(fin, true, c.key))}</span>
            </div>
          ))}
          <div className="fm-cat-bar" style={{ marginTop: 6, borderTop: '1px solid var(--border-soft)', paddingTop: 8 }}>
            <span className="fm-cat-bar__label">Total</span>
            <span className="fm-cat-bar__value" style={{ color: 'var(--green)', fontWeight: 900 }}>{formatMoney(incomeTotal)}</span>
          </div>
        </div>
        <div>
          <p className="fm-label">Expenses</p>
          {[...EXPENSE_CATS].sort((a, b) => finVal(fin, false, b.key) - finVal(fin, false, a.key)).map((c) => (
            <div key={c.key} className="fm-cat-bar">
              <span className="fm-cat-bar__label">{c.label}</span>
              <div className="fm-cat-bar__track">
                <div className="fm-cat-bar__fill" style={{
                  width: `${Math.min(100, (finVal(fin, false, c.key) / maxExpense) * 100)}%`,
                  background: c.color,
                }} />
              </div>
              <span className="fm-cat-bar__value">{formatMoney(finVal(fin, false, c.key))}</span>
            </div>
          ))}
          <div className="fm-cat-bar" style={{ marginTop: 6, borderTop: '1px solid var(--border-soft)', paddingTop: 8 }}>
            <span className="fm-cat-bar__label">Total</span>
            <span className="fm-cat-bar__value" style={{ color: 'var(--red)', fontWeight: 900 }}>{formatMoney(expenseTotal)}</span>
          </div>
        </div>
      </div>
      <div className="fm-cat-bar" style={{ marginTop: 12, borderTop: '1px solid var(--border-soft)', paddingTop: 8 }}>
        <span className="fm-cat-bar__label">Net</span>
        <div className="fm-cat-bar__track">
          <div className="fm-cat-bar__fill" style={{
            width: `${Math.max(2, Math.min(100, (Math.abs(incomeTotal - expenseTotal) / Math.max(incomeTotal, expenseTotal, 1)) * 100))}%`,
            background: incomeTotal - expenseTotal >= 0 ? 'var(--green)' : 'var(--red)',
          }} />
        </div>
        <span className="fm-cat-bar__value" style={{ color: incomeTotal - expenseTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {incomeTotal - expenseTotal >= 0 ? '+' : ''}{formatMoney(incomeTotal - expenseTotal)}
        </span>
      </div>
    </div>
  );
}

function StadiumAttendance({ state, fin }: { state: GameState; fin: FinanceState }) {
  const fs = state.facilities;
  const capUsed = fs ? totalCapacity(fs) : 0;
  const capMax = fs ? fs.groundCapacityCap : 0;
  const pos = userPosition(state);
  const lg = userLeague(state);
  const gate = gateIncome(state);
  const ticketTier = fin.ticketPricing ? TICKET_TIERS[fin.ticketPricing] : null;
  const attendancePct = capMax > 0 ? Math.min(100, (capUsed / capMax) * 100) : 0;
  const attendanceLabel = capMax > 0 ? `${Math.round(attendancePct)}% built` : 'no stadium data';
  const positionLabel = pos > 0 ? `${pos}${ordinalSuffix(pos)} place in ${leagueName(userLeagueId(state))}` : 'Not yet ranked';

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>Stadium Attendance</p>
      <div className="fm-qstat" style={{ marginBottom: 12 }}>
        <span className="fm-qstat__icon"><Icon name="stadium" size={15} /></span>
        <span className="fm-qstat__val">{capMax > 0 ? `${capUsed.toLocaleString()} / ${capMax.toLocaleString()}` : '—'}</span>
        <span className="fm-qstat__lbl">capacity</span>
      </div>
      <div className="fm-qstat" style={{ marginBottom: 12 }}>
        <span className="fm-qstat__icon"><Icon name="finances" size={15} /></span>
        <span className="fm-qstat__val">{gate > 0 ? formatMoney(gate) : '—'}/wk</span>
        <span className="fm-qstat__lbl">gate income</span>
      </div>
      <div className="fm-qstat">
        <span className="fm-qstat__icon"><Icon name="stadium" size={15} /></span>
        <span className="fm-qstat__val">{ticketTier ? ticketTier.label : '—'}</span>
        <span className="fm-qstat__lbl">ticket tier</span>
      </div>
      {capMax > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="fm-attendance__track">
            <div className="fm-attendance__fill" style={{ width: `${attendancePct}%` }} />
          </div>
          <span className="fm-hint" style={{ marginTop: 4, display: 'block' }}>
            {attendanceLabel} · {positionLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function BoardConfidence({ state }: { state: GameState }) {
  const atRisk = state.board.confidence < 30;
  const sacked = state.board.confidence < 20;
  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>Board Confidence</p>
      <p className="fm-club-line">{state.board.objective}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <ReputationStars value={Math.min(5, Math.max(1, Math.round(state.board.confidence / 20)))} />
        <span className="fm-club-line" style={{ margin: 0 }}>
          Board {state.board.confidence}/100
        </span>
      </div>
      <Bar value={state.board.confidence} label="Board" />
      <Bar value={state.fanConfidence} label="Fans" />
      <Bar value={state.chemistry} label="Chemistry" />
      {sacked ? (
        <p className="fm-error-text" style={{ textAlign: 'left', marginTop: 6 }}>
          Below 20 — you will be sacked at season end unless you recover.
        </p>
      ) : atRisk ? (
        <p className="fm-hint" style={{ textAlign: 'left', marginTop: 6 }}>
          Confidence is low — wins improve morale quickly.
        </p>
      ) : null}
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

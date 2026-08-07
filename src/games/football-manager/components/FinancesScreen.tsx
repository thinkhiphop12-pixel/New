'use client';

import type { GameState, FinanceState } from '@/engine/types';
import { gateIncome, weeklyWageBill, staffWageBill, userLeagueId, userPosition } from '@/engine/seasonProgression';
import { SEASON_ROUNDS, leagueName } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { groundCapacity } from '@/engine/facilities';
import { ReputationStars, Bar, ordinalSuffix } from './visuals';
import { Icon } from './Icon';
import {
  canRequestBoardFunds, financesView, requestBoardFunds, wageBudgetStatus,
} from '@/engine/finances';

export default function FinancesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const fin = financesView(state);
  const gate = gateIncome(state);
  const playerWages = weeklyWageBill(state);
  const staffWages = staffWageBill(state);
  const weeklyBalance = gate - playerWages - staffWages;
  const weeksRemaining = Math.max(0, SEASON_ROUNDS - state.week + 1);
  const projectedSeasonBalance = weeklyBalance * weeksRemaining;

  const trend = fin.balanceHistory.slice(-24);
  const maxAbsBalance = Math.max(1, ...trend.map((p) => Math.abs(p.balance)));

  return (
    <>
      {/* ── The two budgets ── */}
      <Budgets state={state} />

      {/* ── Income & Expenditure bars ── */}
      <IncomeExpenseBars fin={fin} />

      {/* ── Stadium attendance ── */}
      <StadiumAttendance state={state} />

      {/* ── Board confidence ── */}
      <BoardConfidence state={state} />

      {/* --- Weekly summary --------------------------------------------------- */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Weekly Financial Summary</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Gate & Commercial" value={gate} />
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

/**
 * The two budgets, side by side — the transfer budget as cash, the wage budget
 * as a capacity bar. The bar is the useful half: a club can sit on a large
 * transfer budget and still be unable to sign anyone, and that is only obvious
 * when the committed wage bill is shown against its ceiling.
 */
function Budgets({ state }: { state: GameState }) {
  const wage = wageBudgetStatus(state);
  const pct = Math.min(100, Math.max(0, wage.pct * 100));
  const tight = wage.free <= 0;
  return (
    <div className="fm-panel">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
        <div>
          <p className="fm-label" style={{ marginTop: 0 }}>Transfer Budget</p>
          <p style={{ fontSize: '26px', fontWeight: 900, color: state.budget >= 0 ? 'var(--green)' : 'var(--red)', margin: '4px 0 0' }}>
            {formatMoney(state.budget)}
          </p>
          <p className="fm-hint" style={{ margin: '2px 0 0' }}>Available for fees</p>
        </div>
        <div>
          <p className="fm-label" style={{ marginTop: 0 }}>Wage Budget</p>
          <p style={{ fontSize: '26px', fontWeight: 900, color: tight ? 'var(--red)' : 'var(--green)', margin: '4px 0 0' }}>
            {formatMoney(wage.budget)}
          </p>
          <p className="fm-hint" style={{ margin: '2px 0 0' }}>Per week</p>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="fm-attendance__track">
          <div
            className="fm-attendance__fill"
            style={{ width: `${pct}%`, background: tight ? 'var(--red)' : pct > 90 ? 'var(--gold)' : 'var(--green)' }}
          />
        </div>
        <span className="fm-hint" style={{ marginTop: 4, display: 'block' }}>
          {formatMoney(wage.committed)}/wk committed of {formatMoney(wage.budget)}
          {tight
            ? ' — over the ceiling, no room to sign'
            : ` · ${formatMoney(wage.free)}/wk free`}
        </span>
      </div>
    </div>
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
  { key: 'sponsorship', label: 'Commercial', color: 'var(--green)' },
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

function StadiumAttendance({ state }: { state: GameState }) {
  const capacity = groundCapacity(state, state.userClubId);
  const pos = userPosition(state);
  const gate = gateIncome(state);
  const positionLabel = pos > 0 ? `${pos}${ordinalSuffix(pos)} place in ${leagueName(userLeagueId(state))}` : 'Not yet ranked';

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>Matchday</p>
      <div className="fm-qstat" style={{ marginBottom: 12 }}>
        <span className="fm-qstat__icon"><Icon name="stadium" size={15} /></span>
        <span className="fm-qstat__val">{capacity > 0 ? capacity.toLocaleString() : '—'}</span>
        <span className="fm-qstat__lbl">ground capacity</span>
      </div>
      <div className="fm-qstat">
        <span className="fm-qstat__icon"><Icon name="finances" size={15} /></span>
        <span className="fm-qstat__val">{gate > 0 ? formatMoney(gate) : '—'}/wk</span>
        <span className="fm-qstat__lbl">gate income</span>
      </div>
      <span className="fm-hint" style={{ marginTop: 8, display: 'block' }}>{positionLabel}</span>
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

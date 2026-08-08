'use client';

import type { GameState } from '@/engine/types';
import { weeklyWageBill, staffWageBill, userLeagueId, userPosition } from '@/engine/seasonProgression';
import { leagueName } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { ReputationStars, Bar, ordinalSuffix } from './visuals';
import { financesView, wageBudgetStatus } from '@/engine/finances';

export default function FinancesScreen({ state }: { state: GameState }) {
  const fin = financesView(state);

  return (
    <>
      <Budgets state={state} />
      <BoardConfidence state={state} />

      {fin.history.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Season History</p>
          <table className="fm-finance-table">
            <thead>
              <tr><th>Year</th><th>League</th><th>Pos</th><th>Transfer</th><th>Wage/wk</th></tr>
            </thead>
            <tbody>
              {[...fin.history].reverse().map((h) => (
                <tr key={h.year}>
                  <td>{h.year}</td>
                  <td>{leagueName(h.leagueId)}</td>
                  <td>{h.position || '—'}</td>
                  <td>{formatMoney(h.budget)}</td>
                  <td>{formatMoney(h.wageBudget)}</td>
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
 * The two budgets — the transfer budget as cash, the wage budget as a capacity
 * bar. The bar is the useful half: a club can sit on a large transfer budget
 * and still be unable to sign anyone, and that is only obvious when the
 * committed wage bill is shown against its ceiling.
 */
function Budgets({ state }: { state: GameState }) {
  const wage = wageBudgetStatus(state);
  const staff = staffWageBill(state);
  const pct = Math.min(100, Math.max(0, wage.pct * 100));
  const tight = wage.free <= 0;
  const pos = userPosition(state);
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
          {tight ? ' — over the ceiling, no room to sign' : ` · ${formatMoney(wage.free)}/wk free`}
          {staff > 0 ? ` · staff ${formatMoney(staff)}/wk` : ''}
        </span>
        <span className="fm-hint" style={{ marginTop: 6, display: 'block' }}>
          {pos > 0 ? `${pos}${ordinalSuffix(pos)} in ${leagueName(userLeagueId(state))}` : 'Not yet ranked'}
          {' — the board resets both budgets each summer on where you finish.'}
        </span>
      </div>
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
      <p className="fm-hint" style={{ marginTop: 8 }}>
        Weekly wage bill {formatMoney(weeklyWageBill(state))}.
      </p>
    </div>
  );
}

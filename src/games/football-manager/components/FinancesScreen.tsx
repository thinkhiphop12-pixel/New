'use client';

import type { GameState } from '@/engine/types';
import { gateIncome, weeklyWageBill, staffWageBill } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';

export default function FinancesScreen({ state }: { state: GameState }) {
  const gate = gateIncome(state);
  const playerWages = weeklyWageBill(state);
  const staffWages = staffWageBill(state);
  const weeklyBalance = gate - playerWages - staffWages;

  // Calculate projected balance for season
  const weeksRemaining = Math.max(0, 52 - state.week);
  const projectedSeasonBalance = weeklyBalance * weeksRemaining;

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Current Budget
        </p>
        <p style={{ fontSize: '28px', fontWeight: '900', color: 'var(--green)', margin: '4px 0 0' }}>
          {formatMoney(state.budget)}
        </p>
        <p className="fm-club-line" style={{ margin: '4px 0 0' }}>
          Available to spend on transfers and upgrades
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Weekly Financial Summary
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="fm-club-line">Gate Income</span>
            <span style={{ color: 'var(--green)', fontWeight: '700' }}>+{formatMoney(gate)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="fm-club-line">Player Wages</span>
            <span style={{ color: 'var(--red)', fontWeight: '700' }}>−{formatMoney(playerWages)}</span>
          </div>
          {staffWages > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="fm-club-line">Staff Wages</span>
              <span style={{ color: 'var(--red)', fontWeight: '700' }}>−{formatMoney(staffWages)}</span>
            </div>
          )}
          <div
            style={{
              borderTop: '1px solid var(--border-soft)',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span className="fm-label">Weekly Balance</span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: '900',
                color: weeklyBalance >= 0 ? 'var(--green)' : 'var(--red)',
              }}
            >
              {weeklyBalance >= 0 ? '+' : ''}
              {formatMoney(weeklyBalance)}
            </span>
          </div>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Season Projection
        </p>
        <p className="fm-club-line" style={{ marginBottom: '8px' }}>
          Remaining weeks: {weeksRemaining}
        </p>
        <p style={{ fontSize: '20px', fontWeight: '900', margin: '4px 0 0' }}>
          <span
            style={{
              color: projectedSeasonBalance >= 0 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {projectedSeasonBalance >= 0 ? '+' : ''}
            {formatMoney(projectedSeasonBalance)}
          </span>
        </p>
        <p className="fm-hint" style={{ textAlign: 'left', marginTop: '8px' }}>
          Projected budget change if weekly balance remains stable
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Recent Transactions
        </p>
        {state.ledger.length > 0 ? (
          <ul className="fm-ledger">
            {state.ledger.slice(0, 15).map((e, i) => (
              <li key={i}>
                <span className="wk">W{e.week}</span>
                <span>{e.desc}</span>
                <span className={e.amount >= 0 ? 'in' : 'out'}>
                  {e.amount >= 0 ? '+' : ''}
                  {formatMoney(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fm-hint">No transactions yet</p>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Financial Tips
        </p>
        <ul className="fm-news">
          <li>Positive weekly balance improves board confidence</li>
          <li>Use budget for transfers and facility upgrades</li>
          <li>Gate income increases with stadium upgrades</li>
          <li>Wages scale with squad size and player quality</li>
          <li>Season-end bonuses depend on league finish</li>
        </ul>
      </div>
    </>
  );
}

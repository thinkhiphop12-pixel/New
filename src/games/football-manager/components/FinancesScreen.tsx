'use client';

import type { GameState } from '@/engine/types';
import { gateIncome, weeklyWageBill, staffWageBill } from '@/engine/seasonProgression';
import { SEASON_ROUNDS } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';

export default function FinancesScreen({ state }: { state: GameState }) {
  const gate = gateIncome(state);
  const playerWages = weeklyWageBill(state);
  const staffWages = staffWageBill(state);
  const weeklyBalance = gate - playerWages - staffWages;

  // Calculate projected balance for the rest of the current season.
  const weeksRemaining = Math.max(0, SEASON_ROUNDS - state.week + 1);
  const projectedSeasonBalance = weeklyBalance * weeksRemaining;

  // Ledger entries are week-tagged but not pre-aggregated — group them here to
  // build a per-week net trend (up to the last 20 distinct weeks on record;
  // the ledger itself resets each season, so early in a season this will show
  // fewer weeks, which is accurate rather than padded with fake history).
  const weeklyTrend = (() => {
    const byWeek = new Map<number, number>();
    for (const e of state.ledger) byWeek.set(e.week, (byWeek.get(e.week) ?? 0) + e.amount);
    return [...byWeek.entries()]
      .sort((a, b) => b[0] - a[0])
      .slice(0, 20)
      .reverse();
  })();
  const maxAbsTrend = Math.max(1, ...weeklyTrend.map(([, amt]) => Math.abs(amt)));

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
          Balance trend
        </p>
        {weeklyTrend.length === 0 ? (
          <p className="fm-hint">No weekly history yet this season.</p>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 3,
              height: 72,
              padding: '4px 2px 0',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            {weeklyTrend.map(([week, amount]) => {
              const heightPct = Math.max(6, (Math.abs(amount) / maxAbsTrend) * 100);
              return (
                <div
                  key={week}
                  title={`Week ${week}: ${amount >= 0 ? '+' : ''}${formatMoney(amount)}`}
                  style={{
                    flex: 1,
                    minWidth: 4,
                    height: `${heightPct}%`,
                    borderRadius: 2,
                    background: amount >= 0 ? 'var(--green)' : 'var(--red)',
                  }}
                />
              );
            })}
          </div>
        )}
        <p className="fm-hint" style={{ margin: '6px 0 0' }}>
          Net position per week, oldest → newest (last {weeklyTrend.length} week
          {weeklyTrend.length === 1 ? '' : 's'} on record).
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

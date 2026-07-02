'use client';

import type { GameState } from '@/engine/types';
import { ACADEMY_UPGRADE_COST } from '@/engine/gameRules';
import { gateIncome, upgradeAcademy, weeklyWageBill } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';

function Bar({ value, label }: { value: number; label: string }) {
  const tone = value >= 65 ? 'good' : value >= 35 ? 'mid' : 'bad';
  return (
    <div className="fm-bar-row">
      <span className="fm-bar-row__label">{label}</span>
      <div className="fm-bar">
        <div className={`fm-bar__fill ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="fm-bar-row__value">{value}</span>
    </div>
  );
}

export default function ClubScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const m = state.manager;
  const wages = weeklyWageBill(state);
  const gate = gateIncome(state);
  const upgradeCost = ACADEMY_UPGRADE_COST[state.academyLevel + 1];
  const legends = Object.values(state.legacy)
    .map((l) => ({ ...l, score: l.apps + l.goals * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Manager — {m.name}
        </p>
        <p className="fm-club-line">
          Reputation {m.reputation} · {m.seasons} season{m.seasons === 1 ? '' : 's'} · Record {m.wins}W {m.draws}D{' '}
          {m.losses}L
        </p>
        {m.trophies.length > 0 ? (
          <ul className="fm-news">
            {m.trophies.slice(-6).map((t, i) => (
              <li key={i}>🏆 {t}</li>
            ))}
          </ul>
        ) : (
          <p className="fm-hint" style={{ textAlign: 'left', margin: 0 }}>
            No trophies yet — the cabinet is waiting.
          </p>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Boardroom & fans
        </p>
        <p className="fm-club-line">Objective: {state.board.objective}</p>
        <Bar value={state.board.confidence} label="Board" />
        <Bar value={state.fanConfidence} label="Fans" />
        <Bar value={state.chemistry} label="Chemistry" />
        <p className="fm-hint" style={{ textAlign: 'left', marginBottom: 0 }}>
          Miss the objective with board confidence under 20 and you&apos;ll be sacked. Chemistry builds
          with a settled squad and drops after transfers.
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Finances
        </p>
        <p className="fm-club-line">
          Weekly: {formatMoney(gate)} gate income − {formatMoney(wages)} wages ={' '}
          <strong style={{ color: gate - wages >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatMoney(gate - wages)}
          </strong>
        </p>
        {state.ledger.length > 0 && (
          <ul className="fm-ledger">
            {state.ledger.slice(0, 10).map((e, i) => (
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
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Youth academy — level {state.academyLevel}
        </p>
        <p className="fm-club-line">
          {state.academyLevel >= 3
            ? 'Elite academy: two top prospects graduate every season.'
            : `Produces ${state.academyLevel >= 3 ? 'two prospects' : 'one prospect'} each season. Higher levels produce better, more numerous graduates.`}
        </p>
        {upgradeCost && (
          <button
            className="fm-btn fm-btn--secondary fm-btn--small"
            disabled={upgradeCost > state.budget}
            onClick={() => onChange(upgradeAcademy(state))}
          >
            Upgrade to level {state.academyLevel + 1} — {formatMoney(upgradeCost)}
          </button>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Records & legends
        </p>
        <ul className="fm-news">
          <li>Biggest win: {state.records.biggestWin?.text ?? '—'}</li>
          <li>
            Best finish:{' '}
            {state.records.bestFinish
              ? `${state.records.bestFinish.position}${ord(state.records.bestFinish.position)} in Division ${state.records.bestFinish.division} (${state.records.bestFinish.year})`
              : '—'}
          </li>
          <li>
            Top season scorer:{' '}
            {state.records.topSeasonScorer
              ? `${state.records.topSeasonScorer.name}, ${state.records.topSeasonScorer.goals} goals (${state.records.topSeasonScorer.year})`
              : '—'}
          </li>
        </ul>
        {legends.length > 0 && (
          <>
            <p className="fm-label">Club legends</p>
            <ul className="fm-news">
              {legends.map((l, i) => (
                <li key={i}>
                  {l.name} — {l.apps} apps, {l.goals} goals
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

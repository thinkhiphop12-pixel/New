'use client';

import type { GameState } from '@/engine/types';
import { userLeagueId, userPosition, userLeague } from '@/engine/seasonProgression';
import { leagueName } from '@/engine/gameRules';
import { ReputationStars } from './visuals';
import { Icon } from './Icon';

export default function BoardObjectivesScreen({ state }: { state: GameState }) {
  const board = state.board;
  const leagueId = userLeagueId(state);
  const league = userLeague(state);
  const pos = userPosition(state);
  const ranked = pos > 0;
  const onTrack = ranked && pos <= board.minPosition;

  const bars: { label: string; value: number }[] = [
    { label: 'Board', value: board.confidence },
    { label: 'Fan Confidence', value: state.fanConfidence },
    { label: 'Team Chemistry', value: state.chemistry },
  ];

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Primary Objective</p>
        <p className="fm-club-line">{board.objective}</p>
        <p className="fm-hint">
          Finish in the top {board.minPosition} of {leagueName(leagueId)} — currently position {pos ? `P${pos}` : '—'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <ReputationStars value={Math.min(5, Math.max(1, Math.round(board.confidence / 20)))} />
          <span className="fm-club-line" style={{ margin: 0 }}>{board.confidence}/100</span>
        </div>
        <Bar value={board.confidence} label="Board" />
        <div className="fm-bar-row">
          <span className="fm-bar-row__label">Objective</span>
          <div className="fm-bar">
            <div
              className="fm-bar__fill"
              style={{
                width: ranked ? `${Math.max(2, Math.min(100, (1 - pos / league.clubCount) * 100))}%` : '2%',
                background: onTrack ? 'var(--green)' : 'var(--red)',
              }}
            />
          </div>
          <span className="fm-bar-row__value">{ranked ? (onTrack ? 'On track' : 'Needs improvement') : 'Not yet ranked'}</span>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Board Metrics</p>
        {bars.map((b) => (
          <Bar key={b.label} value={b.value} label={b.label} />
        ))}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>League Context</p>
        <p className="fm-club-line">{leagueName(leagueId)} — {league.clubCount} teams, finish {board.minPosition}+ required</p>
        <p className="fm-hint">
          Current position: {pos ? `P${pos}` : 'Not yet ranked'} · Progress: {pos ? `${Math.round(((league.clubCount - pos + 1) / league.clubCount) * 100)}%` : '0%'}
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Objective History</p>
        {state.history.length === 0 ? (
          <p className="fm-hint">No previous seasons to display.</p>
        ) : (
          <table className="fm-finance-table">
            <thead>
              <tr><th>Season</th><th>Position</th><th>Objective</th><th>Completed</th></tr>
            </thead>
            <tbody>
              {[...state.history].reverse().map((h) => (
                <tr key={h.year}>
                  <td>{h.year}</td>
                  <td>P{h.position}</td>
                  <td>{h.objective}</td>
                  <td className={h.objectiveMet ? 'in' : 'out'}>{h.objectiveMet ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Dismissal Risk</p>
        <p className="fm-club-line" style={{ color: board.confidence < 30 ? 'var(--red)' : board.confidence < 50 ? 'var(--gold)' : 'var(--green)' }}>
          Confidence is {board.confidence}/100 — {board.confidence < 20 ? 'you will be sacked at season end' : board.confidence < 30 ? 'on the hot seat' : board.confidence < 50 ? 'under pressure' : 'secure'}
        </p>
        <p className="fm-hint">
          Confidence is driven by league position, cup fixtures, and off-pitch results. Win matches to restore trust.
        </p>
      </div>
    </>
  );
}

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

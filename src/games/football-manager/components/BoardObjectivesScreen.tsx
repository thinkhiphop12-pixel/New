'use client';

import type { GameState } from '@/engine/types';
import { userLeagueId, userPosition, userLeague } from '@/engine/seasonProgression';
import { leagueName } from '@/engine/gameRules';
import { CHAIRMAN_BLURB, CHAIRMAN_LABEL, chairmanFor } from '@/engine/jobMarket';
import { ReputationStars, Bar } from './visuals';
import { Icon } from './Icon';

/**
 * Job security in one screen: the three factions who can each make your job
 * harder — board, fans, squad — read together instead of scattered across
 * Club, Finances, and here. Board confidence is what actually gets you
 * sacked (`engine/seasonProgression.ts` — `sacked = !objectiveMet &&
 * board.confidence < 20`, checked once at season end); fan confidence and
 * squad morale don't carry a firing threshold of their own, but they're what
 * a manager watches in practice, so they get the same verdict treatment
 * rather than reading as decoration next to the number that "really" counts.
 */
export default function BoardObjectivesScreen({ state }: { state: GameState }) {
  const board = state.board;
  const leagueId = userLeagueId(state);
  const league = userLeague(state);
  const pos = userPosition(state);
  const ranked = pos > 0;
  const onTrack = ranked && pos <= board.minPosition;
  const chairman = chairmanFor(state.userClubId);

  const factions: {
    label: string;
    value: number;
    priority: string;
    verdict: (v: number) => string;
  }[] = [
    {
      label: 'Board',
      value: board.confidence,
      priority: `${CHAIRMAN_LABEL[chairman]} chairman — ${CHAIRMAN_BLURB[chairman].toLowerCase()} Moved by league position against the objective, and by finances staying out of the red.`,
      verdict: (v) => (v < 20 ? 'Sacked at season end if this holds' : v < 30 ? 'On the hot seat' : v < 50 ? 'Under pressure' : 'Secure'),
    },
    {
      label: 'Fans',
      value: state.fanConfidence,
      priority: 'Want to see the team win, in the league and in cup competitions, regardless of what the board asked for. Slower to move than the board, but a long run without a win turns the stands.',
      verdict: (v) => (v <= 25 ? 'Protests in the stands' : v < 45 ? 'Grumbling' : v >= 85 ? 'Singing your name' : 'Content'),
    },
    {
      label: 'Squad Morale',
      value: state.morale,
      priority: 'Wants results and playing time. Match outcomes, cup runs, and your press-conference tone all feed it directly — a squad that stops believing in you plays worse, which feeds the other two.',
      verdict: (v) => (v < 40 ? 'Dressing room is restless' : v < 60 ? 'Steady' : 'Fully behind you'),
    },
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
                width: ranked ? `${Math.max(2, Math.min(100, ((league.clubCount - pos + 1) / league.clubCount) * 100))}%` : '2%',
                background: onTrack ? 'var(--green)' : 'var(--red)',
              }}
            />
          </div>
          <span className="fm-bar-row__value">{ranked ? (onTrack ? 'On track' : 'Needs improvement') : 'Not yet ranked'}</span>
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Who You Answer To</p>
        <p className="fm-hint" style={{ marginTop: 0 }}>
          Three factions, three priorities. Keeping the board happy is what keeps your job — the other two are what
          make the club worth managing.
        </p>
        {factions.map((f) => {
          const tone = f.value >= 65 ? 'var(--green)' : f.value >= 35 ? 'var(--gold)' : 'var(--red)';
          return (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <Bar value={f.value} label={f.label} />
              <p className="fm-club-line" style={{ margin: '2px 0 2px', color: tone, fontSize: 13 }}>
                {f.verdict(f.value)}
              </p>
              <p className="fm-hint" style={{ margin: 0 }}>{f.priority}</p>
            </div>
          );
        })}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>League Context</p>
        <p className="fm-club-line">{leagueName(leagueId)} — {league.clubCount} teams, finish {board.minPosition}+ required</p>
        <p className="fm-hint">
          Current position: {pos ? `P${pos}` : 'Not yet ranked'} · Progress: {pos ? `${Math.round(((league.clubCount - pos + 1) / league.clubCount) * 100)}%` : '0%'}
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Dismissal Risk</p>
        <p
          className="fm-club-line"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: board.confidence < 30 ? 'var(--red)' : board.confidence < 50 ? 'var(--gold)' : 'var(--green)' }}
        >
          {board.confidence < 30 && <Icon name="warning" size={14} />}
          Board confidence is {board.confidence}/100 — {board.confidence < 20 ? 'you will be sacked at season end' : board.confidence < 30 ? 'on the hot seat' : board.confidence < 50 ? 'under pressure' : 'secure'}
        </p>
        <p className="fm-hint">
          Only board confidence carries a firing threshold. Fan and squad sentiment don&apos;t end your job on their
          own, but a squad that stops believing plays worse — which is exactly what drags board confidence down.
        </p>
      </div>
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, MatchReport } from '@/engine/types';
import { simulateMatch } from '@/engine/matchSimulation';
import { nextUserFixture } from '@/engine/seasonProgression';
import { getFormation } from '@/engine/gameRules';
import { lineupStrength, aiMatchSetup } from '@/engine/teamManagement';

type Phase = 'preview' | 'playing' | 'fulltime';
const MS_PER_MINUTE = 180; // ~16s for a full match

export default function MatchDayScreen({
  state,
  onDone,
}: {
  state: GameState;
  onDone: (report: MatchReport) => void;
}) {
  const [phase, setPhase] = useState<Phase>('preview');
  const [minute, setMinute] = useState(0);
  const [report, setReport] = useState<MatchReport | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fixture = nextUserFixture(state);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  if (!fixture) return <p className="fm-hint">No fixture this week.</p>;

  const home = state.clubs.find((c) => c.id === fixture.homeId)!;
  const away = state.clubs.find((c) => c.id === fixture.awayId)!;
  const isHome = fixture.homeId === state.userClubId;
  const opponentId = isHome ? fixture.awayId : fixture.homeId;

  const myStrength = lineupStrength(
    state, state.lineup, getFormation(state.formationId), state.tactics, state.morale
  );
  const oppSetup = aiMatchSetup(state, opponentId);
  const oppStrength = lineupStrength(state, oppSetup.lineup, oppSetup.formation, oppSetup.tactics, 60);

  const kickOff = () => {
    const rep = simulateMatch(state, fixture.homeId, fixture.awayId);
    setReport(rep);
    setPhase('playing');
    setMinute(1);
    timer.current = setInterval(() => {
      setMinute((m) => {
        if (m >= 90) {
          if (timer.current) clearInterval(timer.current);
          setPhase('fulltime');
          return 90;
        }
        return m + 1;
      });
    }, MS_PER_MINUTE);
  };

  const skip = () => {
    if (timer.current) clearInterval(timer.current);
    setMinute(90);
    setPhase('fulltime');
  };

  const shownEvents = report ? report.events.filter((e) => e.minute <= minute) : [];
  const homeGoals = shownEvents.filter((e) => e.type === 'goal' && e.clubId === fixture.homeId).length;
  const awayGoals = shownEvents.filter((e) => e.type === 'goal' && e.clubId === fixture.awayId).length;

  return (
    <div className="fm-screen">
      <div className="fm-scoreboard">
        <div className="fm-scoreboard__team">
          {home.name}
          <span className="code">{home.code} · HOME</span>
        </div>
        <div>
          {phase === 'preview' ? (
            <div className="fm-scoreboard__score">v</div>
          ) : (
            <>
              <div className="fm-scoreboard__minute">{phase === 'fulltime' ? 'FULL TIME' : `${minute}'`}</div>
              <div className="fm-scoreboard__score">
                {homeGoals} – {awayGoals}
              </div>
              {phase === 'fulltime' && report && (
                <div className="fm-scoreboard__xg">
                  xG {report.homeXG.toFixed(1)} – {report.awayXG.toFixed(1)}
                </div>
              )}
            </>
          )}
        </div>
        <div className="fm-scoreboard__team">
          {away.name}
          <span className="code">{away.code} · AWAY</span>
        </div>
      </div>

      {phase === 'preview' && (
        <>
          <div className="fm-panel">
            <p className="fm-label" style={{ marginTop: 0 }}>
              Pre-match
            </p>
            <p className="fm-hint" style={{ textAlign: 'left' }}>
              Your team: attack {Math.round(myStrength.attack)}, defense {Math.round(myStrength.defense)} ·{' '}
              {getFormation(state.formationId).name}, {state.tactics.style}, {state.tactics.pressing} press
              <br />
              Opponent: attack {Math.round(oppStrength.attack)}, defense {Math.round(oppStrength.defense)}
              {isHome ? '' : ' · playing away from home'}
            </p>
          </div>
          <button className="fm-btn fm-btn--primary fm-btn--large" onClick={kickOff}>
            Kick off
          </button>
        </>
      )}

      {phase === 'playing' && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={skip}>
            Skip to full time
          </button>
        </div>
      )}

      {phase !== 'preview' && (
        <ul className="fm-commentary">
          {shownEvents.map((e, i) => {
            const cls =
              e.type === 'goal'
                ? e.clubId === state.userClubId
                  ? 'goal'
                  : 'goal goal-opp'
                : e.type === 'card'
                  ? 'card'
                  : '';
            return (
              <li key={i} className={cls}>
                <span className="min">{e.minute}&apos;</span>
                <span>{e.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      {phase === 'fulltime' && report && (
        <button className="fm-btn fm-btn--primary fm-btn--large" onClick={() => onDone(report)}>
          Continue
        </button>
      )}
    </div>
  );
}

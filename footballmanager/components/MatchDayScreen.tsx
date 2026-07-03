'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, MatchReport, Player } from '@/engine/types';
import { mergeReports, simulateHalf, type TeamTalk } from '@/engine/matchSimulation';
import { nextUserFixture } from '@/engine/seasonProgression';
import { availableSquad } from '@/engine/teamManagement';

type Phase = 'half1' | 'halftime' | 'half2' | 'full';

/** Plays the user's league match in two halves with a half-time break for subs and a team talk. */
export default function MatchDayScreen({
  state,
  onDone,
}: {
  state: GameState;
  onDone: (report: MatchReport) => void;
}) {
  const [phase, setPhase] = useState<Phase>('half1');
  const [half1Report, setHalf1Report] = useState<MatchReport | null>(null);
  const [half2Report, setHalf2Report] = useState<MatchReport | null>(null);
  const [minute, setMinute] = useState(0);
  const [lineup, setLineup] = useState<(number | null)[]>(state.lineup);
  const [subOut, setSubOut] = useState<number | null>(null);
  const [subsUsed, setSubsUsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fixture = nextUserFixture(state);

  useEffect(() => {
    if (!fixture) return;
    setHalf1Report(simulateHalf(state, fixture.homeId, fixture.awayId, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const report = phase === 'half1' ? half1Report : phase === 'half2' ? half2Report : null;
    if (!report || phase === 'halftime' || phase === 'full') return;
    timer.current = setInterval(() => {
      setMinute((m) => {
        const cap = phase === 'half1' ? 45 : 90;
        if (m >= cap) {
          if (timer.current) clearInterval(timer.current);
          return cap;
        }
        return m + 1;
      });
    }, 90);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, half1Report, half2Report]);

  if (!fixture) return null;

  if (!half1Report) {
    return (
      <div className="fm-screen fm-loading">
        <div className="fm-spinner" />
        <p className="fm-hint">Walking out of the tunnel…</p>
      </div>
    );
  }

  const clubOf = (id: number) => state.clubs.find((c) => c.id === id);
  const home = clubOf(fixture.homeId);
  const away = clubOf(fixture.awayId);

  const startHalfTime = () => setPhase('halftime');

  const startSecondHalf = (talk?: TeamTalk) => {
    const rep2 = simulateHalf(state, fixture.homeId, fixture.awayId, 2, { userLineup: lineup, talk });
    setHalf2Report(rep2);
    setMinute(45);
    setPhase('half2');
  };

  const finalReport = half2Report ? mergeReports(half1Report, half2Report) : half1Report;
  const shownEvents =
    phase === 'half1' || phase === 'halftime'
      ? half1Report.events.filter((e) => e.minute <= (phase === 'halftime' ? 45 : minute))
      : finalReport.events.filter((e) => e.minute <= minute);

  const homeGoals = shownEvents.filter((e) => e.type === 'goal' && e.clubId === fixture.homeId).length;
  const awayGoals = shownEvents.filter((e) => e.type === 'goal' && e.clubId === fixture.awayId).length;
  const finished = phase === 'full' || (phase === 'half2' && minute >= 90);

  const bench = availableSquad(state, state.userClubId).filter((p) => !lineup.includes(p.id));

  const makeSub = (inId: number) => {
    if (subOut === null || subsUsed >= 3) return;
    setLineup((cur) => cur.map((id) => (id === subOut ? inId : id)));
    setSubsUsed((n) => n + 1);
    setSubOut(null);
  };

  return (
    <div className="fm-screen">
      <div className="fm-scoreboard">
        <div className="fm-scoreboard__team">
          {home?.name}
          <span className="code">{home?.code} · HOME</span>
        </div>
        <div>
          <div className="fm-scoreboard__minute">
            {phase === 'halftime' ? 'HALF TIME' : finished ? 'FULL TIME' : `${minute}'`}
          </div>
          <div className="fm-scoreboard__score">
            {homeGoals} – {awayGoals}
          </div>
          {finished && (
            <div className="fm-scoreboard__xg">
              xG {finalReport.homeXG.toFixed(2)} – {finalReport.awayXG.toFixed(2)}
            </div>
          )}
        </div>
        <div className="fm-scoreboard__team">
          {away?.name}
          <span className="code">{away?.code} · AWAY</span>
        </div>
      </div>

      {phase === 'half1' && minute < 45 && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={() => setMinute(45)}>
            Skip to half time
          </button>
        </div>
      )}
      {phase === 'half1' && minute >= 45 && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--primary fm-btn--large" onClick={startHalfTime}>
            Go to the dressing room
          </button>
        </div>
      )}

      {phase === 'halftime' && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            Half-time team talk
          </p>
          <p className="fm-hint" style={{ textAlign: 'left', marginBottom: 10 }}>
            Calm things down, encourage the lads, or give them the hairdryer — the wrong read can backfire.
          </p>
          <div className="fm-pills" style={{ marginBottom: 14 }}>
            <button className="fm-pill" onClick={() => startSecondHalf('calm')}>
              Stay calm
            </button>
            <button className="fm-pill" onClick={() => startSecondHalf('encourage')}>
              Encourage
            </button>
            <button className="fm-pill" onClick={() => startSecondHalf('hairdryer')}>
              Hairdryer
            </button>
          </div>

          <p className="fm-label">
            Substitutions ({subsUsed}/3 used)
          </p>
          <p className="fm-hint" style={{ textAlign: 'left', marginBottom: 8 }}>
            {subOut === null ? 'Tap a starter to bring off, then pick his replacement.' : 'Pick a replacement from the bench below.'}
          </p>
          <div className="fm-player-list">
            {lineup
              .filter((id): id is number => id !== null)
              .map((id) => state.players[id])
              .filter((p): p is Player => !!p)
              .map((p) => (
                <button
                  key={p.id}
                  className={`fm-player-row fm-pos-${p.pos}${subOut === p.id ? ' highlight' : ''}`}
                  disabled={subsUsed >= 3}
                  onClick={() => setSubOut(subOut === p.id ? null : p.id)}
                >
                  <span className="fm-player-row__badge">{p.role}</span>
                  <span className="fm-player-row__name">{p.name}</span>
                  <span className="fm-player-row__rating">{p.rating}</span>
                </button>
              ))}
          </div>

          {subOut !== null && (
            <>
              <p className="fm-label">Bench</p>
              <div className="fm-player-list">
                {bench.map((p) => (
                  <button key={p.id} className={`fm-player-row fm-pos-${p.pos} highlight`} onClick={() => makeSub(p.id)}>
                    <span className="fm-player-row__badge">{p.role}</span>
                    <span className="fm-player-row__name">{p.name}</span>
                    <span className="fm-player-row__rating">{p.rating}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="fm-actions" style={{ marginTop: 14 }}>
            <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => startSecondHalf()}>
              Skip talk, kick off second half
            </button>
          </div>
        </div>
      )}

      {phase === 'half2' && minute < 90 && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={() => setMinute(90)}>
            Skip to full time
          </button>
        </div>
      )}
      {finished && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--primary fm-btn--large" onClick={() => onDone(finalReport)}>
            Continue
          </button>
        </div>
      )}

      <ul className="fm-commentary">
        {shownEvents.map((e, i) => (
          <li
            key={i}
            className={
              e.type === 'goal'
                ? e.clubId === state.userClubId
                  ? 'goal'
                  : 'goal goal-opp'
                : e.type === 'card'
                  ? 'card'
                  : ''
            }
          >
            <span className="min">{e.minute}&apos;</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

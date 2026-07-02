'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, MatchReport } from '@/engine/types';
import { simulateMatch } from '@/engine/matchSimulation';
import { nextUserFixture } from '@/engine/seasonProgression';

/** Plays the user's league match: simulate once, then replay the events. */
export default function MatchDayScreen({
  state,
  onDone,
}: {
  state: GameState;
  onDone: (report: MatchReport) => void;
}) {
  const [report, setReport] = useState<MatchReport | null>(null);
  const [minute, setMinute] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fixture = nextUserFixture(state);
    if (!fixture) return;
    setReport(simulateMatch(state, fixture.homeId, fixture.awayId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!report) return;
    timer.current = setInterval(() => {
      setMinute((m) => {
        if (m >= 90) {
          if (timer.current) clearInterval(timer.current);
          return 90;
        }
        return m + 1;
      });
    }, 90);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [report]);

  if (!report) {
    return (
      <div className="fm-screen fm-loading">
        <div className="fm-spinner" />
        <p className="fm-hint">Walking out of the tunnel…</p>
      </div>
    );
  }

  const clubOf = (id: number) => state.clubs.find((c) => c.id === id);
  const home = clubOf(report.homeId);
  const away = clubOf(report.awayId);
  const shown = report.events.filter((e) => e.minute <= minute);
  const homeGoals = shown.filter((e) => e.type === 'goal' && e.clubId === report.homeId).length;
  const awayGoals = shown.filter((e) => e.type === 'goal' && e.clubId === report.awayId).length;
  const finished = minute >= 90;

  return (
    <div className="fm-screen">
      <div className="fm-scoreboard">
        <div className="fm-scoreboard__team">
          {home?.name}
          <span className="code">{home?.code} · HOME</span>
        </div>
        <div>
          <div className="fm-scoreboard__minute">{finished ? 'FULL TIME' : `${minute}'`}</div>
          <div className="fm-scoreboard__score">
            {homeGoals} – {awayGoals}
          </div>
          {finished && (
            <div className="fm-scoreboard__xg">
              xG {report.homeXG.toFixed(2)} – {report.awayXG.toFixed(2)}
            </div>
          )}
        </div>
        <div className="fm-scoreboard__team">
          {away?.name}
          <span className="code">{away?.code} · AWAY</span>
        </div>
      </div>

      <div className="fm-actions">
        {!finished ? (
          <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={() => setMinute(90)}>
            Skip to full time
          </button>
        ) : (
          <button className="fm-btn fm-btn--primary fm-btn--large" onClick={() => onDone(report)}>
            Continue
          </button>
        )}
      </div>

      <ul className="fm-commentary">
        {shown.map((e, i) => (
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

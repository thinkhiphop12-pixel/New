'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, MatchReport, Player, Pressing, TacticStyle, Tactics, Tempo, Width } from '@/engine/types';
import { mergeReports, simulateHalf, simulateSegment, type TeamTalk } from '@/engine/matchSimulation';
import { nextUserFixture } from '@/engine/seasonProgression';
import { availableSquad } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import { getFormation, MAX_SUBS } from '@/engine/gameRules';
import { computeHighlights } from '@/engine/highlights';
import MatchPitchView from './MatchPitchView';
import MatchHighlights from './MatchHighlights';

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
  const [paused, setPaused] = useState(false);
  const [liveTactics, setLiveTactics] = useState<Tactics>(state.tactics);
  const [tacticsDirty, setTacticsDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fixture = nextUserFixture(state);

  useEffect(() => {
    if (!fixture) return;
    setHalf1Report(simulateHalf(state, fixture.homeId, fixture.awayId, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const report = phase === 'half1' ? half1Report : phase === 'half2' ? half2Report : null;
    if (!report || phase === 'halftime' || phase === 'full' || paused) return;
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
  }, [phase, half1Report, half2Report, paused]);

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
    const rep2 = simulateHalf(state, fixture.homeId, fixture.awayId, 2, {
      userLineup: lineup,
      talk,
      userTactics: liveTactics,
    });
    setHalf2Report(rep2);
    setTacticsDirty(false);
    setMinute(45);
    setPhase('half2');
  };

  /** Resume from pause, regenerating the rest of the current half if the manager changed tactics while stopped. */
  const resumeMatch = () => {
    if (tacticsDirty && (phase === 'half1' || phase === 'half2')) {
      const capEnd = phase === 'half1' ? 44 : 89;
      const halfStart = phase === 'half1' ? 2 : 46;
      if (minute < capEnd) {
        const currentReport = phase === 'half1' ? half1Report : half2Report!;
        const tail = simulateSegment(state, fixture.homeId, fixture.awayId, minute + 1, capEnd, {
          userLineup: lineup,
          userTactics: liveTactics,
        });
        const keptEvents = currentReport.events.filter((e) => e.minute <= minute);
        const tailEvents = tail.events.filter((e) => !(e.type === 'info' && e.text === ''));
        const events = [...keptEvents, ...tailEvents].sort((a, b) => a.minute - b.minute);
        const homeGoals = events.filter((e) => e.type === 'goal' && e.clubId === fixture.homeId).length;
        const awayGoals = events.filter((e) => e.type === 'goal' && e.clubId === fixture.awayId).length;
        const elapsedFraction = Math.max(0, Math.min(1, (minute - halfStart + 1) / (capEnd - halfStart + 1)));
        const homeXG = currentReport.homeXG * elapsedFraction + tail.homeXG;
        const awayXG = currentReport.awayXG * elapsedFraction + tail.awayXG;
        const merged: MatchReport = {
          ...currentReport,
          events,
          homeGoals,
          awayGoals,
          homeXG: Math.round(homeXG * 100) / 100,
          awayXG: Math.round(awayXG * 100) / 100,
          homeLineup: [...new Set([...currentReport.homeLineup, ...tail.homeLineup])],
          awayLineup: [...new Set([...currentReport.awayLineup, ...tail.awayLineup])],
        };
        if (phase === 'half1') setHalf1Report(merged);
        else setHalf2Report(merged);
      }
    }
    setTacticsDirty(false);
    setPaused(false);
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
    if (subOut === null || subsUsed >= MAX_SUBS) return;
    setLineup((cur) => cur.map((id) => (id === subOut ? inId : id)));
    setSubsUsed((n) => n + 1);
    setSubOut(null);
  };

  const pitchFormation = getFormation(state.dualFormation?.inPossessionId || state.formationId);
  const latestEvent = shownEvents[shownEvents.length - 1];

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

      {!finished && (
        <MatchPitchView
          formation={pitchFormation}
          lineup={lineup}
          players={state.players}
          latestEvent={latestEvent}
          userClubId={state.userClubId}
        />
      )}

      {(phase === 'half1' || phase === 'half2') && !finished && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => setPaused(true)}>
            Pause
          </button>
        </div>
      )}

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
            Substitutions ({subsUsed}/{MAX_SUBS} used)
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
                  disabled={subsUsed >= MAX_SUBS}
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

      {finished && <MatchHighlights events={computeHighlights(finalReport)} />}

      <p className="fm-label">Full commentary</p>
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

      {paused && (
        <div className="fm-pause-overlay">
          <div className="fm-pause-overlay__panel">
            <p className="fm-label" style={{ marginTop: 0 }}>
              Match paused
            </p>
            <p className="fm-hint" style={{ textAlign: 'left', marginBottom: 10 }}>
              The clock&apos;s stopped — adjust tactics below, they&apos;ll kick in for the rest of the half.
            </p>

            <div className="fm-panel">
              <p className="fm-label" style={{ marginTop: 0 }}>
                Tactics
              </p>
              <div className="fm-pills" style={{ marginBottom: 8 }}>
                {(['defensive', 'balanced', 'attacking'] as TacticStyle[]).map((s) => (
                  <button
                    key={s}
                    className={`fm-pill${liveTactics.style === s ? ' active' : ''}`}
                    onClick={() => {
                      setLiveTactics({ ...liveTactics, style: s });
                      setTacticsDirty(true);
                    }}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="fm-pills" style={{ marginBottom: 8 }}>
                {(['low', 'mid', 'high'] as Pressing[]).map((p) => (
                  <button
                    key={p}
                    className={`fm-pill${liveTactics.pressing === p ? ' active' : ''}`}
                    onClick={() => {
                      setLiveTactics({ ...liveTactics, pressing: p });
                      setTacticsDirty(true);
                    }}
                  >
                    {p === 'low' ? 'Low block' : p === 'mid' ? 'Standard' : 'High press'}
                  </button>
                ))}
              </div>
              <div className="fm-pills" style={{ marginBottom: 8 }}>
                {(['slow', 'normal', 'fast'] as Tempo[]).map((t) => (
                  <button
                    key={t}
                    className={`fm-pill${liveTactics.tempo === t ? ' active' : ''}`}
                    onClick={() => {
                      setLiveTactics({ ...liveTactics, tempo: t });
                      setTacticsDirty(true);
                    }}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div className="fm-pills">
                {(['narrow', 'standard', 'wide'] as Width[]).map((w) => (
                  <button
                    key={w}
                    className={`fm-pill${liveTactics.width === w ? ' active' : ''}`}
                    onClick={() => {
                      setLiveTactics({ ...liveTactics, width: w });
                      setTacticsDirty(true);
                    }}
                  >
                    {w[0].toUpperCase() + w.slice(1)}
                  </button>
                ))}
              </div>
              {tacticsDirty && (
                <p className="fm-hint" style={{ textAlign: 'left', marginTop: 8, marginBottom: 0 }}>
                  Changes apply to the rest of this half when you resume.
                </p>
              )}
            </div>

            <div className="fm-panel">
              <p className="fm-label" style={{ marginTop: 0 }}>
                On the pitch
              </p>
              <div className="fm-player-list">
                {lineup
                  .filter((id): id is number => id !== null)
                  .map((id) => state.players[id])
                  .filter((p): p is Player => !!p)
                  .map((p) => (
                    <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`}>
                      <span className="fm-player-row__badge">{p.role}</span>
                      <span className="fm-player-row__name">{p.name}</span>
                      <span className="fm-player-row__rating">{p.rating}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="fm-panel">
              <p className="fm-label" style={{ marginTop: 0 }}>
                Bench
              </p>
              <div className="fm-player-list">
                {bench.map((p) => (
                  <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`}>
                    <span className="fm-player-row__badge">{p.role}</span>
                    <span className="fm-player-row__name">{p.name}</span>
                    <span className="fm-player-row__rating">{p.rating}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="fm-panel">
              <p className="fm-label" style={{ marginTop: 0 }}>
                Club snapshot
              </p>
              <p className="fm-club-line">Budget: {formatMoney(state.budget)}</p>
              <p className="fm-club-line">Board confidence: {state.board.confidence}</p>
              <p className="fm-club-line" style={{ marginBottom: 0 }}>
                Fan confidence: {state.fanConfidence}
              </p>
            </div>

            <div className="fm-actions">
              <button className="fm-btn fm-btn--primary fm-btn--large" onClick={resumeMatch}>
                Resume match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

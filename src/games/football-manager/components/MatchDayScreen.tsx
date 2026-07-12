'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, MatchReport, Player, Pressing, TacticStyle, Tactics, Tempo, Width, GameSettings, MatchSpeed } from '@/engine/types';
import { mergeReports, simulateHalf, simulateSegment, type TeamTalk } from '@/engine/matchSimulation';
import { nextUserFixture } from '@/engine/seasonProgression';
import { availableSquad } from '@/engine/teamManagement';
import { getFormation, MAX_SUBS } from '@/engine/gameRules';
import { computeHighlights } from '@/engine/highlights';
import Live2DPitch from './live2d/Live2DPitch';
import MatchPitchView from './MatchPitchView';
import MatchHighlights from './MatchHighlights';
import { StatTile } from './visuals';

type Phase = 'half1' | 'halftime' | 'half2' | 'full';

const SPEED_INTERVAL: Record<MatchSpeed, number> = {
  slow: 140,
  normal: 80,
  fast: 40,
  instant: 0,
};

export default function MatchDayScreen({
  state,
  settings,
  onDone,
}: {
  state: GameState;
  settings: GameSettings;
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
  const [live2dFailed, setLive2dFailed] = useState(false);
  const [liveTactics, setLiveTactics] = useState<Tactics>(state.tactics);
  const [tacticsDirty, setTacticsDirty] = useState(false);
  const [speed, setSpeed] = useState<MatchSpeed>(settings.matchSpeed);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fixture = nextUserFixture(state);

  useEffect(() => {
    if (!fixture) return;
    setHalf1Report(simulateHalf(state, fixture.homeId, fixture.awayId, 1, { difficulty: settings.difficulty }));
  }, [fixture]);

  // Auto-sim: skip straight to full time if instant speed
  useEffect(() => {
    if (speed === 'instant' && half1Report && phase === 'half1' && fixture) {
      const rep2 = simulateHalf(state, fixture.homeId, fixture.awayId, 2, { difficulty: settings.difficulty });
      setHalf2Report(rep2);
      setPhase('full');
    }
  }, [speed, half1Report, phase, state, fixture]);

  useEffect(() => {
    const report = phase === 'half1' ? half1Report : phase === 'half2' ? half2Report : null;
    if (!report || phase === 'halftime' || phase === 'full' || paused || speed === 'instant') return;
    const interval = SPEED_INTERVAL[speed];
    timer.current = setInterval(() => {
      setMinute((m) => {
        const cap = phase === 'half1' ? 45 : 90;
        if (m >= cap) {
          if (timer.current) clearInterval(timer.current);
          return cap;
        }
        return m + 1;
      });
    }, interval);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, half1Report, half2Report, paused, speed]);

  // Auto-advance when timer reaches end of half
  useEffect(() => {
    if (phase === 'half1' && minute >= 45) {
      const t = setTimeout(() => setPhase('halftime'), 300);
      return () => clearTimeout(t);
    }
  }, [phase, minute]);

  // Auto-advance to full when second half completes
  useEffect(() => {
    if (phase === 'half2' && minute >= 90) {
      const t = setTimeout(() => setPhase('full'), 300);
      return () => clearTimeout(t);
    }
  }, [phase, minute]);

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
      difficulty: settings.difficulty,
    });
    setHalf2Report(rep2);
    setTacticsDirty(false);
    setMinute(45);
    setPhase('half2');
  };

  const resumeMatch = () => {
    if (tacticsDirty && (phase === 'half1' || phase === 'half2')) {
      const capEnd = phase === 'half1' ? 44 : 89;
      const halfStart = phase === 'half1' ? 2 : 46;
      if (minute < capEnd) {
        const currentReport = phase === 'half1' ? half1Report : half2Report!;
        const tail = simulateSegment(state, fixture.homeId, fixture.awayId, minute + 1, capEnd, {
          userLineup: lineup,
          userTactics: liveTactics,
          difficulty: settings.difficulty,
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
  const matchProgress = finished ? 100 : (minute / 90) * 100;
  const minuteLabel = phase === 'halftime' ? 'HALF TIME' : finished ? 'FULL TIME' : `${minute}'`;
  const minuteClass = phase === 'halftime' ? ' halftime' : finished ? ' fulltime' : '';

  return (
    <div className="fm-screen">
      {/* Enhanced Scoreboard */}
      <div className="fm-scoreboard">
        <div className="fm-scoreboard__team">
          {home && (
            <span className="fm-scoreboard__team-badge" style={{ background: home.color }}>
              {home.code}
            </span>
          )}
          <div>{home?.name}</div>
          <span className="code">HOME</span>
        </div>
        <div className="fm-scoreboard__center">
          <div className={`fm-scoreboard__minute${minuteClass}`}>{minuteLabel}</div>
          <div className="fm-scoreboard__score">
            {homeGoals} – {awayGoals}
          </div>
          {finished && (
            <div className="fm-scoreboard__xg">
              xG {finalReport.homeXG.toFixed(1)} – {finalReport.awayXG.toFixed(1)}
            </div>
          )}
        </div>
        <div className="fm-scoreboard__team">
          {away && (
            <span className="fm-scoreboard__team-badge" style={{ background: away.color }}>
              {away.code}
            </span>
          )}
          <div>{away?.name}</div>
          <span className="code">AWAY</span>
        </div>
      </div>

      {/* Match progress bar */}
      {!finished && (
        <div className="fm-match-progress">
          <div className="fm-match-progress__fill" style={{ width: `${matchProgress}%` }} />
        </div>
      )}

      {/* 2D Pitch */}
      {!finished && settings.show2DPitch && !live2dFailed && (
        <Live2DPitch
          homeFormation={pitchFormation}
          homeLineup={lineup}
          homeClub={home}
          awayClub={away}
          players={state.players}
          latestEvent={latestEvent}
          paused={paused || phase === 'halftime' || speed === 'instant'}
          onError={() => setLive2dFailed(true)}
        />
      )}
      {!finished && settings.show2DPitch && live2dFailed && (
        <MatchPitchView
          formation={pitchFormation}
          lineup={lineup}
          players={state.players}
          latestEvent={latestEvent}
          userClubId={state.userClubId}
        />
      )}

      {/* Live event ticker */}
      {!finished && latestEvent && latestEvent.type !== 'info' && (
        <div className={`fm-event-ticker${latestEvent.type === 'goal' ? ' fm-event-ticker--goal' : latestEvent.type === 'card' ? ' fm-event-ticker--card' : latestEvent.type === 'injury' ? ' fm-event-ticker--injury' : ''}`}>
          <span className="fm-event-ticker__icon">
            {latestEvent.type === 'goal' ? '⚽' : latestEvent.type === 'card' ? '🟨' : latestEvent.type === 'injury' ? '🚑' : '▶'}
          </span>
          <span className="fm-event-ticker__text">{latestEvent.text}</span>
          <span className="fm-event-ticker__min">{latestEvent.minute}&apos;</span>
        </div>
      )}

      {/* Match controls */}
      {!finished && phase !== 'halftime' && speed !== 'instant' && (
        <div className="fm-match-controls">
          <button
            className={`fm-speed-btn${speed === 'slow' ? ' active' : ''}`}
            onClick={() => setSpeed('slow')}
          >
            0.5x
          </button>
          <button
            className={`fm-speed-btn${speed === 'normal' ? ' active' : ''}`}
            onClick={() => setSpeed('normal')}
          >
            1x
          </button>
          <button
            className={`fm-speed-btn${speed === 'fast' ? ' active' : ''}`}
            onClick={() => setSpeed('fast')}
          >
            2x
          </button>
          <button
            className="fm-speed-btn"
            onClick={() => setSpeed('instant')}
          >
            ⏭ Skip
          </button>
          {!paused ? (
            <button className="fm-skip-btn" onClick={() => setPaused(true)}>⏸ Pause</button>
          ) : (
            <button className="fm-skip-btn" onClick={resumeMatch}>▶ Resume</button>
          )}
        </div>
      )}

      {/* Half time skip buttons */}
      {phase === 'half1' && minute >= 45 && !finished && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--primary fm-btn--large" onClick={startHalfTime}>
            Go to the dressing room →
          </button>
        </div>
      )}
      {phase === 'half2' && minute < 90 && !finished && speed !== 'instant' && (
        <div className="fm-actions">
          <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={() => setMinute(90)}>
            Skip to full time
          </button>
        </div>
      )}

      {/* Half time panel */}
      {phase === 'halftime' && (
        <div className="fm-halftime">
          <div className="fm-halftime__header">
            <span className="fm-halftime__title">HALF TIME</span>
            <span className="fm-card__meta">{homeGoals} – {awayGoals}</span>
          </div>
          <div className="fm-halftime__body">
            {settings.showTeamTalks && (
              <div>
                <div className="fm-sub-section__title">Team talk</div>
                <div className="fm-talk-grid">
                  <button className="fm-talk-card" onClick={() => startSecondHalf('calm')}>
                    <span className="fm-talk-card__icon">😌</span>
                    <span className="fm-talk-card__label">Calm</span>
                    <span className="fm-talk-card__desc">Steady the ship</span>
                  </button>
                  <button className="fm-talk-card" onClick={() => startSecondHalf('encourage')}>
                    <span className="fm-talk-card__icon">👏</span>
                    <span className="fm-talk-card__label">Encourage</span>
                    <span className="fm-talk-card__desc">Positive push</span>
                  </button>
                  <button className="fm-talk-card" onClick={() => startSecondHalf('hairdryer')}>
                    <span className="fm-talk-card__icon">🔥</span>
                    <span className="fm-talk-card__label">Hairdryer</span>
                    <span className="fm-talk-card__desc">Risky fire-up</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="fm-sub-section__title">
                Subs ({subsUsed}/{MAX_SUBS}) {subOut !== null && '· Pick replacement'}
              </div>
              <div className="fm-sub-grid">
                <div>
                  <div className="fm-sub-section__title">On pitch</div>
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
                </div>
                {subOut !== null && (
                  <div>
                    <div className="fm-sub-section__title">Bench</div>
                    <div className="fm-player-list">
                      {bench.map((p) => (
                        <button key={p.id} className={`fm-player-row fm-pos-${p.pos} highlight`} onClick={() => makeSub(p.id)}>
                          <span className="fm-player-row__badge">{p.role}</span>
                          <span className="fm-player-row__name">{p.name}</span>
                          <span className="fm-player-row__rating">{p.rating}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="fm-actions">
              <button className="fm-btn fm-btn--primary fm-btn--large" onClick={() => startSecondHalf()}>
                Start second half →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full time */}
      {finished && (
        <>
          <div className="fm-actions">
            <button className="fm-btn fm-btn--primary fm-btn--large" onClick={() => onDone(finalReport)}>
              Continue →
            </button>
          </div>
          <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 10 }}>
            <StatTile icon="⚽" value={homeGoals + awayGoals} label="Goals" />
            <StatTile icon="📊" value={(finalReport.homeXG + finalReport.awayXG).toFixed(1)} label="xG" />
            <StatTile icon="🟨" value={shownEvents.filter((e) => e.type === 'card').length} label="Cards" />
            <StatTile icon="🚑" value={shownEvents.filter((e) => e.type === 'injury').length} label="Injuries" />
          </div>
          <MatchHighlights events={computeHighlights(finalReport)} />
        </>
      )}

      {/* Commentary feed */}
      {settings.showCommentary && (
        <>
          <p className="fm-label">Commentary</p>
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
                <span>
                  {e.type === 'goal' ? '⚽ ' : e.type === 'card' ? '🟨 ' : e.type === 'injury' ? '🚑 ' : ''}
                  {e.text}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Pause overlay */}
      {paused && (
        <div className="fm-pause-overlay">
          <div className="fm-pause-overlay__panel">
            <div className="fm-panel fm-panel--elevated">
              <p className="fm-label" style={{ marginTop: 0 }}>Match paused</p>

              <p className="fm-label">Style</p>
              <div className="fm-pills" style={{ marginBottom: 6 }}>
                {(['defensive', 'balanced', 'attacking'] as TacticStyle[]).map((s) => (
                  <button
                    key={s}
                    className={`fm-pill${liveTactics.style === s ? ' active' : ''}`}
                    onClick={() => { setLiveTactics({ ...liveTactics, style: s }); setTacticsDirty(true); }}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <p className="fm-label">Pressing</p>
              <div className="fm-pills" style={{ marginBottom: 6 }}>
                {(['low', 'mid', 'high'] as Pressing[]).map((p) => (
                  <button
                    key={p}
                    className={`fm-pill${liveTactics.pressing === p ? ' active' : ''}`}
                    onClick={() => { setLiveTactics({ ...liveTactics, pressing: p }); setTacticsDirty(true); }}
                  >
                    {p === 'low' ? 'Low block' : p === 'mid' ? 'Standard' : 'High press'}
                  </button>
                ))}
              </div>
              <p className="fm-label">Tempo</p>
              <div className="fm-pills" style={{ marginBottom: 6 }}>
                {(['slow', 'normal', 'fast'] as Tempo[]).map((t) => (
                  <button
                    key={t}
                    className={`fm-pill${liveTactics.tempo === t ? ' active' : ''}`}
                    onClick={() => { setLiveTactics({ ...liveTactics, tempo: t }); setTacticsDirty(true); }}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <p className="fm-label">Width</p>
              <div className="fm-pills">
                {(['narrow', 'standard', 'wide'] as Width[]).map((w) => (
                  <button
                    key={w}
                    className={`fm-pill${liveTactics.width === w ? ' active' : ''}`}
                    onClick={() => { setLiveTactics({ ...liveTactics, width: w }); setTacticsDirty(true); }}
                  >
                    {w[0].toUpperCase() + w.slice(1)}
                  </button>
                ))}
              </div>
              {tacticsDirty && (
                <p className="fm-hint" style={{ textAlign: 'left', marginTop: 6, marginBottom: 0 }}>
                  Changes apply to the rest of this half.
                </p>
              )}
            </div>

            <div className="fm-actions">
              <button className="fm-btn fm-btn--primary fm-btn--large" onClick={resumeMatch}>
                ▶ Resume match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

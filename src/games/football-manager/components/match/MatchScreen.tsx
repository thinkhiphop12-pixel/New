'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameSettings, GameState, MatchReport, Player } from '@/engine/types';
import { nextUserFixture } from '@/engine/seasonProgression';
import { availableSquad } from '@/engine/teamManagement';
import { DIVISION_NAMES, MAX_SUBS } from '@/engine/gameRules';
import { computeHighlights } from '@/engine/highlights';
import { simulateTickMatch } from '@/engine/tickEngine/sim';
import { MENTALITIES, MENTALITY_ORDER, normalizeMentality, type MentalityId } from '@/engine/tickEngine/tacticsData';
import { ratingsFromCounts } from '@/engine/tickEngine/ratings';
import type { MatchTimeline, MinuteSnapshot, ResumeContext, TeamSide, TickMatchEvent } from '@/engine/tickEngine/types';
import MatchHighlights from '../MatchHighlights';
import { StatTile } from '../visuals';
import PitchCanvas from './PitchCanvas';
import LineupScreen from './LineupScreen';
import StatsOverlay from './StatsOverlay';
import TacticsModal, { type TacticsSelection } from './TacticsModal';

const SPEEDS = [1, 2, 4, 8];
const MS_PER_MINUTE = 640;
const HIGHLIGHT_DOTS = 14;

function eventIcon(e: TickMatchEvent): string {
  if (e.type === 'goal') return '⚽';
  if (e.type === 'card') return e.card === 'red' ? '🟥' : '🟨';
  if (e.type === 'injury') return '🚑';
  if (e.kind === 'sub') return '🔁';
  if (e.kind === 'corner') return '🚩';
  return '▶';
}

export default function MatchScreen({
  state,
  settings,
  onDone,
}: {
  state: GameState;
  settings: GameSettings;
  onDone: (report: MatchReport) => void;
}) {
  const fixture = nextUserFixture(state);
  const [timeline, setTimeline] = useState<MatchTimeline | null>(null);
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState(() => (settings.matchSpeed === 'slow' ? 1 : settings.matchSpeed === 'fast' ? 4 : 2));
  const [kickedOff, setKickedOff] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showTactics, setShowTactics] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [subOut, setSubOut] = useState<number | null>(null);
  const [htShown, setHtShown] = useState(false);
  const [showHt, setShowHt] = useState(false);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const userIsHome = fixture?.homeId === state.userClubId;
  const userSide: TeamSide = userIsHome ? 'home' : 'away';

  useEffect(() => {
    if (!fixture) return;
    const tl = simulateTickMatch(state, fixture.homeId, fixture.awayId, {
      userLineup: state.lineup,
      userMentality: normalizeMentality(state.tactics.mentality),
      userTactics: state.tactics,
      difficulty: settings.difficulty,
    });
    setTimeline(tl);
    if (settings.matchSpeed === 'instant') {
      setKickedOff(true);
      setMinute(90);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finished = minute >= 90;
  const overlayOpen = showTactics || showSubs || showHt || showMenu || showEvents;

  // Replay clock.
  useEffect(() => {
    if (!timeline || !kickedOff || paused || finished || overlayOpen) return;
    const t = setInterval(() => setMinute((m) => Math.min(90, m + 1)), MS_PER_MINUTE / speed);
    return () => clearInterval(t);
  }, [timeline, kickedOff, paused, finished, overlayOpen, speed]);

  // Half-time pause.
  useEffect(() => {
    if (minute >= 45 && !htShown && !finished) {
      setHtShown(true);
      setShowHt(true);
    }
  }, [minute, htShown, finished]);

  const snap: MinuteSnapshot | undefined = useMemo(() => {
    if (!timeline) return undefined;
    let cur: MinuteSnapshot | undefined;
    for (const sn of timeline.snapshots) {
      if (sn.minute > minute) break;
      cur = sn;
    }
    return cur;
  }, [timeline, minute]);

  const shownEvents = useMemo(
    () => (timeline ? timeline.events.filter((e) => e.minute <= minute) : []),
    [timeline, minute]
  );

  // Stick the feed to the newest line.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shownEvents.length, showEvents]);

  const liveRatings = useMemo(() => {
    if (!snap) return {};
    const r = snap.resume;
    return ratingsFromCounts(
      { ...r.home.counts, ...r.away.counts },
      { home: r.home.appeared, away: r.away.appeared },
      snap.score
    );
  }, [snap]);

  if (!fixture) return null;
  if (!timeline) {
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
  const score = finished
    ? { home: timeline.report.homeGoals, away: timeline.report.awayGoals }
    : snap?.score ?? { home: 0, away: 0 };
  const stats = snap?.stats ?? {
    home: { possession: 50, shots: 0, onTarget: 0, xg: 0, corners: 0, fouls: 0 },
    away: { possession: 50, shots: 0, onTarget: 0, xg: 0, corners: 0, fouls: 0 },
  };

  const userCtx = snap?.resume[userSide];
  const subsUsed = userCtx?.subsUsed ?? 0;
  const currentLineup = userCtx?.lineup ?? state.lineup;
  const currentMentality: MentalityId = userCtx?.mentality ?? normalizeMentality(state.tactics.mentality);
  const currentFormationId = userCtx?.formationId ?? state.dualFormation?.inPossessionId ?? state.formationId;
  const usedIds = new Set([...(userCtx?.appeared ?? currentLineup.filter((id) => id !== null) as number[]), ...(userCtx?.sentOff ?? [])]);
  const bench = availableSquad(state, state.userClubId).filter((p) => !usedIds.has(p.id));

  const firstSnap = timeline.snapshots[0];
  const homeStartCtx = firstSnap?.resume.home;
  const awayStartCtx = firstSnap?.resume.away;

  /** Re-simulate the remainder of the match from the current minute. */
  const intervene = (mutate: (ctx: ResumeContext) => void) => {
    if (finished) return;
    if (!snap) return; // nothing revealed yet — changes land at minute 1 anyway
    const ctx = structuredClone(snap.resume);
    mutate(ctx);
    const tail = simulateTickMatch(state, fixture.homeId, fixture.awayId, {
      startMinute: snap.minute + 1,
      initial: ctx,
      difficulty: settings.difficulty,
    });
    const headSnaps = timeline.snapshots.filter((sn) => sn.minute <= snap.minute);
    const headEvents = timeline.events.filter((e) => e.minute <= snap.minute);
    setTimeline({
      homeId: timeline.homeId,
      awayId: timeline.awayId,
      snapshots: [...headSnaps, ...tail.snapshots],
      events: [...headEvents, ...tail.events],
      report: {
        ...tail.report,
        events: [
          ...headEvents.map(({ minute: m, type, clubId, text, playerId }) => ({ minute: m, type, clubId, text, playerId })),
          ...tail.report.events,
        ],
      },
      ratings: tail.ratings,
    });
  };

  const applyTactics = (sel: TacticsSelection) => {
    setShowTactics(false);
    intervene((ctx) => {
      const side = ctx[userSide];
      side.mentality = sel.mentality;
      side.formationId = sel.formationId;
      side.lineup = sel.lineup;
    });
  };

  const cycleMentality = () => {
    const next = MENTALITY_ORDER[(MENTALITY_ORDER.indexOf(currentMentality) + 1) % MENTALITY_ORDER.length];
    intervene((ctx) => {
      ctx[userSide].mentality = next;
    });
  };

  const makeSub = (inId: number) => {
    if (subOut === null || subsUsed >= MAX_SUBS) return;
    const outId = subOut;
    setSubOut(null);
    setShowSubs(false);
    intervene((ctx) => {
      const side = ctx[userSide];
      side.lineup = side.lineup.map((id) => (id === outId ? inId : id));
      side.subsUsed++;
      side.appeared.push(inId);
      side.fatigue[inId] = 0;
    });
  };

  const simToEnd = () => {
    setShowMenu(false);
    setKickedOff(true);
    setPaused(false);
    setShowHt(false);
    setMinute(90);
  };

  const exitMatch = () => {
    if (finished || window.confirm('Leave the touchline? The result will stand as simulated.')) onDone(timeline.report);
  };

  const minuteLabel = !kickedOff ? 'KO' : finished ? 'FT' : minute === 45 && showHt ? 'HT' : `${minute}'`;

  // Highlight progress dots: key moments already revealed light up in order.
  const highlights = timeline.events.filter(
    (e) => e.type === 'goal' || e.type === 'card' || e.kind === 'shot' || e.kind === 'save'
  );
  const passedHighlights = highlights.filter((e) => e.minute <= minute).length;

  const latestEvent = shownEvents[shownEvents.length - 1];
  const commentary = !kickedOff
    ? `${home?.name} v ${away?.name} — the teams are out at ${home?.name} Stadium`
    : latestEvent?.text ?? 'The referee gets us underway';

  const teamRating = (side: TeamSide) => {
    const ids = (snap?.resume[side].lineup ?? []).filter((id): id is number => id !== null);
    if (ids.length === 0) return 6;
    const vals = ids.map((id) => liveRatings[id] ?? 6.4);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const cardCount = (side: TeamSide) => shownEvents.filter((e) => e.type === 'card' && e.side === side).length;

  const showLineups = !kickedOff && !!homeStartCtx && !!awayStartCtx;
  const showStats = kickedOff && paused && !finished && !overlayOpen;

  return (
    <div className="fm-matchx">
      {/* FM-style angled scoreboard bar */}
      <div className="fm-fmbar">
        <button className="fm-fmbar__menu" onClick={() => setShowMenu(true)} aria-label="Match menu">
          <span /><span /><span />
        </button>
        <div className="fm-fmbar__seg fm-fmbar__seg--home">
          <span className="fm-fmbar__badge" style={{ background: home?.color }} />
          <span className="fm-fmbar__team">{home?.code}</span>
        </div>
        <div className="fm-fmbar__seg fm-fmbar__seg--score">
          {score.home} - {score.away}
        </div>
        <div className="fm-fmbar__seg fm-fmbar__seg--away">
          <span className="fm-fmbar__badge" style={{ background: away?.color }} />
          <span className="fm-fmbar__team">{away?.code}</span>
        </div>
        <div className="fm-fmbar__seg fm-fmbar__seg--clock">{minuteLabel}</div>
        <div className="fm-fmbar__dots">
          {Array.from({ length: HIGHLIGHT_DOTS }, (_, i) => (
            <span
              key={i}
              className={`fm-fmbar__dot${i < Math.min(passedHighlights, HIGHLIGHT_DOTS) ? ' lit' : ''}${
                i === Math.min(passedHighlights, HIGHLIGHT_DOTS - 1) && kickedOff && !finished ? ' now' : ''
              }`}
            />
          ))}
        </div>
        <button className="fm-fmbar__icon" onClick={() => { setSubOut(null); setShowSubs(true); }}
          disabled={finished || subsUsed >= MAX_SUBS} aria-label="Substitutions" title={`Subs ${subsUsed}/${MAX_SUBS}`}>
          ⇅
        </button>
        <button className="fm-fmbar__icon" onClick={() => setShowTactics(true)} disabled={finished} aria-label="Tactics" title="Tactics">
          ⚙
        </button>
        <button
          className="fm-fmbar__play"
          onClick={() => {
            if (!kickedOff) setKickedOff(true);
            else setPaused((p) => !p);
          }}
          disabled={finished}
          aria-label={!kickedOff || paused ? 'Play' : 'Pause'}
        >
          {!kickedOff || paused ? '▶' : '❚❚'}
        </button>
      </div>

      {/* Pitch */}
      <div className="fm-matchx__stage">
        {showLineups ? (
          <LineupScreen
            homeClub={home}
            awayClub={away}
            homeLineup={homeStartCtx.lineup}
            awayLineup={awayStartCtx.lineup}
            homeFormationId={homeStartCtx.formationId}
            awayFormationId={awayStartCtx.formationId}
            players={state.players}
            captainId={state.captainId}
          />
        ) : (
          <PitchCanvas snapshots={timeline.snapshots} minute={minute} homeClub={home} awayClub={away} resetKey={0} />
        )}
        {showStats && (
          <StatsOverlay
            homeClub={home}
            awayClub={away}
            stats={stats}
            score={score}
            momentum={snap?.momentum ?? 0}
            week={state.week}
            seasonYear={state.seasonYear}
            competition={DIVISION_NAMES[home?.division ?? 1]}
            teamRatings={{ home: teamRating('home'), away: teamRating('away') }}
            cards={{ home: cardCount('home'), away: cardCount('away') }}
            corners={{ home: stats.home.corners, away: stats.away.corners }}
          />
        )}
      </div>

      {/* Commentary ticker */}
      <div className="fm-fmticker">
        <button className="fm-fmticker__btn" onClick={() => setShowTactics(true)} disabled={finished} aria-label="Tactics">
          ⚙
        </button>
        <button className="fm-fmticker__text" onClick={() => setShowEvents(true)}>
          {commentary}
        </button>
        <button className="fm-fmticker__btn" onClick={() => { setSubOut(null); setShowSubs(true); }}
          disabled={finished || subsUsed >= MAX_SUBS} aria-label="Substitutions">
          ⇅
        </button>
      </div>

      {/* Match menu */}
      {showMenu && (
        <div className="fm-matchx-modal" onClick={() => setShowMenu(false)}>
          <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="fm-matchx-modal__head">
              <span className="fm-matchx-modal__title">Match Menu</span>
              <button className="fm-matchx-modal__close" onClick={() => setShowMenu(false)} aria-label="Close">✕</button>
            </div>
            <div className="fm-menu-list">
              <button className="fm-btn fm-btn--secondary" onClick={() => { setShowMenu(false); cycleMentality(); }} disabled={finished}>
                Mentality: {MENTALITIES[currentMentality].label} → cycle
              </button>
              <button className="fm-btn fm-btn--secondary" onClick={() => setSpeed((sp) => SPEEDS[(SPEEDS.indexOf(sp) + 1) % SPEEDS.length])}>
                Match speed: {speed}x
              </button>
              <button className="fm-btn fm-btn--secondary" onClick={() => { setShowMenu(false); setShowEvents(true); }}>
                Key events
              </button>
              <button className="fm-btn fm-btn--secondary" onClick={simToEnd} disabled={finished}>
                Sim to full time
              </button>
              <button className="fm-btn fm-btn--danger" onClick={exitMatch}>
                {finished ? 'Continue' : 'Exit match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key events sheet */}
      {showEvents && (
        <div className="fm-matchx-modal" onClick={() => setShowEvents(false)}>
          <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="fm-matchx-modal__head">
              <span className="fm-matchx-modal__title">Match Events</span>
              <button className="fm-matchx-modal__close" onClick={() => setShowEvents(false)} aria-label="Close">✕</button>
            </div>
            <div className="fm-matchx__feed" ref={feedRef}>
              {shownEvents.length === 0 && <p className="fm-hint">The teams are out…</p>}
              {shownEvents.map((e, i) => (
                <div
                  key={i}
                  className={`fm-matchx__event${e.type === 'goal' ? ' goal' : ''}${e.type === 'card' ? ' card' : ''}${e.assistant ? ' asst' : ''}`}
                >
                  <span className="fm-matchx__event-min">{e.minute}&apos;</span>
                  {e.assistant ? <span className="fm-matchx__asst-chip">ASST</span> : <span className="fm-matchx__event-icon">{eventIcon(e)}</span>}
                  <span className="fm-matchx__event-text">{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Half-time banner */}
      {showHt && !finished && (
        <div className="fm-matchx-modal">
          <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow">
            <div className="fm-matchx-modal__head">
              <span className="fm-matchx-modal__title">Half Time</span>
              <span className="fm-card__meta">{score.home} – {score.away}</span>
            </div>
            <p className="fm-hint">Adjust your tactics or make substitutions before the restart.</p>
            <div className="fm-actions">
              <button className="fm-btn fm-btn--secondary" onClick={() => { setShowHt(false); setShowTactics(true); }}>Tactics</button>
              <button className="fm-btn fm-btn--secondary" onClick={() => { setShowHt(false); setShowSubs(true); }} disabled={subsUsed >= MAX_SUBS}>
                Subs ({subsUsed}/{MAX_SUBS})
              </button>
              <button className="fm-btn fm-btn--primary" onClick={() => setShowHt(false)}>Start second half →</button>
            </div>
          </div>
        </div>
      )}

      {/* Substitutions */}
      {showSubs && (
        <div className="fm-matchx-modal" onClick={() => setShowSubs(false)}>
          <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="fm-matchx-modal__head">
              <span className="fm-matchx-modal__title">Substitution ({subsUsed}/{MAX_SUBS})</span>
              <button className="fm-matchx-modal__close" onClick={() => setShowSubs(false)} aria-label="Close">✕</button>
            </div>
            <div className="fm-sub-grid">
              <div>
                <div className="fm-sub-section__title">On pitch</div>
                <div className="fm-player-list">
                  {currentLineup
                    .filter((id): id is number => id !== null)
                    .map((id) => state.players[id])
                    .filter((p): p is Player => !!p)
                    .map((p) => (
                      <button
                        key={p.id}
                        className={`fm-player-row fm-pos-${p.pos}${subOut === p.id ? ' highlight' : ''}`}
                        onClick={() => setSubOut(subOut === p.id ? null : p.id)}
                      >
                        <span className="fm-player-row__badge">{p.role}</span>
                        <span className="fm-player-row__name">{p.name}</span>
                        <span className="fm-player-row__rating">{(liveRatings[p.id] ?? 6.4).toFixed(1)}</span>
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
        </div>
      )}

      {/* Tactics modal */}
      {showTactics && (
        <TacticsModal
          formationId={currentFormationId}
          mentality={currentMentality}
          lineup={currentLineup}
          players={state.players}
          ratings={liveRatings}
          onApply={applyTactics}
          onClose={() => setShowTactics(false)}
        />
      )}

      {/* Full time */}
      {finished && (
        <div className="fm-matchx-modal">
          <div className="fm-matchx-modal__panel">
            <div className="fm-matchx-modal__head">
              <span className="fm-matchx-modal__title">Full Time</span>
              <span className="fm-matchx__ft-score">
                {home?.code} {score.home} – {score.away} {away?.code}
              </span>
            </div>
            <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 10 }}>
              <StatTile icon="⚽" value={score.home + score.away} label="Goals" />
              <StatTile icon="📊" value={(timeline.report.homeXG + timeline.report.awayXG).toFixed(1)} label="xG" />
              <StatTile icon="🟨" value={timeline.events.filter((e) => e.type === 'card').length} label="Cards" />
              <StatTile icon="🚑" value={timeline.events.filter((e) => e.type === 'injury').length} label="Injuries" />
            </div>
            <MatchHighlights events={computeHighlights(timeline.report)} />
            <div className="fm-actions">
              <button className="fm-btn fm-btn--primary fm-btn--large" onClick={() => onDone(timeline.report)}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

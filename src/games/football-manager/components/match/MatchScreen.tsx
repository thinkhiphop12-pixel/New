'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GameSettings, GameState, MatchReport, Player } from '@/engine/types';
import { nextUserFixture } from '@/engine/seasonProgression';
import { availableSquad } from '@/engine/teamManagement';
import { MAX_SUBS, leagueName } from '@/engine/gameRules';
import { computeHighlights } from '@/engine/highlights';
import { simulateTickMatch } from '@/engine/tickEngine/sim';
import { MENTALITIES, MENTALITY_ORDER, normalizeMentality, type MentalityId } from '@/engine/tickEngine/tacticsData';
import { ratingsFromCounts } from '@/engine/tickEngine/ratings';
import type { MatchTimeline, MinuteSnapshot, ResumeContext, TeamSide, TickMatchEvent } from '@/engine/tickEngine/types';
import type { TeamTalkOutcome } from '@/engine/teamTalk';
import MatchHighlights from '../MatchHighlights';
import { Crest } from '../Crest';
import ManagerAvatar from '../ManagerAvatar';
import { StatTile } from '../visuals';
import { Icon } from '../Icon';
import { RotatePrompt } from '../RotatePrompt';
import PitchCanvas from './PitchCanvas';
import LineupScreen from './LineupScreen';
import MatchPreview from './MatchPreview';
import StatsOverlay from './StatsOverlay';
import TacticsModal, { type TacticsSelection } from './TacticsModal';
import TeamTalkModal from './TeamTalkModal';
import GoalCelebration from './GoalCelebration';
import { sfx, crowd } from '@/lib/sound';
import { vibrate } from '@/lib/haptics';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';

const SPEEDS = [1, 2, 4, 8];
const MS_PER_MINUTE = 640;
const HIGHLIGHT_DOTS = 14;

/** Broadcast-style minute label: "45+2'" in first-half stoppage, "90+4'" in
 *  second-half stoppage — replaces a flat "90'" once added time is real
 *  (gap 18). Extra time isn't reachable from league fixtures, so this only
 *  needs to cover the two 45-minute halves. */
function formatMinute(min: number, stoppage1: number): string {
  if (min <= 45) return `${min}'`;
  const halfEnd = 45 + stoppage1;
  if (min <= halfEnd) return `45+${min - 45}'`;
  if (min <= 90) return `${min}'`;
  return `90+${min - 90}'`;
}

function eventIcon(e: TickMatchEvent) {
  if (e.type === 'goal') return <Icon name="goal" size={14} />;
  if (e.type === 'card') return <Icon name="card" size={14} style={{ color: e.card === 'red' ? 'var(--red)' : 'var(--gold)' }} />;
  if (e.type === 'injury') return <Icon name="injury" size={14} />;
  if (e.kind === 'sub') return <Icon name="sub" size={14} />;
  if (e.kind === 'corner') return <Icon name="corner" size={14} />;
  return <Icon name="play" size={14} />;
}

export default function MatchScreen({
  state,
  settings,
  onDone,
  riskedPlayerIds,
}: {
  state: GameState;
  settings: GameSettings;
  onDone: (report: MatchReport) => void;
  /** Unfit men the manager was warned about before kick-off and started
   *  anyway (engine/preMatch.ts). They carry a raised injury risk all match. */
  riskedPlayerIds?: number[];
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
  const [showTeamTalk, setShowTeamTalk] = useState<'pre' | 'ht' | null>(null);
  const [preTalkDone, setPreTalkDone] = useState(false);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const userIsHome = fixture?.homeId === state.userClubId;
  const userSide: TeamSide = userIsHome ? 'home' : 'away';
  const teamTalksOn = settings.showTeamTalks !== false;

  useEffect(() => {
    if (!fixture) return;
    const tl = simulateTickMatch(state, fixture.homeId, fixture.awayId, {
      userLineup: state.lineup,
      userMentality: normalizeMentality(state.tactics.mentality),
      userTactics: state.tactics,
      difficulty: settings.difficulty,
      riskedPlayerIds,
    });
    setTimeline(tl);
    if (settings.matchSpeed === 'instant') {
      setKickedOff(true);
      setMinute(tl.report.matchEnd ?? 90);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The engine's real final whistle — 90 plus whatever stoppage time this
  // match actually earned (gap 18), not a hardcoded 90 that silently
  // truncated any added-time goals from ever being shown.
  const matchEnd = timeline?.report.matchEnd ?? 90;
  const stoppage1 = timeline?.report.stoppage1 ?? 0;
  const halfEnd = 45 + stoppage1;
  const finished = minute >= matchEnd;
  const overlayOpen = showTactics || showSubs || showHt || showMenu || showEvents || showTeamTalk !== null;

  // Full-time whistle + stop the crowd ambience, once, when the match ends.
  const ftPlayedRef = useRef(false);
  useEffect(() => {
    if (finished && !ftPlayedRef.current) {
      ftPlayedRef.current = true;
      sfx.whistle('full');
      crowd.stop();
    }
  }, [finished]);

  // Crowd loop always stops when the screen unmounts (e.g. exiting mid-match).
  useEffect(() => () => crowd.stop(), []);

  // Replay clock.
  useEffect(() => {
    if (!timeline || !kickedOff || paused || finished || overlayOpen) return;
    const t = setInterval(() => setMinute((m) => Math.min(matchEnd, m + 1)), MS_PER_MINUTE / speed);
    return () => clearInterval(t);
  }, [timeline, kickedOff, paused, finished, overlayOpen, speed, matchEnd]);

  // Half-time pause, once real added time for the first half has played out.
  useEffect(() => {
    if (minute >= halfEnd && !htShown && !finished) {
      setHtShown(true);
      setShowHt(true);
    }
  }, [minute, halfEnd, htShown, finished]);

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

  // Momentum over time, up to the current minute — feeds the SVG momentum
  // graph in StatsOverlay (previously just a single live bar).
  const momentumSeries = useMemo(
    () => (timeline ? timeline.snapshots.filter((sn) => sn.minute <= minute).map((sn) => ({ minute: sn.minute, value: sn.momentum })) : []),
    [timeline, minute]
  );

  // Stick the feed to the newest line.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shownEvents.length, showEvents]);

  // Brief scoreboard flash on a goal (Phase 14's .fm-flash keyframe, first
  // real wiring of it — it shipped as a ready utility with nothing using it
  // yet). Tracks total goals rather than home/away separately so an own
  // goal or a goal for either side both trigger it.
  const [scoreFlash, setScoreFlash] = useState(false);
  const [celebrationScorer, setCelebrationScorer] = useState<string | null>(null);
  const [celebrationMinute, setCelebrationMinute] = useState<number>(0);
  const prevGoalsRef = useRef(0);
  const prevScoreRef = useRef({ home: 0, away: 0 });
  useEffect(() => {
    const home = snap?.score.home ?? 0;
    const away = snap?.score.away ?? 0;
    const total = home + away;
    if (total > prevGoalsRef.current) {
      setScoreFlash(true);
      const flashTimer = setTimeout(() => setScoreFlash(false), 1000);

      const userScored = userIsHome ? home > prevScoreRef.current.home : away > prevScoreRef.current.away;
      sfx.goal(userScored ? 'for' : 'against');
      vibrate('goal');

      let celebrationTimer: ReturnType<typeof setTimeout> | undefined;
      if (userScored) {
        const lastGoal = [...(timeline?.events ?? [])].reverse().find((e) => e.type === 'goal' && e.minute <= minute);
        const scorerName = lastGoal?.playerId != null ? state.players[lastGoal.playerId]?.name : undefined;
        setCelebrationScorer(scorerName ?? '');
        // The goal's own minute, not the clock's — at 4× speed the replay has
        // usually ticked past by the time this runs.
        setCelebrationMinute(lastGoal?.minute ?? minute);
        celebrationTimer = setTimeout(() => setCelebrationScorer(null), 2200);
      }

      prevGoalsRef.current = total;
      prevScoreRef.current = { home, away };
      return () => {
        clearTimeout(flashTimer);
        if (celebrationTimer) clearTimeout(celebrationTimer);
      };
    }
    prevGoalsRef.current = total;
    prevScoreRef.current = { home, away };
  }, [snap?.score.home, snap?.score.away, userIsHome, timeline, minute, state.players]);

  // Card sound on the newest revealed event.
  const prevEventCountRef = useRef(0);
  useEffect(() => {
    if (shownEvents.length > prevEventCountRef.current) {
      const latest = shownEvents[shownEvents.length - 1];
      if (latest?.type === 'card') sfx.card();
    }
    prevEventCountRef.current = shownEvents.length;
  }, [shownEvents]);

  // Crowd bed follows momentum. `crowd.setLevel` shipped in lib/sound.ts with
  // no caller, so the ambience was a flat drone for the full 90 minutes —
  // present, but carrying no information. Driving it from the snapshot's
  // momentum (-1..1, positive favours home) makes the stadium lift while the
  // player's side is on top and fall away when they are pinned back, which is
  // the single cheapest source of match tension available.
  useEffect(() => {
    if (!kickedOff || finished) return;
    const m = snap?.momentum ?? 0;
    const userMomentum = userIsHome ? m : -m;
    crowd.setLevel((userMomentum + 1) / 2);
  }, [snap?.momentum, userIsHome, kickedOff, finished]);

  useKeyboardShortcuts(
    {
      Space: (e) => {
        e.preventDefault();
        if (overlayOpen) return;
        if (!kickedOff) {
          setKickedOff(true);
          sfx.whistle('short');
          crowd.start();
          vibrate('whistle');
        } else if (!finished) {
          setPaused((p) => !p);
        }
      },
      '1': () => setSpeed(SPEEDS[0]),
      '2': () => setSpeed(SPEEDS[1]),
      '3': () => setSpeed(SPEEDS[2]),
      '4': () => setSpeed(SPEEDS[3]),
      Escape: () => {
        if (showMenu) setShowMenu(false);
        else if (showEvents) setShowEvents(false);
        else if (showTactics) setShowTactics(false);
        else if (showSubs) setShowSubs(false);
        else if (showTeamTalk !== null) setShowTeamTalk(null);
      },
      t: () => {
        if (!overlayOpen && !finished) setShowTactics(true);
      },
      s: () => {
        if (!overlayOpen && !finished) {
          setSubOut(null);
          setShowSubs(true);
        }
      },
    },
    [kickedOff, finished, overlayOpen, showMenu, showEvents, showTactics, showSubs, showTeamTalk]
  );

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
      riskedPlayerIds,
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

  // Gap 4 (Userbrain): speed was only reachable via the unlabeled 3-dot
  // "Match menu" — testers didn't find it during a slow 0-0 first half.
  // Promote a one-tap cycle into the always-visible bar itself.
  const cycleSpeed = () => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);

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

  const applyHtTalk = (outcome: TeamTalkOutcome) => {
    const delta = outcome.momentumDelta * (userIsHome ? 1 : -1);
    intervene((ctx) => {
      ctx.momentum = Math.max(-1, Math.min(1, ctx.momentum + delta));
    });
  };

  const applyPreTalk = (outcome: TeamTalkOutcome) => {
    if (!fixture) return;
    setPreTalkDone(true);
    const delta = outcome.momentumDelta * (userIsHome ? 1 : -1);
    const tl = simulateTickMatch(state, fixture.homeId, fixture.awayId, {
      userLineup: state.lineup,
      userMentality: normalizeMentality(state.tactics.mentality),
      userTactics: state.tactics,
      difficulty: settings.difficulty,
      riskedPlayerIds,
      initialMomentum: delta,
    });
    setTimeline(tl);
  };

  const simToEnd = () => {
    setShowMenu(false);
    setKickedOff(true);
    setPaused(false);
    setShowHt(false);
    setMinute(matchEnd);
  };

  const exitMatch = () => {
    if (finished || window.confirm('Leave the touchline? The result will stand as simulated.')) onDone(timeline.report);
  };

  const minuteLabel = !kickedOff ? 'KO' : finished ? 'FT' : minute >= halfEnd && showHt ? 'HT' : formatMinute(minute, stoppage1);

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
      <RotatePrompt />
      {/* FM-style angled scoreboard bar */}
      <div className="fm-fmbar">
        <button className="fm-fmbar__menu" onClick={() => setShowMenu(true)} aria-label="Match menu" title="More match options">
          <span /><span /><span />
          <span className="fm-fmbar__menu-label">More</span>
        </button>
        <div className="fm-fmbar__seg fm-fmbar__seg--home">
          {userIsHome && state.managerProfile && (
            <ManagerAvatar
              config={state.managerProfile.avatarConfig}
              size={20}
              title={state.managerProfile.name}
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
          )}
          <Crest name={home?.name} code={home?.code ?? ''} color={home?.color ?? 'var(--panel-3)'} size={22} />
          <span className="fm-fmbar__team">{home?.code}</span>
        </div>
        <div
          key={`${score.home}-${score.away}`}
          className={`fm-fmbar__seg fm-fmbar__seg--score${scoreFlash ? ' fm-flash' : ''}`}
        >
          {score.home} - {score.away}
        </div>
        <div className="fm-fmbar__seg fm-fmbar__seg--away">
          <Crest name={away?.name} code={away?.code ?? ''} color={away?.color ?? 'var(--panel-3)'} size={22} />
          <span className="fm-fmbar__team">{away?.code}</span>
          {!userIsHome && state.managerProfile && (
            <ManagerAvatar
              config={state.managerProfile.avatarConfig}
              size={20}
              title={state.managerProfile.name}
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
          )}
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
        {teamTalksOn && !kickedOff && (
          <button className="fm-fmbar__icon" onClick={() => setShowTeamTalk('pre')} disabled={preTalkDone}
            aria-label="Team talk" title={preTalkDone ? 'Team talk given' : 'Team talk'}>
            <Icon name="mic" size={16} />
          </button>
        )}
        <button className="fm-fmbar__icon" onClick={() => { setSubOut(null); setShowSubs(true); }}
          disabled={finished || subsUsed >= MAX_SUBS} aria-label="Substitutions" title={`Subs ${subsUsed}/${MAX_SUBS}`}>
          <Icon name="sub" size={16} />
        </button>
        <button className="fm-fmbar__icon" onClick={() => setShowTactics(true)} disabled={finished} aria-label="Tactics" title="Tactics">
          <Icon name="settings" size={16} />
        </button>
        <button
          className="fm-fmbar__speed"
          onClick={cycleSpeed}
          disabled={finished}
          aria-label={`Match speed ${speed}x, tap to change`}
          title="Match speed — tap to cycle"
        >
          {speed}x
        </button>
        <button
          className={`fm-fmbar__play${!kickedOff ? ' fm-fmbar__play--cta' : ''}`}
          onClick={() => {
            if (!kickedOff) {
              setKickedOff(true);
              sfx.whistle('short');
              crowd.start();
              vibrate('whistle');
            } else {
              setPaused((p) => !p);
            }
          }}
          disabled={finished}
          aria-label={!kickedOff ? 'Kick off' : paused ? 'Play' : 'Pause'}
        >
          {/* Gap 6 (Userbrain): a bare icon on a 0-0 scoreline read as
              decorative, not a control — testers repeatedly asked "what am I
              waiting for?" A text label removes the guess at the one moment
              it matters most: before kickoff. */}
          {!kickedOff ? (
            <>Kick off <Icon name="play" size={14} /></>
          ) : paused ? (
            <Icon name="play" size={15} />
          ) : (
            <Icon name="pause" size={15} />
          )}
        </button>
      </div>

      {/* Pitch */}
      <div className="fm-matchx__stage">
        {showLineups ? (
          <div className="fm-prekick">
            <MatchPreview state={state} home={home} away={away} userIsHome={userIsHome} />
            <div className="fm-prekick__sheet">
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
            </div>
          </div>
        ) : settings.show2DPitch === false ? (
          // "2D pitch" off: the match plays out as a live commentary rail
          // instead of the animated canvas. Same timeline, same events — only
          // the presentation changes, so the result is identical either way.
          <div className="fm-matchx__nopitch">
            {shownEvents.length === 0 ? (
              <p className="fm-hint">The teams are out…</p>
            ) : (
              <div className="fm-timeline">
                {shownEvents.slice(-40).map((e, i) => (
                  <div
                    key={i}
                    className={`fm-timeline__row${e.type === 'goal' ? ' fm-timeline__row--goal' : ''}${
                      e.type === 'card' ? ' fm-timeline__row--card' : ''
                    }${e.type === 'injury' ? ' fm-timeline__row--injury' : ''}`}
                  >
                    <span className="fm-timeline__min">{formatMinute(e.minute, stoppage1)}</span>
                    <span className="fm-timeline__marker">{eventIcon(e)}</span>
                    <span className="fm-timeline__text">{e.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <PitchCanvas snapshots={timeline.snapshots} minute={minute} homeClub={home} awayClub={away} resetKey={0} />
        )}
        {celebrationScorer !== null && (
          <GoalCelebration
            scorer={celebrationScorer || undefined}
            minute={celebrationMinute}
            clubColor={(userIsHome ? home : away)?.color ?? 'var(--green)'}
          />
        )}
        {showStats && (
          <StatsOverlay
            homeClub={home}
            awayClub={away}
            stats={stats}
            score={score}
            momentum={snap?.momentum ?? 0}
            momentumSeries={momentumSeries}
            week={state.week}
            seasonYear={state.seasonYear}
            competition={leagueName(home?.leagueId ?? 'premier_league')}
            teamRatings={{ home: teamRating('home'), away: teamRating('away') }}
            cards={{ home: cardCount('home'), away: cardCount('away') }}
            corners={{ home: stats.home.corners, away: stats.away.corners }}
          />
        )}
      </div>

      {/* Commentary ticker */}
      <div className="fm-fmticker">
        <button className="fm-fmticker__btn" onClick={() => setShowTactics(true)} disabled={finished} aria-label="Tactics">
          <Icon name="settings" size={15} />
        </button>
        <button className="fm-fmticker__text" onClick={() => setShowEvents(true)}>
          {commentary}
        </button>
        <button className="fm-fmticker__btn" onClick={() => { setSubOut(null); setShowSubs(true); }}
          disabled={finished || subsUsed >= MAX_SUBS} aria-label="Substitutions">
          <Icon name="sub" size={15} />
        </button>
      </div>

      {/* Match menu */}
      {showMenu && (
        <div className="fm-matchx-modal" onClick={() => setShowMenu(false)}>
          <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="fm-matchx-modal__head">
              <span className="fm-matchx-modal__title">Match Menu</span>
              <button className="fm-matchx-modal__close" onClick={() => setShowMenu(false)} aria-label="Close"><Icon name="cross" size={15} /></button>
            </div>
            <div className="fm-menu-list">
              {/* Match speed is a fixed set of steps, so it gets the shared
                  segmented row rather than a button that cycles blindly. */}
              <div className="fm-setgroup" style={{ marginBottom: 12 }}>
                <p className="fm-setgroup__title">Match speed</p>
                <div className="fm-segmented">
                  {SPEEDS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      className={`fm-segmented__opt${speed === sp ? ' active' : ''}`}
                      aria-pressed={speed === sp}
                      onClick={() => setSpeed(sp)}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="fm-menurow"
                onClick={() => { setShowMenu(false); cycleMentality(); }}
                disabled={finished}
              >
                <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': 'var(--green)' } as CSSProperties}>
                  <Icon name="tactics" size={15} />
                </span>
                <span className="fm-menurow__main">
                  <span className="fm-menurow__label">Mentality</span>
                  <span className="fm-menurow__value">{MENTALITIES[currentMentality].label} — tap to cycle</span>
                </span>
                <Icon name="chevron" size={14} />
              </button>

              <button
                type="button"
                className="fm-menurow"
                onClick={() => { setShowMenu(false); setShowEvents(true); }}
              >
                <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': 'var(--blue)' } as CSSProperties}>
                  <Icon name="stat" size={15} />
                </span>
                <span className="fm-menurow__main">
                  <span className="fm-menurow__label">Key events</span>
                  <span className="fm-menurow__value">
                    {shownEvents.length} {shownEvents.length === 1 ? 'moment' : 'moments'} so far
                  </span>
                </span>
                <Icon name="chevron" size={14} />
              </button>

              <button type="button" className="fm-menurow" onClick={simToEnd} disabled={finished}>
                <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': 'var(--gold)' } as CSSProperties}>
                  <Icon name="play" size={15} />
                </span>
                <span className="fm-menurow__main">
                  <span className="fm-menurow__label">Sim to full time</span>
                  <span className="fm-menurow__value">Skip straight to the final whistle</span>
                </span>
              </button>

              <button type="button" className="fm-menurow fm-menurow--danger" onClick={exitMatch}>
                <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': 'var(--red)' } as CSSProperties}>
                  <Icon name="cross" size={15} />
                </span>
                <span className="fm-menurow__main">
                  <span className="fm-menurow__label">{finished ? 'Continue' : 'Exit match'}</span>
                  <span className="fm-menurow__value">
                    {finished ? 'Back to the hub with the result' : 'The result will stand as simulated'}
                  </span>
                </span>
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
              <span className="fm-matchx-modal__title">Match Detail</span>
              <button className="fm-matchx-modal__close" onClick={() => setShowEvents(false)} aria-label="Close"><Icon name="cross" size={15} /></button>
            </div>

            {/* Scoreline banner: the same crest-vs-crest block the preview
                uses, with the live score in place of its "v". */}
            <div className="fm-preview" style={{ marginBottom: 12 }}>
              <div className="fm-preview__side">
                <Crest name={home?.name} code={home?.code ?? ''} color={home?.color ?? 'var(--panel-3)'} size={36} />
                <span className="fm-preview__name">{home?.name}</span>
              </div>
              <div className="fm-preview__mid">
                <span className="fm-preview__score">{score.home} – {score.away}</span>
                <span className="fm-preview__venue">{minuteLabel}</span>
              </div>
              <div className="fm-preview__side">
                <Crest name={away?.name} code={away?.code ?? ''} color={away?.color ?? 'var(--panel-3)'} size={36} />
                <span className="fm-preview__name">{away?.name}</span>
              </div>
            </div>

            <div className="fm-matchx__feed" ref={feedRef}>
              {shownEvents.length === 0 ? (
                <p className="fm-hint">The teams are out…</p>
              ) : (
                <div className="fm-timeline">
                  {shownEvents.map((e, i) => (
                    <div
                      key={i}
                      className={`fm-timeline__row${
                        e.type === 'goal' ? ' fm-timeline__row--goal' : ''
                      }${e.type === 'card' ? ' fm-timeline__row--card' : ''}${
                        e.type === 'injury' ? ' fm-timeline__row--injury' : ''
                      }`}
                    >
                      <span className="fm-timeline__min">{formatMinute(e.minute, stoppage1)}</span>
                      <span className="fm-timeline__marker">
                        {e.assistant ? <Icon name="mic" size={13} /> : eventIcon(e)}
                      </span>
                      <span className="fm-timeline__text">{e.text}</span>
                    </div>
                  ))}
                </div>
              )}
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
              {teamTalksOn && (
                <button className="fm-btn fm-btn--secondary" onClick={() => setShowTeamTalk('ht')}><Icon name="mic" size={14} /> Team Talk</button>
              )}
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
              <button className="fm-matchx-modal__close" onClick={() => setShowSubs(false)} aria-label="Close"><Icon name="cross" size={15} /></button>
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

      {/* Team talk modal */}
      {showTeamTalk && (
        <TeamTalkModal
          moment={showTeamTalk}
          scoreDiff={userIsHome ? score.home - score.away : score.away - score.home}
          onApply={showTeamTalk === 'pre' ? applyPreTalk : applyHtTalk}
          onClose={() => setShowTeamTalk(null)}
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
              <StatTile icon={<Icon name="goal" />} value={score.home + score.away} label="Goals" />
              <StatTile icon={<Icon name="stat" />} value={(timeline.report.homeXG + timeline.report.awayXG).toFixed(1)} label="xG" />
              <StatTile icon={<Icon name="card" style={{ color: 'var(--gold)' }} />} value={timeline.events.filter((e) => e.type === 'card').length} label="Cards" />
              <StatTile icon={<Icon name="injury" />} value={timeline.events.filter((e) => e.type === 'injury').length} label="Injuries" />
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

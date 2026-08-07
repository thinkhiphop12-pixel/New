'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameData, GameState, MatchReport, ScenarioId, SeasonSummary, GameSettings, ManagerProfile } from '@/engine/types';
import { endSeason, newGame, playRound, seasonOver, switchJob, nextUserFixture } from '@/engine/seasonProgression';
import { advanceDay, type DayStop } from '@/engine/dailyTick';
import { dayOfSeason, formatGameDate } from '@/engine/calendar';
import { isLineupValid } from '@/engine/teamManagement';
import { SEASON_ROUNDS } from '@/engine/gameRules';
import { simulateMatch } from '@/engine/matchSimulation';
import { applyScenario, scenarioNeedsPreseasonFastForward } from '@/engine/scenarios';
import { simulateTickMatch } from '@/engine/tickEngine/sim';
import { normalizeMentality } from '@/engine/tickEngine/tacticsData';
import { loadGameData } from '@/lib/gamedata';
import {
  clearSave, emergencySave, listSaves, loadGame, migrateLegacySaves, saveGame,
  SAVE_SLOTS, type SaveMeta,
} from '@/lib/storage';
import MainMenuScreen from './MainMenuScreen';
import NationSelectScreen from './NationSelectScreen';
import ClubSelectScreen from './ClubSelectScreen';
import ScenarioPickScreen from './ScenarioPickScreen';
import HubScreen from './HubScreen';
import DaySummaryScreen from './DaySummaryScreen';
import MatchScreen from './match/MatchScreen';
import SeasonEndScreen from './SeasonEndScreen';
import SettingsPanel, { loadSettings } from './SettingsPanel';
import MoreMenu from './MoreMenu';
import CharacterCustomizerScreen from './CharacterCustomizerScreen';
import { readableTextOn } from './visuals';
import { ToastHost, pushToast } from './ToastQueue';
import { Icon, IconSprite } from './Icon';
import type { ScreenId } from './hubNav';

type View = 'menu' | 'scenariopick' | 'nationselect' | 'clubselect' | 'hub' | 'daysummary' | 'match' | 'seasonend' | 'character';

/** How long a held SIM NEXT DAY press waits between days — fast enough that
 *  a run of quiet days feels like a montage, slow enough that the date in
 *  the dock is still readable as it changes. */
const HOLD_TICK_MS = 260;

export default function FootballManagerGame() {
  const [data, setData] = useState<GameData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Surfaced in the header: a failed write used to be swallowed, so a career
  // could silently stop persisting without the player ever being told.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gs, setGs] = useState<GameState | null>(null);
  const [slot, setSlot] = useState(0);
  const [view, setView] = useState<View>('menu');
  // Which hub screen is open, or `null` for the Hub landing. Owned here
  // rather than inside HubScreen because the `key={view}` fade wrapper
  // remounts HubScreen on every view change — local state would reset the
  // player back to the Hub every time they came out of a match.
  const [hubRoute, setHubRoute] = useState<ScreenId | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [saves, setSaves] = useState<(SaveMeta | null)[]>(Array(SAVE_SLOTS).fill(null));
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(['premier_league', 'championship', 'league_one', 'league_two']);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | undefined>(undefined);
  // Progress label for the scenario fast-forward below. Non-null means a long
  // synchronous engine job is being run in yielded chunks; see `handlePickClub`.
  const [busy, setBusy] = useState<string | null>(null);

  // The daily loop (SIM NEXT DAY). `dayStops` are what the last stopped day
  // is waiting on — kept around after the player navigates off to Inbox or
  // Transfers to resolve one, so "Continue" back on the dock reopens the
  // same summary rather than silently ticking past unresolved items.
  // `dayDigest` accumulates the quiet-day lines shown in that same summary.
  const [dayStops, setDayStops] = useState<DayStop[]>([]);
  const [dayDigest, setDayDigest] = useState<string[]>([]);
  const [holding, setHolding] = useState(false);
  // Whether a held press should keep ticking. A ref, not state — the ticking
  // loop below is a plain async function, not a React effect, so it needs a
  // value it can read synchronously between awaits without waiting on a
  // re-render.
  const holdingRef = useRef(false);

  useEffect(() => {
    loadGameData()
      .then(setData)
      .catch((e) => setLoadError(String(e)));
    // Relocate any pre-IndexedDB save and absorb an emergency blob before the
    // menu reads the index, so relocated careers appear on first paint.
    migrateLegacySaves().then(() => setSaves(listSaves()));
    setSettings(loadSettings());
    // The manager avatar is edited from the main menu before a career even
    // exists, so it needs a home outside GameState too — fall back to the
    // legacy standalone key (pre-dating GameState.managerProfile) so a
    // profile set up before starting still shows up as the default here.
    try {
      const raw = localStorage.getItem('managerProfile');
      if (raw) setManagerProfile(JSON.parse(raw));
    } catch {
      // ignore corrupt/blocked storage
    }
  }, []);

  // Views are swapped in-place (no page navigation), so the browser keeps
  // whatever scroll position the previous view was left at — a user who
  // scrolled down the club list would land mid-page on the hub, with the
  // header and tab bar scrolled out of view. Reset on every view change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  /* Persisting on every action meant compressing and writing ~4 MB per click.
   * Hold the latest state in a ref and flush on a short debounce instead; the
   * beforeunload handler below covers the window between the last action and
   * the next flush. */
  const pendingSave = useRef<{ state: GameState; slot: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(() => {
    const job = pendingSave.current;
    if (!job) return;
    pendingSave.current = null;
    saveGame(job.state, job.slot)
      .then(() => {
        setSaveError(null);
        setSaves(listSaves());
      })
      .catch((e: Error) => {
        // `saveError` was previously set here with nothing in the tree ever
        // rendering it — a save could silently stop persisting with zero
        // player-visible feedback, exactly the invisible-system risk this
        // project has repeatedly had to fix for other systems. Surface it.
        setSaveError(e.message);
        pushToast(`Save failed: ${e.message}`, 'error');
      });
  }, []);

  const apply = (next: GameState, toSlot = slot) => {
    setGs(next);
    pendingSave.current = { state: next, slot: toSlot };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 800);
  };

  // Anything still queued when the tab closes goes to the synchronous
  // emergency key, which is absorbed back into IndexedDB on the next boot.
  useEffect(() => {
    const onUnload = () => {
      const job = pendingSave.current;
      if (job) emergencySave(job.state, job.slot);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const handleContinue = (s: number) => {
    loadGame(s).then((save) => {
      if (!save) return;
      setSlot(s);
      setGs(save);
      if (save.managerProfile) setManagerProfile(save.managerProfile);
      setView('hub');
    });
  };

  const handleNewGame = (s: number) => {
    setSlot(s);
    setSelectedScenarioId(undefined);
    setView('scenariopick');
  };

  const handlePickScenario = (id: ScenarioId) => {
    setSelectedScenarioId(id);
    setView('nationselect');
  };

  const handleSkipScenario = () => {
    setSelectedScenarioId(undefined);
    setView('nationselect');
  };

  const handlePickNation = (divisions: string[]) => {
    setSelectedDivisions(divisions);
    setView('clubselect');
  };

  const handleDelete = (s: number) => {
    clearSave(s).then(() => setSaves(listSaves()));
  };

  const handlePickClub = async (clubId: number, managerName: string) => {
    if (!data || busy) return;
    let state = newGame(data, clubId, managerName, undefined, managerProfile || undefined);
    // Carry the manager avatar (edited from the main menu, or from a prior
    // career) with the save slot rather than a separate device-wide key.
    if (managerProfile) state.managerProfile = managerProfile;

    if (selectedScenarioId) {
      // Relegation Battle's premise is "you inherit this at the season's
      // halfway point" — simulate roughly half the season purely at the
      // engine level (same pattern every smoke/preview script in this repo
      // uses) before applying the scenario's budget/points/board hit, so it
      // lands on the club's actual mid-season position rather than week 1.
      if (scenarioNeedsPreseasonFastForward(selectedScenarioId)) {
        const targetWeek = Math.floor(state.week + (48 - state.week) / 2);
        // MEASURED (scripts/perf-apply2.ts, phase 0c): this loop runs 23
        // iterations at ~480ms each — 11.1 SECONDS of fully blocking
        // main-thread work, during which the tab is frozen and the club-select
        // screen shows no indication anything is happening. `playRound` is the
        // cost (the whole-league weekly tick), not the state clone, so it can't
        // be made cheap from here; instead yield to the browser between weeks
        // so the paint below actually renders and the tab stays responsive.
        // Engine calls, their order, and the resulting state are unchanged.
        const totalWeeks = Math.max(1, targetWeek - state.week);
        let guard = 0;
        while (state.week < targetWeek && !seasonOver(state) && guard < 60) {
          setBusy(`Simulating the first half of the season… ${Math.min(99, Math.round((guard / totalWeeks) * 100))}%`);
          // Yield a full macrotask so React commits the label above and the
          // browser paints it before the next ~480ms block of engine work.
          await new Promise((r) => setTimeout(r, 0));
          const fx = Object.values(state.fixtures).flat().find(
            (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId),
          );
          const report = fx
            ? simulateMatch(state, fx.homeId, fx.awayId)
            : ({ homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, events: [], playerRatings: {} } as unknown as MatchReport);
          state = playRound(state, report);
          guard++;
        }
      }
      state = applyScenario(state, selectedScenarioId);
    }

    setBusy(null);
    apply(state);
    setView('hub');
  };

  const handleMatchDone = (report: MatchReport) => {
    if (!gs) return;
    const userIsHome = report.homeId === gs.userClubId;
    const userGoals = userIsHome ? report.homeGoals : report.awayGoals;
    const oppGoals = userIsHome ? report.awayGoals : report.homeGoals;
    const oppName = gs.clubs.find((c) => c.id === (userIsHome ? report.awayId : report.homeId))?.name ?? 'opponent';
    const outcome = userGoals > oppGoals ? 'success' : userGoals < oppGoals ? 'error' : 'info';
    pushToast(`Full time: ${userGoals}-${oppGoals} vs ${oppName}`, outcome);

    const played = playRound(gs, report);
    // The match was today's stop — it's resolved now, and playRound has
    // rolled the calendar into next week, so anything still sitting in
    // `dayStops`/`dayDigest` is from a week that's now over.
    setDayStops([]);
    setDayDigest([]);
    if (seasonOver(played)) {
      const { state: next, summary: sum } = endSeason(played);
      apply(next);
      setSummary(sum);
      setView('seasonend');
    } else {
      apply(played);
      // Land on the match dashboard, not the Hub menu — the result, the
      // news and the next fixture are what you came back for.
      setHubRoute('overview');
      setView('hub');
    }
  };

  // Keeps the daily loop's async tick function reading live state without
  // being torn down and rebuilt (and losing its place mid-run) on every
  // render `apply()` causes.
  const gsRef = useRef<GameState | null>(null);
  useEffect(() => { gsRef.current = gs; }, [gs]);
  const settingsRef = useRef<GameSettings | null>(null);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  /** One tick of the daily loop. Runs the day, applies the result, and — if
   *  it produced a stop — opens the Day Summary and reports back `true` so a
   *  held press knows to stop ticking. A season that has already ended is
   *  also treated as a stop: there's nothing left for the daily loop to do
   *  until the player moves on from Season End. */
  const tickOneDay = (): boolean => {
    const current = gsRef.current;
    if (!current || seasonOver(current)) return true;
    const result = advanceDay(current, settingsRef.current ?? undefined);
    gsRef.current = result.state;
    apply(result.state);
    if (result.digest.length) setDayDigest((d) => [...d, ...result.digest]);
    if (result.stops.length) {
      setDayStops((prev) => [...prev, ...result.stops]);
      setView('daysummary');
      return true;
    }
    return false;
  };

  /** The engine underneath "Skip to Next Event": ticks days one after
   *  another — not one-at-a-time clicks — until either a stop fires (a
   *  player wants to speak to you, training produces something worth
   *  seeing, a bid lands, matchday arrives…) or, if `untilDay` is given
   *  (the Calendar screen's "Simulate to here"), that day is reached first.
   *  Runs while `holdingRef.current` stays true, which a second click on the
   *  dock (or leaving the screen) flips off — it's a plain async loop, not a
   *  React effect, so it isn't tied to any component staying mounted. */
  const runToNextEvent = async (untilDay?: number) => {
    while (holdingRef.current) {
      const current = gsRef.current;
      if (untilDay !== undefined && current && dayOfSeason(current) >= untilDay) break;
      const stopped = tickOneDay();
      if (stopped) break;
      await new Promise((r) => setTimeout(r, HOLD_TICK_MS));
    }
    holdingRef.current = false;
    setHolding(false);
  };

  /** The dock's primary button and the Calendar screen's per-day "Simulate
   *  to here" both funnel through this: skip straight to whatever needs the
   *  manager next, don't make them click through quiet days one at a time.
   *  A click while already running cancels it — useful if a target day was
   *  further out than expected and something's caught the player's eye on
   *  the way there. */
  const handleSimulate = (untilDay?: number) => {
    // A day already stopped and hasn't been acknowledged — reopen the
    // summary instead of quietly ticking past whatever it's waiting on.
    if (dayStops.length > 0) {
      setView('daysummary');
      return;
    }
    if (holdingRef.current) {
      holdingRef.current = false;
      setHolding(false);
      return;
    }
    holdingRef.current = true;
    setHolding(true);
    runToNextEvent(untilDay);
  };

  /** A stop's "resolve" action for anything that isn't matchday — send the
   *  player to the screen that can actually act on it, leaving `dayStops` in
   *  place so the pending pill can bring them back to finish reviewing. */
  const handleResolveStop = (route: ScreenId) => {
    setHubRoute(route);
    setView('hub');
  };

  const handlePrepareFromSummary = () => {
    if (!gs) return;
    if (!isLineupValid(gs, gs.userClubId, gs.lineup)) {
      setHubRoute('tactics');
      setView('hub');
      return;
    }
    handlePlayMatch();
  };

  const handleContinueFromSummary = () => {
    setDayStops([]);
    setDayDigest([]);
    setView('hub');
  };

  const handleAcceptJob = (clubId: number) => {
    if (!gs) return;
    apply(switchJob(gs, clubId));
    setView('hub');
  };

  const backToMenu = () => {
    setGs(null);
    setSaves(listSaves());
    setView('menu');
  };

  const handleAbandon = () => {
    pendingSave.current = null;
    clearSave(slot).then(backToMenu);
  };

  const handlePlayMatch = () => {
    if (settings?.autoSimMatches && gs) {
      const fixture = nextUserFixture(gs);
      if (!fixture) return;
      const { report } = simulateTickMatch(gs, fixture.homeId, fixture.awayId, {
        headless: true,
        userLineup: gs.lineup,
        userMentality: normalizeMentality(gs.tactics.mentality),
        difficulty: settings.difficulty,
      });
      handleMatchDone(report);
    } else {
      setView('match');
    }
  };

  // Where the customizer returns to when it closes. It used to hard-code the
  // main menu, which was correct while the main menu was the only way in;
  // opening it from the More Menu mid-career would otherwise have dumped the
  // manager out of a live save.
  const [characterReturn, setCharacterReturn] = useState<View>('menu');

  const handleCharacterCustomizerOpen = () => {
    if (view === 'match') return;
    setCharacterReturn(gs ? 'hub' : 'menu');
    setView('character');
  };

  const handleCharacterSave = (profile: ManagerProfile) => {
    setManagerProfile(profile);
    // Legacy key: still the source of truth before any career exists (the
    // main menu can open the customizer with no `gs` yet).
    localStorage.setItem('managerProfile', JSON.stringify(profile));
    // If a career is in progress, keep the profile travelling with the save
    // slot rather than only the device-wide key.
    if (gs) apply({ ...gs, managerProfile: profile });
    setView(characterReturn);
  };

  const handleCharacterBack = () => {
    setView(characterReturn);
  };

  // Club theming (gap 82): --brand recolours sidebar/tab/button chrome only,
  // per the contract documented in globals.css — win/loss, finance and
  // table-zone colours all stay on their own fixed tokens regardless of this.
  // No club yet (menu, club select) means --brand simply isn't overridden,
  // so those screens render with the game's own default accent unchanged.
  const themedClub = gs ? gs.clubs.find((c) => c.id === gs.userClubId) : null;
  const brandStyle = themedClub
    ? ({ '--brand': themedClub.color, '--brand-text': readableTextOn(themedClub.color) } as CSSProperties)
    : undefined;

  return (
    <div className="fm-app" style={brandStyle}>
      <IconSprite />
      <ToastHost />
      <header className="fm-header">
        <div className="fm-header__brand">
          <svg width="18" height="18" viewBox="0 0 512 512" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="fmBrandMark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2ab248" />
                <stop offset="100%" stopColor="#12b380" />
              </linearGradient>
            </defs>
            <rect x="20" y="20" width="472" height="472" rx="123" fill="url(#fmBrandMark)" />
            <text x="150" y="345" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fontSize="286" fill="#052411">B</text>
          </svg>
          <span>{"BALL"}<b>{"KNW"}</b></span>
        </div>
        <span className="fm-header__title">Gaffa</span>
        <span className="fm-header__spacer" />
        <button className="fm-header__settings" onClick={() => setShowMore(true)} aria-label="More">
          <Icon name="more" size={14} /> More
        </button>
      </header>
      <main className="fm-main">
        {/* Phase 14 screen transitions: a minimal additive wrapper around the
            existing view-swap ternary below, not a restructure of it. Keyed
            on `view` so each swap remounts (and replays) the fade — cheap
            since every branch below is already a full component swap, not a
            shared persistent tree. */}
        <div key={view} className="fm-view-fade">
        {loadError ? (
          <div className="fm-screen fm-error">
            <p className="fm-error-text">Could not load game data. Please refresh.</p>
          </div>
        ) : !data ? (
          <div className="fm-screen fm-loading">
            <div className="fm-spinner" />
            <p className="fm-hint">Loading player database…</p>
          </div>
        ) : busy ? (
          // Placed above the view chain so it wins while the scenario
          // fast-forward is mid-flight — `view` is still 'clubselect' at that
          // point and would otherwise re-render the (now frozen) club list.
          <div className="fm-screen fm-loading">
            <div className="fm-spinner" />
            <p className="fm-hint">{busy}</p>
          </div>
        ) : view === 'character' ? (
          <CharacterCustomizerScreen onSave={handleCharacterSave} onBack={handleCharacterBack} initialProfile={managerProfile || undefined} />
        ) : view === 'menu' ? (
          <MainMenuScreen saves={saves} onContinue={handleContinue} onNewGame={handleNewGame} onDelete={handleDelete} onCharacterCustomizer={handleCharacterCustomizerOpen} />
        ) : view === 'scenariopick' ? (
          <ScenarioPickScreen onPick={handlePickScenario} onSkip={handleSkipScenario} onBack={() => setView('menu')} />
        ) : view === 'nationselect' ? (
          <NationSelectScreen onPick={handlePickNation} onBack={() => setView('scenariopick')} />
        ) : view === 'clubselect' ? (
          <ClubSelectScreen data={data} divisions={selectedDivisions} scenarioId={selectedScenarioId} onPick={handlePickClub} onBack={() => setView('nationselect')} />
        ) : view === 'match' && gs && settings ? (
          <MatchScreen state={gs} settings={settings} onDone={handleMatchDone} />
        ) : view === 'seasonend' && gs && summary ? (
          <SeasonEndScreen
            state={gs}
            summary={summary}
            onContinue={() => setView('hub')}
            onAcceptJob={handleAcceptJob}
            onRetire={handleAbandon}
          />
        ) : view === 'daysummary' && gs ? (
          <DaySummaryScreen
            state={gs}
            stops={dayStops}
            digest={dayDigest}
            onOpenInbox={() => handleResolveStop('inbox')}
            onOpenTransfers={() => handleResolveStop('transfers')}
            onPrepareMatch={handlePrepareFromSummary}
            onContinue={handleContinueFromSummary}
          />
        ) : gs ? (
          <HubScreen
            state={gs}
            route={hubRoute}
            onRoute={setHubRoute}
            onChange={apply}
            onAbandon={handleAbandon}
            onSimulate={handleSimulate}
            simRunning={holding}
          />
        ) : (
          <MainMenuScreen saves={saves} onContinue={handleContinue} onNewGame={handleNewGame} onDelete={handleDelete} onCharacterCustomizer={handleCharacterCustomizerOpen} />
        )}
        </div>
      </main>

      {/* Bottom ad slot: filled by /shared/ads.js (loaded in layout.tsx, static
          export only) the same way every other BALLKNW page's `.ad-slot`
          divs are. In flow, hidden entirely during a live match — never
          repositioned to "fit" — so it can never overlap `.fm-matchx`'s own
          controls or intercept a tap meant for the pitch/menus. */}
      {view !== 'match' && (
        <div className="fm-bottom-ad ad-slot" id="gaffaBottomAd" data-ad-format="banner" aria-label="Advertisement" />
      )}

      {/* Persistent action dock (Touchline/Pocket layout): the in-game date
          and Next Event, reachable from every hub tab — not just Overview.
          Hub view only, and always in-flow (never position:fixed globally)
          so it can never land on top of `.fm-matchx`'s own bottom control
          bar during a live match.

          This isn't "advance one day" — it's "skip straight to whatever
          needs me": a player wants to speak to you, a training result worth
          seeing, a bid lands, matchday arrives. Quiet days in between are
          never shown one at a time; `runToNextEvent` ticks through them
          itself. A second click cancels a run in progress. Matches are
          never auto-played from here — matchday is always a stop the Day
          Summary hands off into, so a match can't be skipped past. */}
      {view === 'hub' && gs && (() => {
        const lineupOk = isLineupValid(gs, gs.userClubId, gs.lineup);
        const pending = dayStops.length > 0;
        return (
          <div className="fm-actiondock">
            <div className="fm-actiondock__date">
              <b>{formatGameDate(gs)}</b>
              <span>Week {Math.min(gs.week, SEASON_ROUNDS)}/{SEASON_ROUNDS} · {gs.seasonYear}/{(gs.seasonYear + 1) % 100}</span>
            </div>
            {!lineupOk && (
              <button
                type="button"
                className="fm-actiondock__pending"
                onClick={() => setHubRoute('tactics')}
                title="Lineup needs 11 fit players before your next match"
              >
                <Icon name="warning" size={13} /> Lineup
              </button>
            )}
            <span className="fm-actiondock__spacer" />
            {pending && (
              <button type="button" className="fm-actiondock__pending" onClick={() => setView('daysummary')}>
                <Icon name="warning" size={13} /> {dayStops.length} waiting
              </button>
            )}
            <button
              type="button"
              className="fm-actiondock__cta"
              onClick={() => handleSimulate()}
            >
              <Icon name={holding ? 'pause' : 'play'} size={15} />
              {' '}
              {pending ? 'Continue' : holding ? 'Stop — running…' : 'Next Event'}
            </button>
          </div>
        );
      })()}

      {showMore && (
        <MoreMenu
          state={gs}
          onSettings={() => { setShowMore(false); setShowSettings(true); }}
          onCustomize={() => { setShowMore(false); handleCharacterCustomizerOpen(); }}
          onAbandon={() => {
            if (window.confirm('Abandon this career? Your save will be deleted.')) {
              setShowMore(false);
              handleAbandon();
            }
          }}
          onClose={() => setShowMore(false)}
        />
      )}

      {showSettings && settings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

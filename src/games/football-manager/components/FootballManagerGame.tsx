'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameData, GameState, MatchReport, ScenarioId, SeasonSummary, GameSettings, ManagerProfile } from '@/engine/types';
import { endSeason, newGame, playRound, seasonOver, switchJob, nextUserFixture } from '@/engine/seasonProgression';
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
import MatchScreen from './match/MatchScreen';
import SeasonEndScreen from './SeasonEndScreen';
import SettingsPanel, { loadSettings } from './SettingsPanel';
import MoreMenu from './MoreMenu';
import CharacterCustomizerScreen from './CharacterCustomizerScreen';
import ManagerPickScreen from './ManagerPickScreen';
import { readableTextOn } from './visuals';
import { ToastHost, pushToast } from './ToastQueue';
import { Icon, IconSprite } from './Icon';
import type { ScreenId } from './hubNav';

type View = 'menu' | 'managerpick' | 'scenariopick' | 'nationselect' | 'clubselect' | 'hub' | 'match' | 'seasonend' | 'character';

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
  // True while the manager-pick/character screens are resolving the
  // mandatory choice at the start of a new career, so Save/Back from those
  // screens know to continue on into scenario pick rather than returning to
  // wherever they'd go for a mid-career "Customize Manager" edit.
  const [careerManagerFlow, setCareerManagerFlow] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | undefined>(undefined);
  // Progress label for the scenario fast-forward below. Non-null means a long
  // synchronous engine job is being run in yielded chunks; see `handlePickClub`.
  const [busy, setBusy] = useState<string | null>(null);

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
    setCareerManagerFlow(true);
    // A profile already on file gets a choice (continue with it or build a
    // new one); with nothing on file yet there's nothing to choose between,
    // so go straight to the customizer — creating one is mandatory either way.
    if (managerProfile) {
      setView('managerpick');
    } else {
      setCharacterReturn('scenariopick');
      setView('character');
    }
  };

  const handleManagerPickContinue = () => {
    setCareerManagerFlow(false);
    setView('scenariopick');
  };

  const handleManagerPickCreateNew = () => {
    setCharacterReturn('scenariopick');
    setView('character');
  };

  const handleManagerPickBack = () => {
    setCareerManagerFlow(false);
    setView('menu');
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

  const handleAcceptJob = (clubId: number) => {
    if (!gs) return;
    // Pass the offer through so the budget the season-end screen quoted is the
    // budget you actually get — a frugal chairman's kitty is not the league
    // baseline `switchJob` would otherwise fall back to.
    const offer = gs.jobOffers.find((o) => o.clubId === clubId);
    apply(switchJob(gs, clubId, offer));
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
    setCareerManagerFlow(false);
    setCharacterReturn(gs ? 'hub' : 'menu');
    setView('character');
  };

  const handleCharacterSave = (profile: ManagerProfile) => {
    setManagerProfile(profile);
    // Legacy key: still the source of truth before any career exists (the
    // main menu can open the customizer with no `gs` yet). Guarded the same
    // way as the read on mount — storage can be full or blocked (private
    // browsing) — so a throw here can't strand the player on this screen;
    // the profile still travels with the save slot below regardless.
    try {
      localStorage.setItem('managerProfile', JSON.stringify(profile));
    } catch {
      // ignore corrupt/blocked/full storage
    }
    // If a career is in progress, keep the profile travelling with the save
    // slot rather than only the device-wide key.
    if (gs) apply({ ...gs, managerProfile: profile });
    setCareerManagerFlow(false);
    setView(characterReturn);
  };

  const handleCharacterBack = () => {
    if (careerManagerFlow) {
      // Cancelling out of manager creation mid-new-career: if a profile was
      // already on file, land back on the pick screen so "continue with the
      // existing one" is still available instead of aborting the whole
      // new-career attempt; otherwise there's nothing to fall back to.
      setCareerManagerFlow(false);
      setView(managerProfile ? 'managerpick' : 'menu');
      return;
    }
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
        ) : view === 'managerpick' && managerProfile ? (
          <ManagerPickScreen
            profile={managerProfile}
            onContinue={handleManagerPickContinue}
            onCreateNew={handleManagerPickCreateNew}
            onBack={handleManagerPickBack}
          />
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
        ) : gs ? (
          <HubScreen
            state={gs}
            route={hubRoute}
            onRoute={setHubRoute}
            onChange={apply}
            onAbandon={handleAbandon}
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
          and the Play Week / Fix-lineup CTA, reachable from every hub tab —
          not just PortalHub. Hub view only, and always in-flow (never
          position:fixed globally) so it can never land on top of
          `.fm-matchx`'s own bottom control bar during a live match. */}
      {view === 'hub' && gs && (() => {
        const fixture = nextUserFixture(gs);
        const lineupOk = isLineupValid(gs, gs.userClubId, gs.lineup);
        return (
          <div className="fm-actiondock">
            <div className="fm-actiondock__date">
              <b>Week {Math.min(gs.week, SEASON_ROUNDS)}/{SEASON_ROUNDS}</b>
              <span>{gs.seasonYear}/{(gs.seasonYear + 1) % 100} season</span>
            </div>
            <span className="fm-actiondock__spacer" />
            {fixture ? (
              <button
                className={`fm-actiondock__cta${lineupOk ? '' : ' fm-actiondock__cta--warn'}`}
                onClick={lineupOk ? handlePlayMatch : () => setHubRoute('tactics')}
              >
                {lineupOk ? (
                  <>
                    <Icon name="play" size={15} /> Play Week {gs.week}
                  </>
                ) : (
                  <>
                    <Icon name="warning" size={15} /> Fix your lineup
                  </>
                )}
              </button>
            ) : (
              <span className="fm-hint" style={{ margin: 0 }}>No fixture this week</span>
            )}
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

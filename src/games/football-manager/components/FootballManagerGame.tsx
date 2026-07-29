'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameData, GameState, MatchReport, ScenarioId, SeasonSummary, GameSettings, ManagerProfile } from '@/engine/types';
import { endSeason, newGame, playRound, seasonOver, switchJob, nextUserFixture } from '@/engine/seasonProgression';
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
import CharacterCustomizerScreen from './CharacterCustomizerScreen';

type View = 'menu' | 'scenariopick' | 'nationselect' | 'clubselect' | 'hub' | 'match' | 'seasonend' | 'character';

export default function FootballManagerGame() {
  const [data, setData] = useState<GameData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Surfaced in the header: a failed write used to be swallowed, so a career
  // could silently stop persisting without the player ever being told.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gs, setGs] = useState<GameState | null>(null);
  const [slot, setSlot] = useState(0);
  const [view, setView] = useState<View>('menu');
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [saves, setSaves] = useState<(SaveMeta | null)[]>(Array(SAVE_SLOTS).fill(null));
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(['premier_league', 'championship', 'league_one', 'league_two']);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | undefined>(undefined);

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
      .catch((e: Error) => setSaveError(e.message));
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

  const handlePickClub = (clubId: number, managerName: string) => {
    if (!data) return;
    let state = newGame(data, clubId, managerName);
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
        let guard = 0;
        while (state.week < targetWeek && !seasonOver(state) && guard < 60) {
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

    apply(state);
    setView('hub');
  };

  const handleMatchDone = (report: MatchReport) => {
    if (!gs) return;
    const played = playRound(gs, report);
    if (seasonOver(played)) {
      const { state: next, summary: sum } = endSeason(played);
      apply(next);
      setSummary(sum);
      setView('seasonend');
    } else {
      apply(played);
      setView('hub');
    }
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

  const handleCharacterCustomizerOpen = () => {
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
    setView('menu');
  };

  const handleCharacterBack = () => {
    setView('menu');
  };

  return (
    <div className="fm-app">
      <header className="fm-header">
        <a
          className="fm-header__brand"
          href="https://ballknw.com"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <svg width="18" height="18" viewBox="0 0 512 512" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="fmBrandMark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2ab248" />
                <stop offset="100%" stopColor="#12b380" />
              </linearGradient>
            </defs>
            <rect x="20" y="20" width="472" height="472" rx="123" fill="url(#fmBrandMark)" />
            <text x="150" y="345" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fontSize="286" fill="#052411">
              B
            </text>
          </svg>
          BALLKNW
        </a>
        <span className="fm-header__title">Gaffa</span>
        <span className="fm-header__spacer" />
        <button className="fm-header__settings" onClick={() => setShowSettings(true)}>
          Settings
        </button>
      </header>
      <main className="fm-main">
        {loadError ? (
          <div className="fm-screen fm-error">
            <p className="fm-error-text">Could not load game data. Please refresh.</p>
          </div>
        ) : !data ? (
          <div className="fm-screen fm-loading">
            <div className="fm-spinner" />
            <p className="fm-hint">Loading player database…</p>
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
        ) : gs ? (
          <HubScreen state={gs} onChange={apply} onPlayMatch={handlePlayMatch} onAbandon={handleAbandon} />
        ) : (
          <MainMenuScreen saves={saves} onContinue={handleContinue} onNewGame={handleNewGame} onDelete={handleDelete} onCharacterCustomizer={handleCharacterCustomizerOpen} />
        )}
      </main>

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

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Division, GameData, GameState, MatchReport, SeasonSummary, GameSettings } from '@/engine/types';
import { endSeason, newGame, playRound, seasonOver, switchJob, nextUserFixture } from '@/engine/seasonProgression';
import { simulateTickMatch } from '@/engine/tickEngine/sim';
import { normalizeMentality } from '@/engine/tickEngine/tacticsData';
import { loadGameData } from '@/lib/gamedata';
import { clearSave, listSaves, loadGame, saveGame, SAVE_SLOTS, type SaveMeta } from '@/lib/storage';
import MainMenuScreen from './MainMenuScreen';
import NationSelectScreen from './NationSelectScreen';
import ClubSelectScreen from './ClubSelectScreen';
import HubScreen from './HubScreen';
import MatchScreen from './match/MatchScreen';
import SeasonEndScreen from './SeasonEndScreen';
import SettingsPanel, { loadSettings } from './SettingsPanel';
import { useScrollReset } from './useScrollReset';

type View = 'menu' | 'nationselect' | 'clubselect' | 'hub' | 'match' | 'seasonend';

export default function FootballManagerGame() {
  const [data, setData] = useState<GameData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gs, setGs] = useState<GameState | null>(null);
  const [slot, setSlot] = useState(0);
  const [view, setView] = useState<View>('menu');
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [saves, setSaves] = useState<(SaveMeta | null)[]>(Array(SAVE_SLOTS).fill(null));
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<Division[]>([1, 2, 3, 4]);
  // In landscape the shell is fixed and this element is the scroller, not the page.
  const mainRef = useRef<HTMLElement | null>(null);

  const fetchGameData = () => {
    loadGameData()
      .then(setData)
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(() => {
    fetchGameData();
    setSaves(listSaves());
    setSettings(loadSettings());
  }, []);

  const handleRetryLoad = () => {
    setLoadError(null);
    fetchGameData();
  };

  // Views are swapped in-place (no page navigation), so the browser keeps
  // whatever scroll position the previous view was left at — a user who
  // scrolled down the club list would land mid-page on the hub, with the
  // header and nav scrolled out of view. Reset on every view change.
  useScrollReset(mainRef, view);

  const apply = (next: GameState, toSlot = slot) => {
    setGs(next);
    saveGame(next, toSlot);
  };

  const handleContinue = (s: number) => {
    const save = loadGame(s);
    if (save) {
      setSlot(s);
      setGs(save);
      setView('hub');
    }
  };

  const handleNewGame = (s: number) => {
    setSlot(s);
    setView('nationselect');
  };

  const handlePickNation = (divisions: Division[]) => {
    setSelectedDivisions(divisions);
    setView('clubselect');
  };

  const handleDelete = (s: number) => {
    clearSave(s);
    setSaves(listSaves());
  };

  const handlePickClub = (clubId: number, managerName: string) => {
    if (!data) return;
    const state = newGame(data, clubId, managerName);
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
    clearSave(slot);
    backToMenu();
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

  return (
    <div className="fm-app">
      <header className="fm-header">
        <a
          className="fm-header__brand"
          href="https://www.ballknw.com"
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
      <main className="fm-main" ref={mainRef}>
        {loadError ? (
          <div className="fm-screen fm-error" role="alert">
            <p className="fm-error-text">Could not load game data. {loadError}</p>
            <button className="fm-header__settings" onClick={handleRetryLoad}>
              Retry
            </button>
          </div>
        ) : !data ? (
          <div className="fm-screen fm-loading" role="status" aria-live="polite">
            <div className="fm-spinner" aria-hidden="true" />
            <p className="fm-hint">Loading player database…</p>
          </div>
        ) : view === 'menu' ? (
          <MainMenuScreen saves={saves} onContinue={handleContinue} onNewGame={handleNewGame} onDelete={handleDelete} />
        ) : view === 'nationselect' ? (
          <NationSelectScreen onPick={handlePickNation} onBack={backToMenu} />
        ) : view === 'clubselect' ? (
          <ClubSelectScreen data={data} divisions={selectedDivisions} onPick={handlePickClub} onBack={() => setView('nationselect')} />
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
            onChange={apply}
            onPlayMatch={handlePlayMatch}
            onAbandon={handleAbandon}
            onOpenSettings={() => setShowSettings(true)}
            paneRef={mainRef}
          />
        ) : (
          <MainMenuScreen saves={saves} onContinue={handleContinue} onNewGame={handleNewGame} onDelete={handleDelete} />
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

'use client';

import { useEffect, useState } from 'react';
import type { GameData, GameState, MatchReport, SeasonSummary } from '@/engine/types';
import { endSeason, newGame, playRound, seasonOver, switchJob } from '@/engine/seasonProgression';
import { loadGameData } from '@/lib/gamedata';
import { clearSave, listSaves, loadGame, saveGame, SAVE_SLOTS, type SaveMeta } from '@/lib/storage';
import MainMenuScreen from './MainMenuScreen';
import ClubSelectScreen from './ClubSelectScreen';
import HubScreen from './HubScreen';
import MatchDayScreen from './MatchDayScreen';
import SeasonEndScreen from './SeasonEndScreen';

type View = 'menu' | 'clubselect' | 'hub' | 'match' | 'seasonend';

export default function FootballManagerGame() {
  const [data, setData] = useState<GameData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gs, setGs] = useState<GameState | null>(null);
  const [slot, setSlot] = useState(0);
  const [view, setView] = useState<View>('menu');
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [saves, setSaves] = useState<(SaveMeta | null)[]>(Array(SAVE_SLOTS).fill(null));

  useEffect(() => {
    loadGameData()
      .then(setData)
      .catch((e) => setLoadError(String(e)));
    setSaves(listSaves());
  }, []);

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

  return (
    <div className="fm-app">
      <header className="fm-header">
        <a className="fm-header__brand" href="https://ballknw.com">
          BALLKNW
        </a>
        <span className="fm-header__title">Gaffer</span>
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
        ) : view === 'menu' ? (
          <MainMenuScreen saves={saves} onContinue={handleContinue} onNewGame={handleNewGame} onDelete={handleDelete} />
        ) : view === 'clubselect' ? (
          <ClubSelectScreen data={data} onPick={handlePickClub} onBack={backToMenu} />
        ) : view === 'match' && gs ? (
          <MatchDayScreen state={gs} onDone={handleMatchDone} />
        ) : view === 'seasonend' && gs && summary ? (
          <SeasonEndScreen
            state={gs}
            summary={summary}
            onContinue={() => setView('hub')}
            onAcceptJob={handleAcceptJob}
            onRetire={handleAbandon}
          />
        ) : gs ? (
          <HubScreen state={gs} onChange={apply} onPlayMatch={() => setView('match')} onAbandon={handleAbandon} />
        ) : (
          <MainMenuScreen saves={saves} onContinue={handleContinue} onNewGame={handleNewGame} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}

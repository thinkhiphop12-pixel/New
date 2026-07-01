'use client';

import { useEffect, useState } from 'react';
import type { GameData, GameState, MatchReport, SeasonSummary } from '@/engine/types';
import { endSeason, newGame, playRound, seasonOver } from '@/engine/seasonProgression';
import { loadGameData } from '@/lib/gamedata';
import { clearSave, loadGame, saveGame } from '@/lib/storage';
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
  const [view, setView] = useState<View>('menu');
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [hasExistingSave, setHasExistingSave] = useState(false);

  useEffect(() => {
    loadGameData()
      .then(setData)
      .catch((e) => setLoadError(String(e)));
    setHasExistingSave(loadGame() !== null);
  }, []);

  const apply = (next: GameState) => {
    setGs(next);
    saveGame(next);
  };

  const handleContinue = () => {
    const save = loadGame();
    if (save) {
      setGs(save);
      setView(seasonOver(save) ? 'hub' : 'hub');
    }
  };

  const handleNewGame = () => setView('clubselect');

  const handlePickClub = (clubId: number) => {
    if (!data) return;
    const state = newGame(data, clubId);
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

  const handleAbandon = () => {
    clearSave();
    setGs(null);
    setHasExistingSave(false);
    setView('menu');
  };

  return (
    <div className="fm-app">
      <header className="fm-header">
        <a className="fm-header__brand" href="https://ballknw.com">
          BALLKNW
        </a>
        <span className="fm-header__title">Football Manager</span>
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
          <MainMenuScreen hasSave={hasExistingSave} onContinue={handleContinue} onNewGame={handleNewGame} />
        ) : view === 'clubselect' ? (
          <ClubSelectScreen data={data} onPick={handlePickClub} onBack={() => setView('menu')} />
        ) : view === 'match' && gs ? (
          <MatchDayScreen state={gs} onDone={handleMatchDone} />
        ) : view === 'seasonend' && gs && summary ? (
          <SeasonEndScreen state={gs} summary={summary} onContinue={() => setView('hub')} />
        ) : gs ? (
          <HubScreen state={gs} onChange={apply} onPlayMatch={() => setView('match')} onAbandon={handleAbandon} />
        ) : (
          <MainMenuScreen hasSave={hasExistingSave} onContinue={handleContinue} onNewGame={handleNewGame} />
        )}
      </main>
    </div>
  );
}

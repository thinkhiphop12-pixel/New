import { useCallback, useMemo, useState } from 'react';
import { DraftScreen } from './components/DraftScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ResultScreen } from './components/ResultScreen';
import { SimulatingScreen } from './components/SimulatingScreen';
import { StartScreen } from './components/StartScreen';
import { createDraftState, markSquadSeen, pickPlayer, rerollSquad, spinForSquad } from './engine/draft';
import { buildRun, simulateRun } from './engine/simulate';
import type { DraftState, Player, Run } from './engine/types';
import { useRunHistory } from './hooks/useRunHistory';
import { useSquads } from './hooks/useSquads';

type Screen = 'start' | 'draft' | 'simulating' | 'result' | 'history';

export default function App() {
  const { squads, loading, error } = useSquads();
  const { runs, addRun, reset } = useRunHistory();

  const [screen, setScreen] = useState<Screen>('start');
  const [draft, setDraft] = useState<DraftState>(createDraftState);
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [viewingFromHistory, setViewingFromHistory] = useState(false);

  const hasHistory = runs.length > 0;

  const startDraft = useCallback(() => {
    setDraft(createDraftState());
    setScreen('draft');
  }, []);

  const handleSpin = useCallback(() => {
    setDraft((prev) => markSquadSeen(prev, spinForSquad(prev, squads)));
  }, [squads]);

  const handleReroll = useCallback(() => {
    setDraft((prev) => rerollSquad(prev, squads));
  }, [squads]);

  const handlePick = useCallback((player: Player) => {
    setDraft((prev) => (prev.currentSquad ? pickPlayer(prev, player, prev.currentSquad) : prev));
  }, []);

  const startSimulation = useCallback(() => {
    setScreen('simulating');
    window.setTimeout(() => {
      const usedSquadIds = new Set(draft.picks.map((p) => p.squadId));
      const teamStrength = Math.round(
        draft.picks.reduce((sum, p) => sum + p.player.rating, 0) / draft.picks.length
      );
      const sim = simulateRun(teamStrength, squads, usedSquadIds);
      const run = buildRun(draft.picks, teamStrength, sim);
      addRun(run);
      setActiveRun(run);
      setViewingFromHistory(false);
      setScreen('result');
    }, 1400);
  }, [draft, squads, addRun]);

  const openHistory = useCallback(() => setScreen('history'), []);

  const selectHistoryRun = useCallback((run: Run) => {
    setActiveRun(run);
    setViewingFromHistory(true);
    setScreen('result');
  }, []);

  const backToStart = useCallback(() => setScreen('start'), []);
  const backToHistory = useCallback(() => setScreen('history'), []);

  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="pc-screen pc-loading">
          <div className="pc-spinner pc-spinner--large" />
          <p>Loading World Cup squads&hellip;</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="pc-screen pc-error">
          <p>Couldn&apos;t load squad data: {error}</p>
        </div>
      );
    }

    switch (screen) {
      case 'start':
        return (
          <StartScreen
            squadCount={squads.length}
            hasHistory={hasHistory}
            onStart={startDraft}
            onViewHistory={openHistory}
          />
        );
      case 'draft':
        return (
          <DraftScreen
            state={draft}
            onSpin={handleSpin}
            onReroll={handleReroll}
            onPick={handlePick}
            onContinue={startSimulation}
          />
        );
      case 'simulating':
        return <SimulatingScreen />;
      case 'result':
        return activeRun ? (
          <ResultScreen
            run={activeRun}
            fromHistory={viewingFromHistory}
            onPlayAgain={startDraft}
            onViewHistory={openHistory}
            onBack={backToHistory}
          />
        ) : null;
      case 'history':
        return (
          <HistoryScreen runs={runs} onSelect={selectHistoryRun} onClear={reset} onBack={backToStart} />
        );
      default:
        return null;
    }
  }, [
    loading,
    error,
    screen,
    squads.length,
    hasHistory,
    startDraft,
    openHistory,
    draft,
    handleSpin,
    handleReroll,
    handlePick,
    startSimulation,
    activeRun,
    viewingFromHistory,
    backToHistory,
    runs,
    selectHistoryRun,
    reset,
    backToStart,
  ]);

  return (
    <div className="pc-app">
      <header className="pc-header">
        <a className="pc-header__brand" href="/">
          BALLKNW
        </a>
        <span className="pc-header__title">Perfect Cup 8-0-0</span>
      </header>
      <main className="pc-main">{body}</main>
    </div>
  );
}

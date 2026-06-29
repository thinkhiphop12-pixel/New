'use client';

import { useCallback, useMemo, useState } from 'react';
import { DraftScreen } from './DraftScreen';
import { HistoryScreen } from './HistoryScreen';
import { ResultScreen } from './ResultScreen';
import { SimulatingScreen } from './SimulatingScreen';
import { StartScreen } from './StartScreen';
import {
  createDraftState,
  markSquadSeen,
  pickPlayer,
  spinForSquad,
  swapEdition,
  swapSquad,
} from '@/engine/draft';
import { buildRun, simulateRun } from '@/engine/simulate';
import { squadsForPool } from '@/engine/squads';
import type { DraftState, Objective, Player, Pool, RevealMode, Run } from '@/engine/types';
import { useRunHistory } from '@/hooks/useRunHistory';
import { useSquads } from '@/hooks/useSquads';

type Screen = 'start' | 'draft' | 'simulating' | 'result' | 'history';

const POOL_LABEL: Record<Pool, string> = {
  legends: 'Classic Legends',
  history: 'Full History',
  england: 'England',
};

export default function PerfectCupGame() {
  const { squads, loading, error } = useSquads();
  const { runs, mode, addRun, reset } = useRunHistory(squads);

  const [screen, setScreen] = useState<Screen>('start');
  const [pool, setPool] = useState<Pool>('legends');
  const [objective, setObjective] = useState<Objective>('perfect');
  const [revealMode, setRevealMode] = useState<RevealMode>('watch');
  const [draft, setDraft] = useState<DraftState>(() => createDraftState('legends'));
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [viewingFromHistory, setViewingFromHistory] = useState(false);

  const activePool = useMemo(() => squadsForPool(squads, pool), [squads, pool]);
  const counts = useMemo(
    () => ({
      history: squads.length,
      legends: squadsForPool(squads, 'legends').length,
      england: squadsForPool(squads, 'england').length,
    }),
    [squads]
  );

  const hasHistory = runs.length > 0;

  const startDraft = useCallback(() => {
    setDraft(createDraftState(pool));
    setScreen('draft');
  }, [pool]);

  const handleSpin = useCallback(() => {
    setDraft((prev) => markSquadSeen(prev, spinForSquad(prev, activePool)));
  }, [activePool]);

  const handleSwapEdition = useCallback(() => {
    setDraft((prev) => swapEdition(prev, activePool));
  }, [activePool]);

  const handleSwapSquad = useCallback(() => {
    setDraft((prev) => swapSquad(prev, activePool));
  }, [activePool]);

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
      const run = buildRun(draft.picks, teamStrength, sim, pool, objective);
      void addRun(run);
      setActiveRun(run);
      setViewingFromHistory(false);
      setScreen('result');
    }, 1100);
  }, [draft, squads, pool, objective, addRun]);

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
            pool={pool}
            objective={objective}
            revealMode={revealMode}
            historyCount={counts.history}
            legendsCount={counts.legends}
            englandCount={counts.england}
            hasHistory={hasHistory}
            onSetPool={setPool}
            onSetObjective={setObjective}
            onSetRevealMode={setRevealMode}
            onStart={startDraft}
            onViewHistory={openHistory}
          />
        );
      case 'draft':
        return (
          <DraftScreen
            state={draft}
            poolLabel={POOL_LABEL[draft.pool]}
            onSpin={handleSpin}
            onSwapEdition={handleSwapEdition}
            onSwapSquad={handleSwapSquad}
            onPick={handlePick}
            onContinue={startSimulation}
          />
        );
      case 'simulating':
        return <SimulatingScreen objective={objective} />;
      case 'result':
        return activeRun ? (
          <ResultScreen
            run={activeRun}
            fromHistory={viewingFromHistory}
            revealMode={revealMode}
            onPlayAgain={startDraft}
            onViewHistory={openHistory}
            onBack={backToHistory}
          />
        ) : null;
      case 'history':
        return (
          <HistoryScreen
            runs={runs}
            mode={mode}
            onSelect={selectHistoryRun}
            onClear={reset}
            onBack={backToStart}
          />
        );
      default:
        return null;
    }
  }, [
    loading,
    error,
    screen,
    pool,
    objective,
    revealMode,
    counts,
    hasHistory,
    startDraft,
    openHistory,
    draft,
    handleSpin,
    handleSwapEdition,
    handleSwapSquad,
    handlePick,
    startSimulation,
    activeRun,
    viewingFromHistory,
    backToHistory,
    runs,
    mode,
    selectHistoryRun,
    reset,
    backToStart,
  ]);

  return (
    <div className="pc-app">
      <header className="pc-header">
        <a className="pc-header__brand" href="/">
          DRAFT FANTASY
        </a>
        <span className="pc-header__title">Perfect Cup · 8-0</span>
      </header>
      <main className="pc-main">{body}</main>
    </div>
  );
}
